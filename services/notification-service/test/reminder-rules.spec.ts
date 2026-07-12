import {
  goalReachedMessage,
  hydrationDue,
  isGoalReached,
  mealReminder,
  supplementReminder,
  WAKE_END_MIN,
  WAKE_START_MIN,
} from "../src/modules/notifications/reminder-rules";

describe("hydrationDue", () => {
  it("fires on interval multiples inside the waking window", () => {
    expect(hydrationDue(WAKE_START_MIN, 120)).toBe(true); // 08:00
    expect(hydrationDue(WAKE_START_MIN + 120, 120)).toBe(true); // 10:00
    expect(hydrationDue(WAKE_START_MIN + 60, 120)).toBe(false); // 09:00
  });

  it("stays silent outside the waking window", () => {
    expect(hydrationDue(WAKE_START_MIN - 1, 120)).toBe(false);
    expect(hydrationDue(WAKE_END_MIN + 1, 120)).toBe(false);
    expect(hydrationDue(0, 120)).toBe(false); // midnight
  });

  it("a non-positive interval never fires", () => {
    expect(hydrationDue(WAKE_START_MIN, 0)).toBe(false);
    expect(hydrationDue(WAKE_START_MIN, -60)).toBe(false);
  });
});

describe("isGoalReached", () => {
  it("lose: reached at or below the target", () => {
    expect(isGoalReached("lose", 75, 74.5)).toBe(true);
    expect(isGoalReached("lose", 75, 75)).toBe(true);
    expect(isGoalReached("lose", 75, 75.5)).toBe(false);
  });

  it("gain: reached at or above the target", () => {
    expect(isGoalReached("gain", 85, 85.2)).toBe(true);
    expect(isGoalReached("gain", 85, 84.8)).toBe(false);
  });

  it("maintain/recomp/no-target never alert", () => {
    expect(isGoalReached("maintain", 75, 70)).toBe(false);
    expect(isGoalReached("recomp", 75, 70)).toBe(false);
    expect(isGoalReached("lose", null, 70)).toBe(false);
  });
});

describe("dedupe keys", () => {
  it("one slot per day per reminder type", () => {
    const a = mealReminder("2026-07-12", "08:00");
    const b = mealReminder("2026-07-12", "12:30");
    const c = mealReminder("2026-07-13", "08:00");
    expect(a.dedupe_key).not.toBe(b.dedupe_key);
    expect(a.dedupe_key).not.toBe(c.dedupe_key);
  });

  it("supplement keys are per supplement", () => {
    const a = supplementReminder("2026-07-12", "08:00", "Créatine", "id-1");
    const b = supplementReminder("2026-07-12", "08:00", "Oméga 3", "id-2");
    expect(a.dedupe_key).not.toBe(b.dedupe_key);
  });

  it("goal alerts fire once per target weight", () => {
    expect(goalReachedMessage(75).dedupe_key).toBe(
      goalReachedMessage(75).dedupe_key,
    );
    expect(goalReachedMessage(75).dedupe_key).not.toBe(
      goalReachedMessage(73).dedupe_key,
    );
  });
});
