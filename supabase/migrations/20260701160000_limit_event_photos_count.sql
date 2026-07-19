-- Trigger to limit the number of photos per event to 2
CREATE OR REPLACE FUNCTION public.check_max_event_photos()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.event_photos
    WHERE event_id = NEW.event_id
  ) >= 2 THEN
    RAISE EXCEPTION 'Solo se permiten hasta 2 fotos por evento.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_max_event_photos ON public.event_photos;

CREATE TRIGGER enforce_max_event_photos
  BEFORE INSERT ON public.event_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_event_photos();
