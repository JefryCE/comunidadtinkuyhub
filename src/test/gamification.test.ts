import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock del modulo de Supabase antes de importar nada que lo use
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Importar el cliente mockeado para poder espiar/manipular sus métodos
import { supabase } from "@/integrations/supabase/client";
import {
  parseToLocalDate,
  getMonday,
  awardPointsForJoin,
  POINTS,
} from "../lib/gamification";

describe("Gamification Utils", () => {
  describe("parseToLocalDate", () => {
    it("should parse YYYY-MM-DD format correctly", () => {
      const date = parseToLocalDate("2026-06-25");
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5); // June is 5 (0-indexed)
      expect(date.getDate()).toBe(25);
    });

    it("should parse Spanish format correctly", () => {
      const date = parseToLocalDate("25 de junio, 2026");
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(25);
    });

    it("should parse Date object correctly", () => {
      const input = new Date(2026, 5, 25);
      const date = parseToLocalDate(input);
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(5);
      expect(date.getDate()).toBe(25);
    });
  });

  describe("getMonday", () => {
    it("should return the Monday of the same week for mid-week days", () => {
      // Wednesday, June 24, 2026 -> Monday should be June 22, 2026
      const date = new Date(2026, 5, 24);
      const monday = getMonday(date);
      expect(monday.getFullYear()).toBe(2026);
      expect(monday.getMonth()).toBe(5);
      expect(monday.getDate()).toBe(22);
      expect(monday.getDay()).toBe(1); // Monday
    });

    it("should return the Monday of the same week for Sunday", () => {
      // Sunday, June 28, 2026 -> Monday should be June 22, 2026
      const date = new Date(2026, 5, 28);
      const monday = getMonday(date);
      expect(monday.getFullYear()).toBe(2026);
      expect(monday.getMonth()).toBe(5);
      expect(monday.getDate()).toBe(22);
      expect(monday.getDay()).toBe(1);
    });

    it("should return the same day for Monday", () => {
      // Monday, June 22, 2026 -> Monday should be June 22, 2026
      const date = new Date(2026, 5, 22);
      const monday = getMonday(date);
      expect(monday.getFullYear()).toBe(2026);
      expect(monday.getMonth()).toBe(5);
      expect(monday.getDate()).toBe(22);
      expect(monday.getDay()).toBe(1);
    });
  });
});

