import {
  suggestNextSession,
  type RecentWorkout,
} from "../src/modules/workouts/suggest-next-session";

const NOW = new Date("2026-07-12T10:00:00Z");

function workout(
  hoursAgo: number,
  splitDay: string | null,
  muscleGroups: string[],
): RecentWorkout {
  return {
    at: new Date(NOW.getTime() - hoursAgo * 3600 * 1000),
    splitDay,
    muscleGroups,
  };
}

describe("suggestNextSession", () => {
  it("first session ever → full body, nothing to avoid", () => {
    const s = suggestNextSession([], "intermediate", NOW);
    expect(s.suggested_focus).toBe("full_body");
    expect(s.avoid_muscle_groups).toEqual([]);
  });

  it("beginners always get full body", () => {
    const s = suggestNextSession(
      [workout(20, "push", ["chest", "triceps"])],
      "beginner",
      NOW,
    );
    expect(s.suggested_focus).toBe("full_body");
  });

  it("rotates push → pull → legs → push", () => {
    expect(
      suggestNextSession([workout(24, "push", ["chest"])], null, NOW)
        .suggested_focus,
    ).toBe("pull");
    expect(
      suggestNextSession([workout(24, "pull", ["back"])], null, NOW)
        .suggested_focus,
    ).toBe("legs");
    expect(
      suggestNextSession([workout(24, "legs", ["legs"])], null, NOW)
        .suggested_focus,
    ).toBe("push");
  });

  it("rotates upper ↔ lower when that split is in use", () => {
    expect(
      suggestNextSession([workout(24, "upper", ["chest", "back"])], null, NOW)
        .suggested_focus,
    ).toBe("lower");
    expect(
      suggestNextSession([workout(24, "lower", ["legs", "glutes"])], null, NOW)
        .suggested_focus,
    ).toBe("upper");
  });

  it("flags muscle groups trained within the 48h recovery window", () => {
    const s = suggestNextSession(
      [
        workout(12, "push", ["chest", "triceps", "shoulders"]),
        workout(72, "pull", ["back", "biceps"]), // outside the window
      ],
      "advanced",
      NOW,
    );
    expect(s.avoid_muscle_groups).toEqual(["chest", "shoulders", "triceps"]);
    expect(s.suggested_focus).toBe("pull");
  });

  it("rotates from the most recent session, not the array order", () => {
    const s = suggestNextSession(
      [
        workout(60, "push", ["chest"]),
        workout(12, "pull", ["back"]), // newest
      ],
      null,
      NOW,
    );
    expect(s.suggested_focus).toBe("legs");
  });

  it("starts the PPL cycle when history has no labelled split", () => {
    const s = suggestNextSession(
      [workout(24, null, ["full_body"])],
      "advanced",
      NOW,
    );
    expect(s.suggested_focus).toBe("push");
  });
});
