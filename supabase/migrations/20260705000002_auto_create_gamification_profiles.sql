-- 1. Crear perfiles de gamificación para todos los perfiles actuales que no tengan uno
INSERT INTO public.gamification_profiles (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 2. Crear una función y trigger para que en el futuro se creen automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_profile_created_create_gamification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.gamification_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_create_gamification ON public.profiles;
CREATE TRIGGER on_profile_created_create_gamification
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_created_create_gamification();
