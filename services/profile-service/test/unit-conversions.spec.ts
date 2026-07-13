import {
  cmToIn,
  formatHeight,
  formatWeight,
  inToCm,
  kgToLb,
  lbToKg,
} from "@platform/domain";

describe("unit conversions (É12, D13 — API metric, display converted)", () => {
  it("kg ↔ lb round-trips through the legal factor", () => {
    expect(kgToLb(80)).toBe(176.4); // 80 / 0.45359237 = 176.37…
    expect(lbToKg(176.4)).toBe(80); // and back, within the 1-decimal rule
  });

  it("cm ↔ in round-trips", () => {
    expect(cmToIn(180)).toBe(70.9); // 180 / 2.54 = 70.866…
    expect(inToCm(70.9)).toBe(180.1); // note: 1-decimal loss is expected
  });

  it("identity units only round, never convert", () => {
    expect(formatWeight(80.04, "kg")).toBe("80 kg");
    expect(formatHeight(180, "cm")).toBe("180 cm");
  });

  it("formats in the chosen display unit", () => {
    expect(formatWeight(80, "lb")).toBe("176.4 lb");
    expect(formatHeight(180, "in")).toBe("70.9 in");
  });

  it("zero stays zero in every unit", () => {
    expect(kgToLb(0)).toBe(0);
    expect(cmToIn(0)).toBe(0);
  });
});
