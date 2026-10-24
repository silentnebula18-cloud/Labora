import { users } from "../mocks/users";
import type { SafeUser } from "../types";

export type AuthErrorCode = "KREDENSIAL_SALAH" | "AKUN_TANPA_PERAN";

export type AuthResult =
  | { ok: true; user: SafeUser }
  | { ok: false; code: AuthErrorCode; message: string };

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  KREDENSIAL_SALAH: "NIM atau kata sandi salah",
  AKUN_TANPA_PERAN: "Akun belum memiliki peran",
};

const fail = (code: AuthErrorCode): AuthResult => ({
  ok: false,
  code,
  message: ERROR_MESSAGES[code],
});

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function stripPassword(user: (typeof users)[number]): SafeUser {
  const { password: _password, ...safeUser } = user;
  return safeUser;
}

export async function authenticate(
  nim: string,
  password: string,
): Promise<AuthResult> {
  await wait(600); // tes agar state loading terlihat

  const found = users.find((u) => u.nim === nim.trim());

  if (!found || found.password !== password) {
    return fail("KREDENSIAL_SALAH");
  }
  if (found.roles.length === 0) return fail("AKUN_TANPA_PERAN");

  return { ok: true, user: stripPassword(found) };
}

export function getUserById(id: string): SafeUser | null {
  const found = users.find((u) => u.id === id);
  return found ? stripPassword(found) : null;
}