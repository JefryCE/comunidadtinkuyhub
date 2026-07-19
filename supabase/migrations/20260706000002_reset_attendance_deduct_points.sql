-- 1. Agregar columna points_awarded_amount a la tabla event_registrations
ALTER TABLE public.event_registrations ADD COLUMN IF NOT EXISTS points_awarded_amount integer DEFAULT 0;

-- 2. Actualizar la función confirm_attendance_and_award para guardar los puntos otorgados
CREATE OR REPLACE FUNCTION public.confirm_attendance_and_award(p_registration_id uuid, p_volunteer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    RAISE EXCEPTION 'La asistencia ya había sido confirmada.';
  END IF;

  -- 2. Ensure Gamification Profile exists
  INSERT INTO public.gamification_profiles (user_id)
  VALUES (p_volunteer_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Read current gamification stats
  SELECT events_completed, last_event_date, current_streak, longest_streak, total_points
  INTO v_events_completed, v_last_event, v_new_streak, v_longest_streak, v_total_points
  FROM public.gamification_profiles
  WHERE user_id = p_volunteer_id FOR UPDATE;

  -- 3. Calculate Points
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

  -- 4. Update Registration with the exact points earned
  UPDATE public.event_registrations
  SET 
    attendance_status = 'confirmed', 
    points_awarded = true,
    points_awarded_amount = v_points_earned
  WHERE id = p_registration_id;

  -- 5. Update Gamification Profile
  UPDATE public.gamification_profiles
  SET 
    total_points = v_total_points + v_points_earned,
    events_completed = v_events_completed + 1,
    current_streak = v_new_streak,
    longest_streak = v_longest_streak,
    last_event_date = CURRENT_DATE
  WHERE user_id = p_volunteer_id;
END;
$$;

-- 3. Crear función RPC para restablecer la asistencia y restar los puntos exactos que se otorgaron
CREATE OR REPLACE FUNCTION public.reset_attendance_and_deduct(p_registration_id uuid, p_volunteer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_awarded boolean;
  v_points_awarded_amount integer;
  v_total_points integer;
  v_events_completed integer;
BEGIN
  -- 1. Obtener la información del registro de asistencia
  SELECT points_awarded, points_awarded_amount INTO v_points_awarded, v_points_awarded_amount
  FROM public.event_registrations
  WHERE id = p_registration_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de asistencia no encontrado.';
  END IF;

  -- 2. Restablecer el estado en event_registrations
  UPDATE public.event_registrations
  SET 
    attendance_status = 'pending',
    points_awarded = false,
    points_awarded_amount = 0
  WHERE id = p_registration_id;

  -- 3. Si ya se habían otorgado puntos, restarlos exactamente del perfil
  IF v_points_awarded AND v_points_awarded_amount > 0 THEN
    SELECT total_points, events_completed INTO v_total_points, v_events_completed
    FROM public.gamification_profiles
    WHERE user_id = p_volunteer_id FOR UPDATE;

    IF FOUND THEN
      UPDATE public.gamification_profiles
      SET
        total_points = GREATEST(0, v_total_points - v_points_awarded_amount),
        events_completed = GREATEST(0, v_events_completed - 1),
        updated_at = now()
      WHERE user_id = p_volunteer_id;
    END IF;
  END IF;
END;
$$;
