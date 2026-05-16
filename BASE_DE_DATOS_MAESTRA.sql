-- Limpieza inicial (por si acaso)
DROP TABLE IF EXISTS public.user_follows CASCADE;
DROP TABLE IF EXISTS public.earned_badges CASCADE;
DROP TABLE IF EXISTS public.gamification_profiles CASCADE;
DROP TABLE IF EXISTS public.event_photos CASCADE;
DROP TABLE IF EXISTS public.event_feedback CASCADE;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.volunteer_surveys CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Tipo de rol
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Tabla de perfiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  bio text,
  account_type text DEFAULT 'persona_natural',
  organization_name text,
  organization_type text,
  legal_representative text,
  ruc text,
  country text,
  fiscal_district text,
  business_name text,
  business_sector text,
  fiscal_address text,
  phone text,
  linkedin text,
  facebook text,
  tiktok text,
  instagram text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Tabla de roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view roles" ON public.user_roles FOR SELECT USING (true);

-- Tabla de eventos
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  emoji text NOT NULL,
  color text NOT NULL,
  location text NOT NULL,
  date text NOT NULL,
  schedule text NOT NULL,
  requirements text NOT NULL,
  max_volunteers integer NOT NULL DEFAULT 99999,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision,
  longitude double precision,
  registration_open boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Auth create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators update events" ON public.events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators delete events" ON public.events FOR DELETE USING (auth.uid() = created_by);

-- Tabla de inscripciones a eventos
CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  attendance_status text NOT NULL DEFAULT 'pending',
  points_awarded boolean NOT NULL DEFAULT false,
  registered_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own registrations" ON public.event_registrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users register events" ON public.event_registrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own registrations" ON public.event_registrations FOR DELETE USING (auth.uid() = user_id);

-- user_follows (La del error)
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Follow others" ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Unfollow" ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);

-- Resto del ecosistema
CREATE TABLE public.gamification_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  events_completed integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_event_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View gamification" ON public.gamification_profiles FOR SELECT USING (true);
CREATE POLICY "Insert gamification" ON public.gamification_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update gamification" ON public.gamification_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.earned_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);
ALTER TABLE public.earned_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View badges" ON public.earned_badges FOR SELECT USING (true);
CREATE POLICY "Insert badges" ON public.earned_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.volunteer_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  current_situation text,
  volunteer_types text[] DEFAULT '{}',
  frequency text,
  preferred_district text,
  skills text[] DEFAULT '{}',
  wants_notifications boolean DEFAULT false,
  lead_interest text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.volunteer_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insert survey" ON public.volunteer_surveys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "View survey" ON public.volunteer_surveys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update survey" ON public.volunteer_surveys FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.event_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View feedback" ON public.event_feedback FOR SELECT USING (true);
CREATE POLICY "Insert feedback" ON public.event_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update feedback" ON public.event_feedback FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE public.event_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.event_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View photos" ON public.event_photos FOR SELECT USING (true);
CREATE POLICY "Insert photos" ON public.event_photos FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Delete photos" ON public.event_photos FOR DELETE USING (auth.uid() = uploaded_by);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gamification_profiles;
