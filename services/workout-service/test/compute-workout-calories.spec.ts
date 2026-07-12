import {
  computeWorkoutCalories,
  metForRpe,
} from "../src/modules/workouts/compute-workout-calories";

describe("metForRpe", () => {
  it("maps RPE bands to METs and defaults to moderate", () => {
    expect(metForRpe(null)).toBe(5.0);
    expect(metForRpe(undefined)).toBe(5.0);
    expect(metForRpe(1)).toBe(3.5);
    expect(metForRpe(4)).toBe(3.5);
    expect(metForRpe(5)).toBe(5.0);
    expect(metForRpe(7)).toBe(5.0);
    expect(metForRpe(8)).toBe(6.0);
    expect(metForRpe(10)).toBe(6.0);
  });
});

describe("computeWorkoutCalories", () => {
  // Reference: 80 kg, 60 min, moderate → 5 × 3.5 × 80 / 200 × 60 = 420 kcal.
  it("matches the textbook MET formula", () => {
    expect(computeWorkoutCalories(80, 60)).toBe(420);
  });

  it("scales with intensity via RPE", () => {
    const light = computeWorkoutCalories(80, 60, 3);
    const hard = computeWorkoutCalories(80, 60, 9);
    expect(light).toBe(294); // 3.5 MET
    expect(hard).toBe(504); // 6.0 MET
    expect(hard).toBeGreaterThan(light);
  });

  it("clamps absurd durations at both ends", () => {
    // Sub-minute sessions count as 1 minute, marathon glitches as 300.
    expect(computeWorkoutCalories(80, 0.2)).toBe(computeWorkoutCalories(80, 1));
    expect(computeWorkoutCalories(80, 100_000)).toBe(
      computeWorkoutCalories(80, 300),
    );
  });
});
