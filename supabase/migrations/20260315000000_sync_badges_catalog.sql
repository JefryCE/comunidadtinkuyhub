-- Sincronizar catálogo de medallas en la base de datos
INSERT INTO public.badges (id, name, description, icon, color, requirement_type, requirement_value) VALUES
  ('streak_3', 'En Racha', '3 semanas consecutivas participando', '🔥', 'from-amber-400/20 to-orange-500/5', 'streak', 3),
  ('streak_8', 'Imparable', '8 semanas consecutivas participando', '🚀', 'from-orange-400/20 to-red-500/5', 'streak', 8),
  ('points_500', 'Medio Millar', 'Alcanzaste 500 puntos', '🏅', 'from-yellow-400/20 to-amber-500/5', 'points', 500),
  ('points_1000', 'Club de los Mil', 'Alcanzaste 1000 puntos', '🏆', 'from-amber-400/20 to-yellow-500/5', 'points', 1000),
  ('level_guardian', 'Líder Guardián', 'Alcanzaste el nivel Guardián', '🛡️', 'from-blue-400/20 to-violet-500/5', 'points', 3000),
  ('level_legend', 'Leyenda Viviente', 'Alcanzaste el nivel Leyenda', '👑', 'from-violet-400/20 to-purple-500/5', 'points', 6000)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value;
