import {
  buildDailyContext,
  buildWeeklyContext,
  type CoachFacts,
  type WeeklyFacts,
} from "../src/modules/coach/coach-facts";
import { MockCoachProvider } from "../src/modules/coach/provider/mock-coach.provider";

const NO_PLATEAU = {
  plateau: false,
  change_pct: null,
  span_days: 0,
  points: 0,
};

const FACTS: CoachFacts = {
  date: "2026-07-12",
  goal: "lose",
  targets: {
    calories_kcal: 2100,
    protein_g: 160,
    carbs_g: 200,
    fat_g: 58,
    water_ml: 3300,
  },
  today: { kcal: 1400, protein_g: 90, carbs_g: 140, fat_g: 40, water_ml: 1500 },
  weight_kg: 80,
  plateau: { plateau: true, change_pct: 0.1, span_days: 16, points: 5 },
  workouts_7d: 3,
};

describe("buildDailyContext", () => {
  it("includes targets, consumption, remainder, and the plateau flag", () => {
    const ctx = buildDailyContext(FACTS);
    expect(ctx).toContain("perte de poids");
    expect(ctx).toContain("2100 kcal");
    expect(ctx).toContain("1400 kcal");
    expect(ctx).toContain("Reste : 700 kcal");
    expect(ctx).toContain("Plateau détecté");
    expect(ctx).toContain("Séances (7 derniers jours) : 3");
  });

  it("degrades without a profile", () => {
    const ctx = buildDailyContext({
      ...FACTS,
      goal: null,
      targets: null,
      weight_kg: null,
      plateau: NO_PLATEAU,
    });
    expect(ctx).toContain("Profil non renseigné");
    expect(ctx).not.toContain("Reste :");
  });
});

describe("buildWeeklyContext", () => {
  const WEEK: WeeklyFacts = {
    week_start: "2026-07-06",
    week_end: "2026-07-12",
    days_logged: 5,
    avg_kcal: 2050,
    avg_protein_g: 150.5,
    target_kcal: 2100,
    target_protein_g: 160,
    workouts: 3,
    total_volume_kg: 5400,
    avg_water_ml: 2400,
    weight_delta_kg: -0.4,
    plateau: NO_PLATEAU,
    goal: "lose",
  };

  it("summarises the week's numbers", () => {
    const ctx = buildWeeklyContext(WEEK);
    expect(ctx).toContain("2026-07-06");
    expect(ctx).toContain("5/7");
    expect(ctx).toContain("2050 kcal/j");
    expect(ctx).toContain("volume total 5400 kg");
    expect(ctx).toContain("-0.4 kg");
  });
});

describe("MockCoachProvider (deterministic)", () => {
  const mock = new MockCoachProvider();

  it("daily advice embeds the remaining kcal and the plateau hint", async () => {
    const text = await mock.generate({
      kind: "daily_advice",
      system: "",
      messages: [],
      facts: { remaining_kcal: 700, remaining_protein_g: 70, plateau: true },
    });
    expect(text).toContain("700 kcal");
    expect(text).toContain("70 g");
    expect(text).toContain("Plateau");
  });

  it("chat echoes the last user message", async () => {
    const text = await mock.generate({
      kind: "chat",
      system: "",
      messages: [{ role: "user", content: "Que manger ce soir ?" }],
      facts: {},
    });
    expect(text).toContain("Que manger ce soir ?");
  });

  it("weekly report embeds the averages", async () => {
    const text = await mock.generate({
      kind: "weekly_report",
      system: "",
      messages: [],
      facts: { avg_kcal: 2050, workouts: 3 },
    });
    expect(text).toContain("2050 kcal");
    expect(text).toContain("3 séance(s)");
  });
});