describe("awardPointsForJoin Streak Logic", () => {
  let profileMock: any;
  let registrationsMock: any[];
  let earnedBadgesMock: any[];

  beforeEach(() => {
    vi.clearAllMocks();

    profileMock = {
      user_id: "user-123",
      total_points: 0,
      events_completed: 0,
      current_streak: 0,
      longest_streak: 0,
      last_event_date: null,
    };

    registrationsMock = [];
    earnedBadgesMock = [];

    // Espiar e implementar las respuestas simuladas del cliente de Supabase
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      const builder: any = {};
      builder.select = vi.fn().mockReturnValue(builder);
      builder.update = vi.fn().mockReturnValue(builder);
      builder.insert = vi.fn().mockReturnValue(builder);
      builder.eq = vi.fn().mockReturnValue(builder);
      builder.maybeSingle = vi.fn();
      builder.single = vi.fn();

      // Implementar thenable para simular una Promesa que se resuelve al ser awaitada directamente
      builder.then = vi.fn().mockImplementation((onFulfilled) => {
        let result: any = { data: null, error: null };
        if (table === "gamification_profiles") {
          result = { data: profileMock, error: null };
        } else if (table === "event_registrations") {
          result = { data: registrationsMock, error: null };
        } else if (table === "earned_badges") {
          result = { data: earnedBadgesMock, error: null };
        }
        return Promise.resolve(onFulfilled(result));
      });

      // maybeSingle para gamification_profiles
      builder.maybeSingle.mockImplementation(() => {
        let result: any = { data: null, error: null };
        if (table === "gamification_profiles") {
          result = { data: profileMock, error: null };
        }
        return Promise.resolve(result);
      });

      // single para gamification_profiles (creación)
      builder.single.mockImplementation(() => {
        let result: any = { data: null, error: null };
        if (table === "gamification_profiles") {
          result = { data: profileMock, error: null };
        }
        return Promise.resolve(result);
      });

      builder.update.mockImplementation((updates: any) => {
        if (table === "gamification_profiles") {
          Object.assign(profileMock, updates);
        }
        return builder;
      });

      builder.insert.mockImplementation((rows: any[]) => {
        if (table === "earned_badges") {
          earnedBadgesMock.push(...rows);
        }
        return builder;
      });

      return builder;
    });
  });

  it("should award first event bonus on first join", async () => {
    const result = await awardPointsForJoin("user-123", "2026-06-01");

    expect(result.pointsEarned).toBe(POINTS.EVENT_JOIN + POINTS.FIRST_EVENT);
    expect(profileMock.events_completed).toBe(1);
    expect(profileMock.current_streak).toBe(1);
    expect(profileMock.longest_streak).toBe(1);
    expect(profileMock.last_event_date).toBe("2026-06-01");
  });

  it("should increase streak if events are in consecutive weeks", async () => {
    // 1. First event on Week 1 (Monday, June 1, 2026)
    await awardPointsForJoin("user-123", "2026-06-01");

    // 2. Second event on Week 2 (Monday, June 8, 2026)
    const result = await awardPointsForJoin("user-123", "2026-06-08");

    expect(result.pointsEarned).toBe(POINTS.EVENT_JOIN + POINTS.STREAK_BONUS);
    expect(profileMock.events_completed).toBe(2);
    expect(profileMock.current_streak).toBe(2);
    expect(profileMock.longest_streak).toBe(2);
    expect(profileMock.last_event_date).toBe("2026-06-08");
  });

  it("should NOT increase or reset streak if events are in the same week", async () => {
    // 1. First event on Monday, June 1, 2026
    await awardPointsForJoin("user-123", "2026-06-01");

    // 2. Second event on Wednesday, June 3, 2026 (Same Week)
    const result = await awardPointsForJoin("user-123", "2026-06-03");

    expect(result.pointsEarned).toBe(POINTS.EVENT_JOIN); // No streak bonus
    expect(profileMock.events_completed).toBe(2);
    expect(profileMock.current_streak).toBe(1); // Still 1
    expect(profileMock.longest_streak).toBe(1);
    expect(profileMock.last_event_date).toBe("2026-06-03");
  });

  it("should reset streak if there is a gap week between events", async () => {
    // 1. First event on Week 1 (Monday, June 1, 2026)
    await awardPointsForJoin("user-123", "2026-06-01");

    // 2. Second event on Week 2 (Monday, June 8, 2026) -> streak becomes 2
    await awardPointsForJoin("user-123", "2026-06-08");

    // 3. Third event on Week 4 (Monday, June 22, 2026) -> gap week 3 (June 15) is skipped!
    const result = await awardPointsForJoin("user-123", "2026-06-22");

    expect(result.pointsEarned).toBe(POINTS.EVENT_JOIN); // No streak bonus
    expect(profileMock.events_completed).toBe(3);
    expect(profileMock.current_streak).toBe(1); // Reset to 1
    expect(profileMock.longest_streak).toBe(2); // Longest streak preserved as 2
    expect(profileMock.last_event_date).toBe("2026-06-22");
  });

  it("should NOT corrupt streak or last_event_date if event is in the past compared to last_event_date", async () => {
    // 1. First event on Monday, June 8, 2026
    await awardPointsForJoin("user-123", "2026-06-08");

    // 2. Retroactive claim for event on Monday, June 1, 2026 (occurs before June 8)
    const result = await awardPointsForJoin("user-123", "2026-06-01");

    expect(result.pointsEarned).toBe(POINTS.EVENT_JOIN); // base points
    expect(profileMock.events_completed).toBe(2);
    expect(profileMock.current_streak).toBe(1);
    expect(profileMock.last_event_date).toBe("2026-06-08"); // Remains June 8, not set back to June 1!
  });
});
