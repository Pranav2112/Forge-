import { fromCm, fromKg, fromKm, formatDuration, formatPace, roundTo } from "@/lib/calc";

export function kcal(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function grams(value: number): string {
  const rounded = roundTo(value, 1);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function weightLabel(kg: number, unit: string): string {
  const value = fromKg(kg, unit);
  const rounded = roundTo(value, unit === "kg" ? 1 : 1);
  return `${rounded.toFixed(1)} ${unit === "lb" || unit === "lbs" ? "lb" : "kg"}`;
}

export function lengthLabel(cm: number, unit: string): string {
  const value = fromCm(cm, unit);
  const displayUnit = unit === "in" || unit === "inch" || unit === "inches" ? "in" : "cm";
  return `${roundTo(value, 1).toFixed(1)} ${displayUnit}`;
}

export function distanceLabel(km: number, unit: string): string {
  const value = fromKm(km, unit);
  const displayUnit = unit === "mi" || unit === "mile" || unit === "miles" ? "mi" : "km";
  return `${roundTo(value, 2).toFixed(2)} ${displayUnit}`;
}

export function signedKg(delta: number): string {
  const rounded = roundTo(delta, 1);
  if (Math.abs(rounded) < 0.05) return "0.0 kg";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}${Math.abs(rounded).toFixed(1)} kg`;
}

export function paceLabel(secondsPerKm: number, unit: string): string {
  const perUnit = unit === "mi" || unit === "mile" || unit === "miles" ? secondsPerKm * 1.609344 : secondsPerKm;
  const suffix = unit === "mi" || unit === "mile" || unit === "miles" ? "/mi" : "/km";
  return `${formatPace(perUnit)} ${suffix}`;
}

export function clock(seconds: number): string {
  return formatDuration(seconds);
}

export function mlToLiters(ml: number): string {
  return `${roundTo(ml / 1000, 2).toFixed(2)} L`;
}
