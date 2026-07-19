-- Agregar columna whatsapp_group_link a la tabla de eventos
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS whatsapp_group_link text;
