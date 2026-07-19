-- Agregar columna offers_transport a la tabla de eventos
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS offers_transport boolean NOT NULL DEFAULT false;

-- Crear tabla de paradas de transporte
CREATE TABLE IF NOT EXISTS public.event_transport_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text NOT NULL,
  latitude double precision,
  longitude double precision,
  pickup_time text NOT NULL,
  stop_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.event_transport_stops ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Anyone can view transport stops"
  ON public.event_transport_stops FOR SELECT USING (true);

CREATE POLICY "Creators can insert transport stops"
  ON public.event_transport_stops FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND created_by = auth.uid()
  ));

CREATE POLICY "Creators can update transport stops"
  ON public.event_transport_stops FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND created_by = auth.uid()
  ));

CREATE POLICY "Creators can delete transport stops"
  ON public.event_transport_stops FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND created_by = auth.uid()
  ));

-- Agregar columna de parada seleccionada a las inscripciones de eventos
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS transport_stop_id uuid REFERENCES public.event_transport_stops(id) ON DELETE SET NULL;
