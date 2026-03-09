
ALTER TABLE public.events ADD COLUMN created_by uuid REFERENCES auth.users(id) DEFAULT NULL;
