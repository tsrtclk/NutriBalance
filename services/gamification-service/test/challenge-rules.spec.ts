import {
  advanceChallenge,
  CHALLENGE_CATALOGUE,
  challengeByCode,
  challengeForWeek,
  mondayOf,
} from "../src/modules/gamification/challenge-rules";

describe("mondayOf", () => {
  it("maps every day of a week to its Monday (UTC)", () => {
    expect(mondayOf("2026-07-13")).toBe("2026-07-13"); // a Monday
    expect(mondayOf("2026-07-15")).toBe("2026-07-13"); // Wednesday
    expect(mondayOf("2026-07-19")).toBe("2026-07-13"); // Sunday
    expect(mondayOf("2026-07-20")).toBe("2026-07-20"); // next Monday
  });

  it("crosses month boundaries", () => {
    expect(mondayOf("2026-08-01")).toBe("2026-07-27"); // Saturday → July Monday
  });
});

describe("challengeForWeek (D12 — deterministic rotation)", () => {
  it("is stable for a given week", () => {
    expect(challengeForWeek("2026-07-13")).toBe(challengeForWeek("2026-07-13"));
  });

  it("cycles through the whole catalogue week over week", () => {
    const codes = ["2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03"].map(
      (w) => challengeForWeek(w).code,
    );
    expect(new Set(codes).size).toBe(CHALLENGE_CATALOGUE.length);
    expect(challengeForWeek("2026-08-10").code).toBe(codes[0]); // wraps
  });

  it("challengeByCode finds catalogue entries", () => {
    expect(challengeByCode("workouts_3")?.metric).toBe("count");
    expect(challengeByCode("nope")).toBeUndefined();
  });
});

describe("advanceChallenge", () => {
  const days = challengeByCode("journal_days_5")!;
  const count = challengeByCode("workouts_3")!;
  const fresh = { progress: 0, last_day: null };

  it("ignores events of another kind", () => {
    const r = advanceChallenge(days, fresh, "workout", "2026-07-13");
    expect(r.progress).toBe(0);
    expect(r.justCompleted).toBe(false);
  });

  it("days metric counts each UTC day once", () => {
    const one = advanceChallenge(days, fresh, "journal", "2026-07-13");
    expect(one.progress).toBe(1);
    const sameDay = advanceChallenge(days, one, "journal", "2026-07-13");
    expect(sameDay.progress).toBe(1);
    const nextDay = advanceChallenge(days, sameDay, "journal", "2026-07-14");
    expect(nextDay.progress).toBe(2);
  });

  it("count metric counts every event", () => {
    const one = advanceChallenge(count, fresh, "workout", "2026-07-13");
    const two = advanceChallenge(count, one, "workout", "2026-07-13");
    expect(two.progress).toBe(2);
  });

  it("justCompleted fires exactly on the crossing event", () => {
    let st: { progress: number; last_day: string | null } = fresh;
    const flags: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const r = advanceChallenge(count, st, "workout", "2026-07-13");
      flags.push(r.justCompleted);
      st = r;
    }
    expect(flags).toEqual([false, false, true, false]); // target = 3
  });
});
