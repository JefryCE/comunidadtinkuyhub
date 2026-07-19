-- Cumplimiento con la política de Google Play de eliminación de cuenta/datos:
-- registra solicitudes de borrado enviadas desde /eliminar-cuenta por personas
-- que no tienen sesión iniciada (o no tienen la app instalada). El borrado de
-- cuentas con sesión iniciada se hace directo vía la Edge Function
-- delete-account (auth.admin.deleteUser), esta tabla es solo para el caso sin
-- sesión.

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text DEFAULT '',
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a deletion request" ON public.account_deletion_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins view deletion requests" ON public.account_deletion_requests
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update deletion requests" ON public.account_deletion_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
