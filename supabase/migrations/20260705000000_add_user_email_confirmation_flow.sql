-- 1. Agregar la columna email_confirmed a la tabla de perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_confirmed boolean DEFAULT false;

-- 2. Sincronizar el estado de confirmación actual para los usuarios existentes
UPDATE public.profiles p
SET email_confirmed = (u.email_confirmed_at IS NOT NULL)
FROM auth.users u
WHERE p.id = u.id;

-- 3. Crear función RPC segura para que los moderadores/admins puedan confirmar correos
CREATE OR REPLACE FUNCTION public.confirm_user_email(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar si el usuario que ejecuta la función es admin o moderador
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
  ) THEN
    -- Confirmar el correo electrónico en la tabla de auth
    UPDATE auth.users
    SET email_confirmed_at = now()
    WHERE id = p_user_id;
    
    -- Sincronizar el estado en public.profiles
    UPDATE public.profiles
    SET email_confirmed = true
    WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'No autorizado para realizar esta acción.';
  END IF;
END;
$$;

-- 4. Crear un trigger en auth.users para mantener sincronizados los futuros cambios
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email_confirmed = (NEW.email_confirmed_at IS NOT NULL)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed_change ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed_change
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_confirmed_change();
