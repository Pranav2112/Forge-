import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
} from "date-fns";

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function addDaysKey(key: string, days: number): string {
  return formatKey(addDays(dateFromKey(key), days));
}

export function todayKey(timeZone = "America/New_York", now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return formatKey(now);
  return `${year}-${month}-${day}`;
}

export function dayOfWeek(key: string): number {
  return dateFromKey(key).getDay();
}

export function displayDate(key: string): string {
  return format(dateFromKey(key), "EEEE, MMM d, yyyy");
}

export function shortDate(key: string): string {
  return format(dateFromKey(key), "MMM d");
}

export function daysUntil(fromKey: string, targetKey: string): number {
  return differenceInCalendarDays(dateFromKey(targetKey), dateFromKey(fromKey));
}

export function parseClock(value: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export { parseISO };
