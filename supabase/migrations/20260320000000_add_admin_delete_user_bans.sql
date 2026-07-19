
-- ==========================================================
-- Migration: Admin-only event deletion + user_bans table
-- ==========================================================

-- Ensure the has_role function exists
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- 1. Drop old moderator deletion policy (moderator can only delete own events now)
DROP POLICY IF EXISTS "Moderators can delete any event" ON public.events;
DROP POLICY IF EXISTS "Admins can delete any event" ON public.events;

-- 2. Admin-only deletion policy
CREATE POLICY "Admins can delete any event"
ON public.events
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Create user_bans table
CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT '',
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Drop existing bans policies if they exist to prevent duplicate policy errors
DROP POLICY IF EXISTS "Admins can view all bans" ON public.user_bans;
DROP POLICY IF EXISTS "Admins can ban users" ON public.user_bans;
DROP POLICY IF EXISTS "Admins can unban users" ON public.user_bans;
DROP POLICY IF EXISTS "Users can view own ban" ON public.user_bans;

-- Admins can read all bans
CREATE POLICY "Admins can view all bans"
ON public.user_bans
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can insert bans
CREATE POLICY "Admins can ban users"
ON public.user_bans
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins can delete bans (unban)
CREATE POLICY "Admins can unban users"
ON public.user_bans
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can see their own ban status
CREATE POLICY "Users can view own ban"
ON public.user_bans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4. Prevent banned users from creating events
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = auth.uid())
);

-- 5. Prevent banned users from registering for events
DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users can register for events"
ON public.event_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (SELECT 1 FROM public.user_bans WHERE user_id = auth.uid())
);
