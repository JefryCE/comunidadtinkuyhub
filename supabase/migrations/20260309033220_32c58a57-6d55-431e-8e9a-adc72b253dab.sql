
CREATE TABLE public.volunteer_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_situation text,
  volunteer_types text[] DEFAULT '{}',
  frequency text,
  preferred_district text,
  skills text[] DEFAULT '{}',
  wants_notifications boolean DEFAULT false,
  lead_interest text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteer_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own survey"
  ON public.volunteer_surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own survey"
  ON public.volunteer_surveys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey"
  ON public.volunteer_surveys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
