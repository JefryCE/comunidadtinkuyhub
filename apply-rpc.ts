import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace with local env vars loader if needed, but let's just parse .env
const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createRPCs() {
  const sql = `
CREATE OR REPLACE FUNCTION confirm_attendance_and_award(p_registration_id uuid, p_volunteer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_awarded boolean;
  v_events_completed integer;
  v_points_earned integer := 50; -- EVENT_JOIN
  v_new_streak integer := 1;
  v_last_event date;
  v_longest_streak integer;
  v_total_points integer;
BEGIN
  -- 1. Lock and Check if already awarded
  SELECT points_awarded INTO v_points_awarded
  FROM public.event_registrations
  WHERE id = p_registration_id FOR UPDATE;

  IF v_points_awarded THEN
    RAISE EXCEPTION 'La asistencia ya habia sido confirmada.';
  END IF;

  -- 2. Update Registration
  UPDATE public.event_registrations
  SET attendance_status = 'confirmed', points_awarded = true
  WHERE id = p_registration_id;

  -- 3. Ensure Gamification Profile exists
  INSERT INTO public.gamification_profiles (user_id)
  VALUES (p_volunteer_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Read current gamification stats
  SELECT events_completed, last_event_date, current_streak, longest_streak, total_points
  INTO v_events_completed, v_last_event, v_new_streak, v_longest_streak, v_total_points
  FROM public.gamification_profiles
  WHERE user_id = p_volunteer_id FOR UPDATE;

  -- 4. Calculate Points
  IF v_events_completed = 0 THEN
    v_points_earned := v_points_earned + 100; -- FIRST_EVENT bonus
  END IF;

  -- Streak calc
  IF v_last_event IS NOT NULL AND (CURRENT_DATE - v_last_event) <= 7 THEN
    v_new_streak := v_new_streak + 1;
    v_points_earned := v_points_earned + 25; -- STREAK_BONUS
  ELSE
    v_new_streak := 1;
  END IF;

  IF v_new_streak > v_longest_streak THEN
    v_longest_streak := v_new_streak;
  END IF;

  -- 5. Update Gamification Profile
  UPDATE public.gamification_profiles
  SET 
    total_points = v_total_points + v_points_earned,
    events_completed = v_events_completed + 1,
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    last_event_date = CURRENT_DATE
  WHERE user_id = p_volunteer_id;

  -- Note: Badges will be evaluated in the frontend as doing it here requires passing JSON badge logic.
END;
$$;
  `;
  
  // Actually, we can't run pure SQL with anon key directly unless we have an endpoint.
  // Wait, I can just use a web endpoint or do it via supabase sql tool.
  console.log("SQL to execute:");
  console.log(sql);
}

createRPCs();
