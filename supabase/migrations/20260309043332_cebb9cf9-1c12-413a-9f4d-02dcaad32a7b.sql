
-- Add attendance_status column to event_registrations
ALTER TABLE public.event_registrations 
ADD COLUMN attendance_status text NOT NULL DEFAULT 'pending';

-- Add points_awarded to track if points were already given
ALTER TABLE public.event_registrations 
ADD COLUMN points_awarded boolean NOT NULL DEFAULT false;

-- Allow event creators to update attendance_status of registrations for their events
CREATE OR REPLACE FUNCTION public.is_event_creator(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE id = _event_id AND created_by = _user_id
  )
$$;

-- Policy: event creators can update registrations for their events
CREATE POLICY "Event creators can update registrations"
ON public.event_registrations
FOR UPDATE
TO authenticated
USING (public.is_event_creator(auth.uid(), event_id));

-- Policy: event creators can view registrations for their events
CREATE POLICY "Event creators can view event registrations"
ON public.event_registrations
FOR SELECT
TO authenticated
USING (public.is_event_creator(auth.uid(), event_id));
