-- Asegurar que existe la función is_event_creator (puede faltar si se usó BASE_DE_DATOS_MAESTRA.sql)
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

-- Política UPDATE faltante para que el creador del evento pueda confirmar asistencia
DROP POLICY IF EXISTS "Event creators can update registrations" ON public.event_registrations;
CREATE POLICY "Event creators can update registrations"
  ON public.event_registrations
  FOR UPDATE
  TO authenticated
  USING (public.is_event_creator(auth.uid(), event_id));

-- Política SELECT para que el creador vea las inscripciones (por si falta)
DROP POLICY IF EXISTS "Event creators can view event registrations" ON public.event_registrations;
CREATE POLICY "Event creators can view event registrations"
  ON public.event_registrations
  FOR SELECT
  TO authenticated
  USING (public.is_event_creator(auth.uid(), event_id));
