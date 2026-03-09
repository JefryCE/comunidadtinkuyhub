
-- 1. Add registration_open to events
ALTER TABLE public.events ADD COLUMN registration_open boolean NOT NULL DEFAULT true;

-- 2. Allow event creators to UPDATE their own events
CREATE POLICY "Creators can update own events"
ON public.events
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- 3. Allow event creators to DELETE their own events
CREATE POLICY "Creators can delete own events"
ON public.events
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- 4. Create event_feedback table
CREATE TABLE public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can view feedback
CREATE POLICY "Anyone can view feedback"
ON public.event_feedback
FOR SELECT
TO authenticated
USING (true);

-- Users can insert own feedback
CREATE POLICY "Users can insert own feedback"
ON public.event_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update own feedback
CREATE POLICY "Users can update own feedback"
ON public.event_feedback
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Create event_photos table
CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  photo_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;

-- Anyone can view photos
CREATE POLICY "Anyone can view event photos"
ON public.event_photos
FOR SELECT
TO authenticated
USING (true);

-- Event creator can insert photos
CREATE POLICY "Creator can upload photos"
ON public.event_photos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- Event creator can delete photos
CREATE POLICY "Uploader can delete photos"
ON public.event_photos
FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);

-- 6. Create storage bucket for event photos
INSERT INTO storage.buckets (id, name, public) VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event-photos bucket
CREATE POLICY "Authenticated users can upload event photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-photos');

CREATE POLICY "Anyone can view event photos storage"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'event-photos');

CREATE POLICY "Users can delete own event photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'event-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
