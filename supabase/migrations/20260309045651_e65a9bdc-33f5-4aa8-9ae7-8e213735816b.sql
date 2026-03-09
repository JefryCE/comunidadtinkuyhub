-- Ensure update policy validates both existing and new row ownership
DROP POLICY IF EXISTS "Creators can update own events" ON public.events;
CREATE POLICY "Creators can update own events"
ON public.events
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Ensure insert requires creator ownership (prevents future NULL created_by)
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Backfill legacy events where created_by is NULL using first registrant as owner
UPDATE public.events e
SET created_by = (
  SELECT er.user_id
  FROM public.event_registrations er
  WHERE er.event_id = e.id
  ORDER BY er.registered_at ASC
  LIMIT 1
)
WHERE e.created_by IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.event_registrations er2
    WHERE er2.event_id = e.id
  );