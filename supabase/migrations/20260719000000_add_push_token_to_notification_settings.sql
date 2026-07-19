-- Guarda el token de FCM (Firebase Cloud Messaging) del dispositivo Android para
-- poder enviar push notifications reales desde el backend (ver plan de app Android,
-- Fase 2). Se agrega sobre user_notification_settings porque ya es la tabla de
-- 1 fila por usuario para preferencias de notificación.

ALTER TABLE public.user_notification_settings
  ADD COLUMN IF NOT EXISTS fcm_token text,
  ADD COLUMN IF NOT EXISTS fcm_token_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_notification_settings_fcm_token
  ON public.user_notification_settings (fcm_token)
  WHERE fcm_token IS NOT NULL;
