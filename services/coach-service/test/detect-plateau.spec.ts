import {
  detectPlateau,
  type WeightPoint,
} from "../src/modules/coach/detect-plateau";

const NOW = new Date("2026-07-12T00:00:00Z");

function series(days: number[], kgs: number[]): WeightPoint[] {
  return days.map((d, i) => ({
    date: new Date(NOW.getTime() - d * 24 * 3600 * 1000).toISOString(),
    kg: kgs[i],
  }));
}

describe("detectPlateau", () => {
  it("flags a flat curve on a lose goal (14+ days, 4+ points, <0.3%)", () => {
    const r = detectPlateau(
      series([20, 14, 7, 1], [80.0, 80.1, 79.95, 80.05]),
      "lose",
      NOW,
    );
    expect(r.plateau).toBe(true);
    expect(r.points).toBe(4);
    expect(r.span_days).toBeGreaterThanOrEqual(14);
  });

  it("a moving curve is not a plateau", () => {
    const r = detectPlateau(
      series([20, 14, 7, 1], [80.0, 79.2, 78.5, 77.9]),
      "lose",
      NOW,
    );
    expect(r.plateau).toBe(false);
    expect(r.change_pct).toBeLessThan(-0.3);
  });

  it("needs enough points", () => {
    const r = detectPlateau(series([15, 1], [80.0, 80.0]), "lose", NOW);
    expect(r.plateau).toBe(false);
    expect(r.change_pct).toBeNull();
  });

  it("needs enough span — 4 points in 5 days is not a plateau", () => {
    const r = detectPlateau(
      series([5, 4, 2, 1], [80.0, 80.0, 80.0, 80.0]),
      "lose",
      NOW,
    );
    expect(r.plateau).toBe(false);
    expect(r.span_days).toBeLessThan(14);
  });

  it("maintain and recomp goals never plateau (flat is the goal)", () => {
    const flat = series([20, 14, 7, 1], [80.0, 80.0, 80.0, 80.0]);
    expect(detectPlateau(flat, "maintain", NOW).plateau).toBe(false);
    expect(detectPlateau(flat, "recomp", NOW).plateau).toBe(false);
    expect(detectPlateau(flat, null, NOW).plateau).toBe(false);
  });

  it("ignores measurements outside the 21-day window", () => {
    // Big loss 40 days ago must not mask the recent flatness.
    const r = detectPlateau(
      series([40, 20, 14, 7, 1], [85.0, 80.0, 80.05, 79.98, 80.02]),
      "lose",
      NOW,
    );
    expect(r.plateau).toBe(true);
    expect(r.points).toBe(4);
  });

  it("flags a flat curve on a gain goal too", () => {
    const r = detectPlateau(
      series([18, 12, 6, 1], [70.0, 70.05, 69.95, 70.0]),
      "gain",
      NOW,
    );
    expect(r.plateau).toBe(true);
  });
});
