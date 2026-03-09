
-- Gamification profiles (aggregated stats per user)
CREATE TABLE public.gamification_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer NOT NULL DEFAULT 0,
  events_completed integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_event_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view gamification profiles"
  ON public.gamification_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own gamification profile"
  ON public.gamification_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification profile"
  ON public.gamification_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Earned badges
CREATE TABLE public.earned_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE public.earned_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view earned badges"
  ON public.earned_badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own badges"
  ON public.earned_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime for leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.gamification_profiles;
