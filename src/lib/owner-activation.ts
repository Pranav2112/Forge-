"use server";

import { prisma } from "@/lib/prisma";
import { supabaseUrl } from "@/lib/supabase-env";
import { setupCodesMatch, validateAccountForm } from "@/lib/activation";

const MAX_ATTEMPTS = 5;

type ActivationResult = { ok: true; email: string } | { ok: false; message: string };

function serviceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

async function authAdmin(path: string, init?: RequestInit) {
  const key = serviceRoleKey();
  const response = await fetch(`${supabaseUrl()}/auth/v1/admin/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  });
  const text = await response.text();
  let body: { id?: string; users?: { id: string; email?: string }[]; error_code?: string; msg?: string; message?: string } | null = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  return { ok: response.ok, status: response.status, body };
}

export async function activateOwnerAccount(input: {
  name: string;
  email: string;
  password: string;
  confirm: string;
  code: string;
}): Promise<ActivationResult> {
  const invalid = validateAccountForm(input);
  if (invalid) return { ok: false, message: invalid };
  const email = input.email.trim().toLowerCase();
  const allowed = process.env.ALLOWED_EMAIL?.trim().toLowerCase() ?? "";
  if (!allowed || email !== allowed) return { ok: false, message: "This copy only activates its existing owner account." };
  if (!supabaseUrl() || !serviceRoleKey()) return { ok: false, message: "Account activation is not configured on this server." };

  const settings = await prisma.userSettings.findUnique({ where: { id: "default" } });
  if (!settings?.activationCodeHash || !settings.activationExpiresAt || settings.activationExpiresAt.getTime() <= Date.now()) {
    return { ok: false, message: "Registration is closed." };
  }
  if (!setupCodesMatch(input.code, settings.activationCodeHash)) {
    const attempts = settings.activationAttempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.userSettings.update({
        where: { id: "default" },
        data: { activationCodeHash: "", activationExpiresAt: null, activationAttempts: 0 },
      });
      return { ok: false, message: "That setup code was entered too many times. Arm activation again from your computer." };
    }
    await prisma.userSettings.update({ where: { id: "default" }, data: { activationAttempts: attempts } });
    return { ok: false, message: "That setup code is not valid." };
  }

  const listed = await authAdmin("users?page=1&per_page=50");
  const users = Array.isArray(listed.body?.users) ? listed.body.users : [];
  const matches = users.filter((user) => user.email?.trim().toLowerCase() === email);
  if (!listed.ok || matches.length !== 1) return { ok: false, message: "The existing account could not be activated." };
  const userId = matches[0].id;

  const updated = await authAdmin(`users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({
      password: input.password,
      user_metadata: { name: input.name.trim(), full_name: input.name.trim() },
    }),
  });
  const returnedId = updated.body?.id;
  if (!updated.ok || (returnedId && returnedId !== userId)) {
    return { ok: false, message: "The password was not saved. Try again." };
  }

  await prisma.userSettings.update({
    where: { id: "default" },
    data: { activationCodeHash: "", activationExpiresAt: null, activationAttempts: 0 },
  });
  await prisma.userProfile.update({ where: { id: "default" }, data: { name: input.name.trim() } }).catch(() => undefined);
  return { ok: true, email };
}
