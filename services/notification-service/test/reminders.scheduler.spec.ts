import { RemindersScheduler } from "../src/modules/scheduler/reminders.scheduler";
import type { PreferencesRepository } from "../src/modules/preferences/preferences.repository";
import type { NotificationsService } from "../src/modules/notifications/notifications.service";
import type { PreferencesResponseDto } from "../src/modules/preferences/dto/preferences-dtos";

const ALICE = "00000000-0000-4000-8000-000000000001";
const BOB = "00000000-0000-4000-8000-000000000002";

function prefs(
  userId: string,
  overrides: Partial<PreferencesResponseDto> = {},
): PreferencesResponseDto {
  return {
    user_id: userId,
    meals_enabled: true,
    meal_times: ["08:00", "12:30", "19:30"],
    hydration_enabled: true,
    hydration_every_min: 120,
    supplements_enabled: true,
    workout_enabled: true,
    workout_time: "18:00",
    goal_alerts_enabled: true,
    gamification_enabled: true,
    ...overrides,
  };
}

function makeScheduler(
  allPrefs: PreferencesResponseDto[],
  dueSupplements: { id: string; user_id: string; name: string }[] = [],
) {
  const preferences = { listAll: jest.fn().mockResolvedValue(allPrefs) };
  const dispatch = jest.fn().mockResolvedValue(true);
  const prisma = {
    supplement: { findMany: jest.fn().mockResolvedValue(dueSupplements) },
  };
  const scheduler = new RemindersScheduler(
    preferences as unknown as PreferencesRepository,
    { dispatch } as unknown as NotificationsService,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma as any,
  );
  return { scheduler, dispatch };
}

describe("RemindersScheduler.tick", () => {
  it("fires meal + hydration at 08:00 UTC but not the 18:00 workout", async () => {
    const { scheduler, dispatch } = makeScheduler([prefs(ALICE)]);
    await scheduler.tick(new Date("2026-07-12T08:00:00Z"));

    const types = dispatch.mock.calls.map((c) => c[1].type);
    expect(types).toContain("meal_reminder");
    expect(types).toContain("hydration_reminder"); // window start = multiple 0
    expect(types).not.toContain("workout_reminder");
  });

  it("fires the workout reminder at its configured time", async () => {
    const { scheduler, dispatch } = makeScheduler([prefs(ALICE)]);
    await scheduler.tick(new Date("2026-07-12T18:00:00Z"));
    const types = dispatch.mock.calls.map((c) => c[1].type);
    expect(types).toContain("workout_reminder");
    expect(types).not.toContain("meal_reminder");
  });

  it("disabled toggles silence their reminder type", async () => {
    const { scheduler, dispatch } = makeScheduler([
      prefs(ALICE, { meals_enabled: false, hydration_enabled: false }),
    ]);
    await scheduler.tick(new Date("2026-07-12T08:00:00Z"));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("supplement schedules fire per supplement, honouring the opt-out", async () => {
    const { scheduler, dispatch } = makeScheduler(
      [prefs(ALICE), prefs(BOB, { supplements_enabled: false })],
      [
        { id: "s1", user_id: ALICE, name: "Créatine" },
        { id: "s2", user_id: BOB, name: "Oméga 3" },
      ],
    );
    await scheduler.tick(new Date("2026-07-12T09:37:00Z"));

    const supplementCalls = dispatch.mock.calls.filter(
      (c) => c[1].type === "supplement_reminder",
    );
    expect(supplementCalls).toHaveLength(1);
    expect(supplementCalls[0][0]).toBe(ALICE);
    expect(supplementCalls[0][1].title).toContain("Créatine");
  });
});
