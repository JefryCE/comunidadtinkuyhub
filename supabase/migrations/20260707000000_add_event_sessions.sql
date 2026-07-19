-- Agregar columna is_multiday a la tabla de eventos
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_multiday boolean NOT NULL DEFAULT false;

-- Crear tabla de sesiones de eventos
CREATE TABLE IF NOT EXISTS public.event_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  title text,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  session_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Anyone can view event sessions"
  ON public.event_sessions FOR SELECT USING (true);

CREATE POLICY "Creators can insert event sessions"
  ON public.event_sessions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND created_by = auth.uid()
  ));

CREATE POLICY "Creators can update event sessions"
  ON public.event_sessions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND created_by = auth.uid()
  ));

CREATE POLICY "Creators can delete event sessions"
  ON public.event_sessions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events 
    WHERE id = event_id AND created_by = auth.uid()
  ));
