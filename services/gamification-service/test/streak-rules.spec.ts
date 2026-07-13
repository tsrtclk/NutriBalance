import {
  advanceStreak,
  effectiveCurrent,
  EMPTY_STREAK,
  nextDay,
  utcDayOf,
} from "../src/modules/gamification/streak-rules";

describe("utcDayOf / nextDay", () => {
  it("truncates timestamps to the UTC day (D10/D7)", () => {
    expect(utcDayOf("2026-07-12T23:59:59Z")).toBe("2026-07-12");
    expect(utcDayOf("2026-07-12")).toBe("2026-07-12");
  });

  it("crosses month and year boundaries", () => {
    expect(nextDay("2026-01-31")).toBe("2026-02-01");
    expect(nextDay("2026-12-31")).toBe("2027-01-01");
    expect(nextDay("2028-02-28")).toBe("2028-02-29"); // leap year
  });
});

describe("advanceStreak", () => {
  it("first event opens a 1-day chain", () => {
    const s = advanceStreak(EMPTY_STREAK, "2026-07-10");
    expect(s).toEqual({
      current_len: 1,
      best_len: 1,
      last_day: "2026-07-10",
      events_total: 1,
    });
  });

  it("a second event the same day counts but does not grow the chain", () => {
    const day1 = advanceStreak(EMPTY_STREAK, "2026-07-10");
    const again = advanceStreak(day1, "2026-07-10");
    expect(again.current_len).toBe(1);
    expect(again.events_total).toBe(2);
  });

  it("consecutive days grow the chain and the best mark", () => {
    let s = advanceStreak(EMPTY_STREAK, "2026-07-10");
    s = advanceStreak(s, "2026-07-11");
    s = advanceStreak(s, "2026-07-12");
    expect(s.current_len).toBe(3);
    expect(s.best_len).toBe(3);
  });

  it("a gap restarts at 1 but keeps the best mark", () => {
    let s = advanceStreak(EMPTY_STREAK, "2026-07-10");
    s = advanceStreak(s, "2026-07-11");
    s = advanceStreak(s, "2026-07-14"); // skipped 12 and 13
    expect(s.current_len).toBe(1);
    expect(s.best_len).toBe(2);
    expect(s.last_day).toBe("2026-07-14");
  });

  it("a backfilled older day never rewinds the chain", () => {
    let s = advanceStreak(EMPTY_STREAK, "2026-07-11");
    s = advanceStreak(s, "2026-07-12");
    const before = { ...s };
    s = advanceStreak(s, "2026-07-05"); // backdated journal entry
    expect(s.current_len).toBe(before.current_len);
    expect(s.last_day).toBe(before.last_day);
    expect(s.events_total).toBe(before.events_total + 1);
  });
});

describe("effectiveCurrent", () => {
  const chain = {
    current_len: 5,
    best_len: 5,
    last_day: "2026-07-11",
    events_total: 9,
  };

  it("alive when last activity was today or yesterday", () => {
    expect(effectiveCurrent(chain, "2026-07-11")).toBe(5);
    expect(effectiveCurrent(chain, "2026-07-12")).toBe(5); // rescuable
  });

  it("reads 0 once a full day has been missed", () => {
    expect(effectiveCurrent(chain, "2026-07-13")).toBe(0);
  });

  it("an empty chain reads 0", () => {
    expect(effectiveCurrent(EMPTY_STREAK, "2026-07-12")).toBe(0);
  });
});
