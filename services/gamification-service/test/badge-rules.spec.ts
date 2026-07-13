import {
  BADGE_CATALOGUE,
  badgeTitle,
  newlyEarnedBadges,
  STREAK_MILESTONES,
} from "../src/modules/gamification/badge-rules";

const state = (current: number, total: number) => ({
  current_len: current,
  best_len: current,
  last_day: "2026-07-12",
  events_total: total,
});

describe("badge catalogue (D11)", () => {
  it("has first + milestone badges for each of the 4 kinds", () => {
    expect(BADGE_CATALOGUE).toHaveLength(4 * (1 + STREAK_MILESTONES.length));
    const codes = BADGE_CATALOGUE.map((b) => b.code);
    expect(new Set(codes).size).toBe(codes.length); // unique
  });

  it("titles resolve; unknown codes fall back to the code", () => {
    expect(badgeTitle("first_journal")).toBe("Premier repas consigné");
    expect(badgeTitle("journal_streak_7")).toContain("7 jours");
    expect(badgeTitle("nope")).toBe("nope");
  });
});

describe("newlyEarnedBadges", () => {
  it("the very first event earns the first_* badge", () => {
    expect(newlyEarnedBadges("hydration", state(1, 1), new Set())).toEqual([
      "first_hydration",
      // no milestone yet: 1 < 3
    ]);
  });

  it("hitting a milestone earns exactly that milestone", () => {
    const earned = newlyEarnedBadges(
      "workout",
      state(3, 3),
      new Set(["first_workout"]),
    );
    expect(earned).toEqual(["workout_streak_3"]);
  });

  it("a long chain earns every milestone it crossed at once", () => {
    const earned = newlyEarnedBadges("journal", state(30, 40), new Set());
    expect(earned).toEqual([
      "first_journal",
      "journal_streak_3",
      "journal_streak_7",
      "journal_streak_30",
    ]);
  });

  it("is idempotent: already-held badges never re-earn", () => {
    const all = new Set(newlyEarnedBadges("journal", state(30, 40), new Set()));
    expect(newlyEarnedBadges("journal", state(30, 41), all)).toEqual([]);
  });

  it("a broken streak keeps its badges (monotonic awards)", () => {
    const held = new Set(["first_supplement", "supplement_streak_3"]);
    // Chain reset to 1 after a gap — nothing new, nothing lost.
    expect(newlyEarnedBadges("supplement", state(1, 10), held)).toEqual([]);
  });
});
