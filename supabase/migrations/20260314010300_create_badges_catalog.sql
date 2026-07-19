-- Badges catalog table (defines all available badges and their requirements)
CREATE TABLE IF NOT EXISTS public.badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL DEFAULT 'from-primary/20 to-primary/5',
  requirement_type text NOT NULL,
  requirement_value integer NOT NULL,
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges"
  ON public.badges FOR SELECT USING (true);

-- Seed badge catalog
INSERT INTO public.badges (id, name, description, icon, color, requirement_type, requirement_value) VALUES
  -- Event-count badges
  ('first_event', 'Primer Paso', 'Completaste tu primer evento de voluntariado', '🎉', 'from-emerald-400/20 to-green-500/5', 'events_completed', 1),
  ('five_events', 'Comprometido', 'Participaste en 5 eventos', '💪', 'from-green-400/20 to-teal-500/5', 'events_completed', 5),
  ('ten_events', 'Voluntario Estrella', 'Participaste en 10 eventos', '⭐', 'from-teal-400/20 to-cyan-500/5', 'events_completed', 10),
  ('twenty_events', 'Héroe Comunitario', 'Participaste en 20 eventos', '🦸', 'from-cyan-400/20 to-blue-500/5', 'events_completed', 20),
  -- Eco badges
  ('eco_3', 'Amigo del Planeta', 'Completaste 3 eventos ecológicos (limpieza o reforestación)', '🌍', 'from-emerald-400/20 to-green-500/5', 'eco_events', 3),
  ('eco_5', 'Guardián del Planeta', 'Completaste 5 eventos ecológicos', '🌿', 'from-green-400/20 to-emerald-500/5', 'eco_events', 5),
  -- Education badges
  ('edu_1', 'Primera Enseñanza', 'Completaste tu primer evento educativo', '📖', 'from-amber-400/20 to-orange-500/5', 'education_events', 1),
  ('edu_3', 'Educador Voluntario', 'Completaste 3 eventos educativos', '🎓', 'from-orange-400/20 to-red-500/5', 'education_events', 3),
  -- Social badges
  ('social_3', 'Corazón Solidario', 'Completaste 3 eventos sociales o de salud', '❤️', 'from-rose-400/20 to-red-500/5', 'social_events', 3),
  -- Variety badge
  ('all_types_4', 'Multifacético', 'Participaste en 4 tipos distintos de eventos', '🌈', 'from-violet-400/20 to-purple-500/5', 'all_types', 4)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value;
