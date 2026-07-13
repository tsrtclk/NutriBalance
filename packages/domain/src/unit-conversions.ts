/**
 * É12 — display-unit conversions (backlog: D13). The API is metric everywhere
 * (kg / cm on the wire); the stored unit preference only tells clients how to
 * render. These helpers are the single rounding rule every client shares, so
 * a weight rendered on two devices never disagrees in the last decimal.
 */

export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "in";

export const WEIGHT_UNITS: readonly WeightUnit[] = ["kg", "lb"];
export const HEIGHT_UNITS: readonly HeightUnit[] = ["cm", "in"];

/** Exact legal definitions — never round the factors, only the results. */
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

const round1 = (n: number): number => Math.round(n * 10) / 10;

export function kgToLb(kg: number): number {
  return round1(kg / KG_PER_LB);
}

export function lbToKg(lb: number): number {
  return round1(lb * KG_PER_LB);
}

export function cmToIn(cm: number): number {
  return round1(cm / CM_PER_IN);
}

export function inToCm(inches: number): number {
  return round1(inches * CM_PER_IN);
}

/** Render a metric weight in the user's chosen unit, e.g. `176.4 lb`. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  return unit === "lb" ? `${kgToLb(kg)} lb` : `${round1(kg)} kg`;
}

/** Render a metric height in the user's chosen unit, e.g. `70.9 in`. */
export function formatHeight(cm: number, unit: HeightUnit): string {
  return unit === "in" ? `${cmToIn(cm)} in` : `${round1(cm)} cm`;
}
