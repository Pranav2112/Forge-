import { createHash, timingSafeEqual } from "node:crypto";
import { signInErrorMessage } from "@/lib/auth-errors";

export { signInErrorMessage };

export function normalizeSetupCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashSetupCode(code: string) {
  return createHash("sha256").update(normalizeSetupCode(code)).digest("hex");
}

export function setupCodesMatch(code: string, expectedHash: string) {
  if (!expectedHash || expectedHash.length !== 64) return false;
  const actual = Buffer.from(hashSetupCode(code));
  const expected = Buffer.from(expectedHash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function validateAccountForm(input: { name: string; email: string; password: string; confirm: string; code: string }) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 80) return "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email.";
  if (input.password.length < 8) return "Use at least 8 characters.";
  if (input.password !== input.confirm) return "Those passwords do not match.";
  if (normalizeSetupCode(input.code).length < 8) return "Enter the setup code from your computer.";
  return null;
}

