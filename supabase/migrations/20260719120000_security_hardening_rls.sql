-- =============================================================================
-- ENDURECIMIENTO DE SEGURIDAD (hallazgos "Alto" de la auditoría 2026-07)
--
-- 1. Las RPC de asistencia ahora validan QUIÉN las llama (antes cualquier
--    usuario autenticado podía otorgarse/quitarse puntos con IDs arbitrarios).
-- 2. Las insignias se otorgan solo del lado del servidor, recalculando la
--    elegibilidad real (antes el cliente podía insertarse cualquier insignia).
-- 3. Los puntos ya no se escriben desde el cliente: +30 por crear evento lo
--    otorga un trigger; el "reclamo" de puntos pendientes es una RPC que solo
--    opera sobre el usuario autenticado.
-- 4. events INSERT vuelve a exigir created_by = auth.uid() (evita publicar
--    eventos a nombre de otra persona).
-- 5. user_roles deja de ser legible sin sesión.
-- 6. Los visitantes anónimos ya no pueden leer columnas sensibles de profiles
--    (email, teléfono, RUC, dirección fiscal, representante legal).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Otorgamiento de insignias del lado del servidor
--    Recalcula la elegibilidad real desde la BD (mismo catálogo que
--    src/lib/gamification.ts) e inserta solo las que faltan.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.award_eligible_badges(p_user_id uuid)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_events integer := 0;
  v_points integer := 0;
  v_longest integer := 0;
  v_eco integer := 0;
  v_edu integer := 0;
  v_social integer := 0;
  v_types integer := 0;
  v_new text[] := '{}';
  v_id text;
BEGIN
  SELECT events_completed, total_points, GREATEST(current_streak, longest_streak)
  INTO v_events, v_points, v_longest
  FROM public.gamification_profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN v_new;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE e.type = 'eco'),
    COUNT(*) FILTER (WHERE e.type = 'edu'),
    COUNT(*) FILTER (WHERE e.type = 'social'),
    COUNT(DISTINCT e.type)
  INTO v_eco, v_edu, v_social, v_types
  FROM public.event_registrations r
  JOIN public.events e ON e.id = r.event_id
  WHERE r.user_id = p_user_id AND r.attendance_status = 'confirmed';

  FOR v_id IN
    SELECT b.id FROM (VALUES
      ('first_event',    v_events  >= 1),
      ('five_events',    v_events  >= 5),
      ('ten_events',     v_events  >= 10),
      ('twenty_events',  v_events  >= 20),
      ('eco_3',          v_eco     >= 3),
      ('eco_5',          v_eco     >= 5),
      ('edu_1',          v_edu     >= 1),
      ('edu_3',          v_edu     >= 3),
      ('social_3',       v_social  >= 3),
      ('all_types_4',    v_types   >= 4),
      ('streak_3',       v_longest >= 3),
      ('streak_8',       v_longest >= 8),
      ('points_500',     v_points  >= 500),
      ('points_1000',    v_points  >= 1000),
      ('level_guardian', v_points  >= 3000),
      ('level_legend',   v_points  >= 6000)
    ) AS b(id, eligible)
    WHERE b.eligible
      AND NOT EXISTS (
        SELECT 1 FROM public.earned_badges eb
        WHERE eb.user_id = p_user_id AND eb.badge_id = b.id
      )
  LOOP
    INSERT INTO public.earned_badges (user_id, badge_id)
    VALUES (p_user_id, v_id)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
    v_new := array_append(v_new, v_id);
  END LOOP;

  RETURN v_new;
END;
$$;

