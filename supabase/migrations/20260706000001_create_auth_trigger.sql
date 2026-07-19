-- 1. Función para manejar la creación automática de perfiles para nuevos usuarios (Email y Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_avatar_url text;
  v_account_type text;
  v_phone text;
BEGIN
  -- Extraer metadatos con fallbacks para Google OAuth
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  v_account_type := COALESCE(
    NEW.raw_user_meta_data->>'account_type',
    'persona_natural'
  );
  v_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.phone
  );

  -- Insertar o actualizar el perfil público
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    email,
    phone,
    account_type,
    organization_name,
    organization_type,
    legal_representative,
    ruc,
    country,
    fiscal_district,
    business_name,
    business_sector,
    fiscal_address,
    email_confirmed
  ) VALUES (
    NEW.id,
    v_full_name,
    v_avatar_url,
    NEW.email,
    v_phone,
    v_account_type,
    NEW.raw_user_meta_data->>'organization_name',
    NEW.raw_user_meta_data->>'organization_type',
    NEW.raw_user_meta_data->>'legal_representative',
    NEW.raw_user_meta_data->>'ruc',
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'fiscal_district',
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'business_sector',
    NEW.raw_user_meta_data->>'fiscal_address',
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    email = EXCLUDED.email,
    phone = COALESCE(profiles.phone, EXCLUDED.phone),
    email_confirmed = EXCLUDED.email_confirmed;

  -- Crear perfil de gamificación automáticamente
  INSERT INTO public.gamification_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2. Crear el trigger en la tabla auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
