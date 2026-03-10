CREATE POLICY "Public can view profiles"
ON public.profiles
FOR SELECT
TO public
USING (true);