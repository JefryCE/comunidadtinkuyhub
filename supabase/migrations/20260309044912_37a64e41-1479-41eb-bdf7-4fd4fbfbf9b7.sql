
-- Drop all RESTRICTIVE policies on events and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Creators can update own events" ON public.events;
DROP POLICY IF EXISTS "Creators can delete own events" ON public.events;

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Creators can update own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Fix other tables with same issue
DROP POLICY IF EXISTS "Anyone can view earned badges" ON public.earned_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON public.earned_badges;
CREATE POLICY "Anyone can view earned badges" ON public.earned_badges FOR SELECT USING (true);
CREATE POLICY "Users can insert own badges" ON public.earned_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view feedback" ON public.event_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.event_feedback;
DROP POLICY IF EXISTS "Users can update own feedback" ON public.event_feedback;
CREATE POLICY "Anyone can view feedback" ON public.event_feedback FOR SELECT USING (true);
CREATE POLICY "Users can insert own feedback" ON public.event_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON public.event_feedback FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view event photos" ON public.event_photos;
DROP POLICY IF EXISTS "Creator can upload photos" ON public.event_photos;
DROP POLICY IF EXISTS "Uploader can delete photos" ON public.event_photos;
CREATE POLICY "Anyone can view event photos" ON public.event_photos FOR SELECT USING (true);
CREATE POLICY "Creator can upload photos" ON public.event_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Uploader can delete photos" ON public.event_photos FOR DELETE TO authenticated USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Event creators can update registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Event creators can view event registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can delete their own registrations" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
DROP POLICY IF EXISTS "Users can view their own registrations" ON public.event_registrations;
CREATE POLICY "Users can view their own registrations" ON public.event_registrations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Event creators can view event registrations" ON public.event_registrations FOR SELECT TO authenticated USING (is_event_creator(auth.uid(), event_id));
CREATE POLICY "Users can register for events" ON public.event_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Event creators can update registrations" ON public.event_registrations FOR UPDATE TO authenticated USING (is_event_creator(auth.uid(), event_id));
CREATE POLICY "Users can delete their own registrations" ON public.event_registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view gamification profiles" ON public.gamification_profiles;
DROP POLICY IF EXISTS "Users can insert own gamification profile" ON public.gamification_profiles;
DROP POLICY IF EXISTS "Users can update own gamification profile" ON public.gamification_profiles;
CREATE POLICY "Anyone can view gamification profiles" ON public.gamification_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own gamification profile" ON public.gamification_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gamification profile" ON public.gamification_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own survey" ON public.volunteer_surveys;
DROP POLICY IF EXISTS "Users can insert their own survey" ON public.volunteer_surveys;
DROP POLICY IF EXISTS "Users can update their own survey" ON public.volunteer_surveys;
CREATE POLICY "Users can view their own survey" ON public.volunteer_surveys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own survey" ON public.volunteer_surveys FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own survey" ON public.volunteer_surveys FOR UPDATE TO authenticated USING (auth.uid() = user_id);