-- RPC de conveniencia: el cliente puede pedir "revisa MIS insignias" sin poder
-- tocar las de nadie más.
CREATE OR REPLACE FUNCTION public.award_my_badges()
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.award_eligible_badges(auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- 2. confirm_attendance_and_award: misma lógica de puntos, pero ahora valida
--    que quien llama sea el creador del evento (o admin/moderador) y otorga
--    insignias al final.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_attendance_and_award(p_registration_id uuid, p_volunteer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_reg_user uuid;
  v_points_awarded boolean;
  v_events_completed integer;
  v_points_earned integer := 50; -- EVENT_JOIN
  v_new_streak integer := 1;
  v_last_event date;
  v_longest_streak integer;
  v_total_points integer;
BEGIN
  SELECT event_id, user_id, points_awarded
  INTO v_event_id, v_reg_user, v_points_awarded
  FROM public.event_registrations
  WHERE id = p_registration_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de asistencia no encontrado.';
  END IF;

  -- Autorización: solo el creador del evento o un admin/moderador.
  IF NOT (
    public.is_event_creator(auth.uid(), v_event_id)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para confirmar asistencia en este evento.';
  END IF;

  -- Coherencia: el registro debe pertenecer al voluntario indicado.
  IF v_reg_user IS DISTINCT FROM p_volunteer_id THEN
    RAISE EXCEPTION 'El registro no corresponde al voluntario indicado.';
  END IF;

  IF v_points_awarded THEN
    RAISE EXCEPTION 'La asistencia ya había sido confirmada.';
  END IF;

  INSERT INTO public.gamification_profiles (user_id)
  VALUES (p_volunteer_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT events_completed, last_event_date, current_streak, longest_streak, total_points
  INTO v_events_completed, v_last_event, v_new_streak, v_longest_streak, v_total_points
  FROM public.gamification_profiles
  WHERE user_id = p_volunteer_id FOR UPDATE;

  IF v_events_completed = 0 THEN
    v_points_earned := v_points_earned + 100; -- FIRST_EVENT bonus
  END IF;

  IF v_last_event IS NOT NULL AND (CURRENT_DATE - v_last_event) <= 7 THEN
    v_new_streak := v_new_streak + 1;
    v_points_earned := v_points_earned + 25; -- STREAK_BONUS
  ELSE
    v_new_streak := 1;
  END IF;

  IF v_new_streak > v_longest_streak THEN
    v_longest_streak := v_new_streak;
  END IF;

  UPDATE public.event_registrations
  SET attendance_status = 'confirmed',
      points_awarded = true,
      points_awarded_amount = v_points_earned
  WHERE id = p_registration_id;

  UPDATE public.gamification_profiles
  SET total_points = v_total_points + v_points_earned,
      events_completed = v_events_completed + 1,
      current_streak = v_new_streak,
      longest_streak = v_longest_streak,
      last_event_date = CURRENT_DATE
  WHERE user_id = p_volunteer_id;

  PERFORM public.award_eligible_badges(p_volunteer_id);
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. reset_attendance_and_deduct: misma lógica, con la misma validación.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_attendance_and_deduct(p_registration_id uuid, p_volunteer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_reg_user uuid;
  v_points_awarded boolean;
  v_points_awarded_amount integer;
  v_total_points integer;
  v_events_completed integer;
BEGIN
  SELECT event_id, user_id, points_awarded, points_awarded_amount
  INTO v_event_id, v_reg_user, v_points_awarded, v_points_awarded_amount
  FROM public.event_registrations
  WHERE id = p_registration_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro de asistencia no encontrado.';
  END IF;

  IF NOT (
    public.is_event_creator(auth.uid(), v_event_id)
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para modificar la asistencia de este evento.';
  END IF;

  IF v_reg_user IS DISTINCT FROM p_volunteer_id THEN
    RAISE EXCEPTION 'El registro no corresponde al voluntario indicado.';
  END IF;

  UPDATE public.event_registrations
  SET attendance_status = 'pending',
      points_awarded = false,
      points_awarded_amount = 0
  WHERE id = p_registration_id;

  IF v_points_awarded AND v_points_awarded_amount > 0 THEN
    SELECT total_points, events_completed INTO v_total_points, v_events_completed
    FROM public.gamification_profiles
    WHERE user_id = p_volunteer_id FOR UPDATE;

    IF FOUND THEN
      UPDATE public.gamification_profiles
      SET total_points = GREATEST(0, v_total_points - v_points_awarded_amount),
          events_completed = GREATEST(0, v_events_completed - 1),
          updated_at = now()
      WHERE user_id = p_volunteer_id;
    END IF;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Reclamo de puntos pendientes, ahora server-side y solo sobre uno mismo.
--    Procesa registros YA confirmados por el organizador pero sin puntos
--    entregados (estado heredado de flujos antiguos). No permite confirmar
--    asistencia, solo cobrar lo ya confirmado.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_my_pending_points()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_reg RECORD;
  v_events_completed integer;
  v_last_event date;
  v_current_streak integer;
  v_longest_streak integer;
  v_total_points integer;
  v_points integer;
  v_total_awarded integer := 0;
  v_new_badges text[];
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  INSERT INTO public.gamification_profiles (user_id)
  VALUES (v_user)
  ON CONFLICT (user_id) DO NOTHING;

  FOR v_reg IN
    SELECT r.id
    FROM public.event_registrations r
    LEFT JOIN public.events e ON e.id = r.event_id
    WHERE r.user_id = v_user
      AND r.attendance_status = 'confirmed'
      AND r.points_awarded = false
    ORDER BY e.date NULLS LAST, r.registered_at
    FOR UPDATE OF r
  LOOP
    SELECT events_completed, last_event_date, current_streak, longest_streak, total_points
    INTO v_events_completed, v_last_event, v_current_streak, v_longest_streak, v_total_points
    FROM public.gamification_profiles
    WHERE user_id = v_user FOR UPDATE;

    v_points := 50; -- EVENT_JOIN
    IF v_events_completed = 0 THEN
      v_points := v_points + 100; -- FIRST_EVENT
    END IF;

    IF v_last_event IS NOT NULL AND (CURRENT_DATE - v_last_event) <= 7 THEN
      v_current_streak := v_current_streak + 1;
      v_points := v_points + 25; -- STREAK_BONUS
    ELSE
      v_current_streak := 1;
    END IF;

    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;

    UPDATE public.event_registrations
    SET points_awarded = true,
        points_awarded_amount = v_points
    WHERE id = v_reg.id;

    UPDATE public.gamification_profiles
    SET total_points = v_total_points + v_points,
        events_completed = v_events_completed + 1,
        current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_event_date = CURRENT_DATE
    WHERE user_id = v_user;

    v_total_awarded := v_total_awarded + v_points;
  END LOOP;

  v_new_badges := public.award_eligible_badges(v_user);

  RETURN jsonb_build_object('points', v_total_awarded, 'new_badges', to_jsonb(v_new_badges));
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Puntos por crear evento (+30): ahora los otorga un trigger, no el cliente.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_event_created_award_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.gamification_profiles (user_id, total_points)
    VALUES (NEW.created_by, 30)
    ON CONFLICT (user_id) DO UPDATE
      SET total_points = public.gamification_profiles.total_points + 30,
          updated_at = now();
    PERFORM public.award_eligible_badges(NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_created_award_points ON public.events;
CREATE TRIGGER on_event_created_award_points
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_created_award_points();

-- -----------------------------------------------------------------------------
-- 6. Políticas RLS endurecidas
-- -----------------------------------------------------------------------------

-- events: crear solo a nombre propio (y no estando baneado)
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Auth create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND NOT EXISTS (SELECT 1 FROM public.user_bans b WHERE b.user_id = auth.uid())
  );

-- gamification_profiles: solo lectura para clientes; escrituras únicamente vía
-- funciones SECURITY DEFINER (RPCs y triggers de arriba)
DROP POLICY IF EXISTS "Insert gamification" ON public.gamification_profiles;
DROP POLICY IF EXISTS "Update gamification" ON public.gamification_profiles;
DROP POLICY IF EXISTS "Users can insert own gamification profile" ON public.gamification_profiles;
DROP POLICY IF EXISTS "Users can update own gamification profile" ON public.gamification_profiles;

-- earned_badges: solo lectura para clientes; inserta el servidor
DROP POLICY IF EXISTS "Insert badges" ON public.earned_badges;
DROP POLICY IF EXISTS "Users can insert own badges" ON public.earned_badges;

-- user_roles: ya no legible sin sesión
DROP POLICY IF EXISTS "Anyone view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "User roles are viewable by everyone" ON public.user_roles;
CREATE POLICY "Authenticated can view roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (true);

-- event_registrations: el UPDATE del creador ahora también limita el estado
-- final (WITH CHECK) — el flujo normal usa las RPCs, esto es defensa extra
DROP POLICY IF EXISTS "Event creators can update registrations" ON public.event_registrations;
CREATE POLICY "Event creators can update registrations"
  ON public.event_registrations
  FOR UPDATE TO authenticated
  USING (public.is_event_creator(auth.uid(), event_id))
  WITH CHECK (public.is_event_creator(auth.uid(), event_id));

-- -----------------------------------------------------------------------------
-- 7. profiles: los visitantes sin sesión ya no pueden leer columnas sensibles.
--    (Los usuarios autenticados mantienen el comportamiento actual; separar
--    estos campos a una tabla privada queda como siguiente iteración.)
-- -----------------------------------------------------------------------------
REVOKE SELECT (email, phone, ruc, fiscal_address, fiscal_district, legal_representative)
  ON public.profiles FROM anon;
