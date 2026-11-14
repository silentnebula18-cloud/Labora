import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "@react-native-firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "@react-native-firebase/firestore";

import { auth, db } from "../lib/firebase";
import { isRole, type Role, type SafeUser } from "../types";

export type AuthErrorCode =
  | "KREDENSIAL_SALAH"
  | "AKUN_TANPA_PERAN"
  | "PROFIL_TIDAK_DITEMUKAN"
  | "EMAIL_TERDAFTAR"
  | "EMAIL_TIDAK_VALID"
  | "PASSWORD_LEMAH"
  | "TERLALU_BANYAK_PERCOBAAN"
  | "JARINGAN"
  | "TIDAK_DIIZINKAN"
  | "TIDAK_DIKETAHUI";

export type AuthResult =
  | { ok: true; user: SafeUser }
  | { ok: false; code: AuthErrorCode; message: string };

export interface RegisterInput {
  nama: string;
  nim: string;
  email: string;
  password: string;
}

export type ProfileLoadResult =
  | { status: "ok"; user: SafeUser }
  | { status: "missing" }
  | { status: "no-role" };

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  KREDENSIAL_SALAH: "Email atau kata sandi salah",
  AKUN_TANPA_PERAN:
    "Akun belum memiliki peran. Hubungi asisten atau pihak yang berwenang.",
  PROFIL_TIDAK_DITEMUKAN:
    "Profil pengguna tidak ditemukan. Hubungi pihak yang berwenang.",
  EMAIL_TERDAFTAR: "Email sudah terdaftar. Silakan masuk.",
  EMAIL_TIDAK_VALID: "Format email tidak valid",
  PASSWORD_LEMAH: "Kata sandi minimal 6 karakter",
  TERLALU_BANYAK_PERCOBAAN:
    "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.",
  JARINGAN: "Koneksi internet bermasalah. Periksa jaringan Anda.",
  TIDAK_DIIZINKAN:
    "Akses ke database ditolak. Hubungi pihak yang berwenang.",
  TIDAK_DIKETAHUI: "Terjadi kesalahan. Silakan coba lagi.",
};

const fail = (code: AuthErrorCode): AuthResult => ({
  ok: false,
  code,
  message: ERROR_MESSAGES[code],
});

function errorCode(error: unknown): string {
  return typeof (error as { code?: unknown })?.code === "string"
    ? (error as { code: string }).code
    : "";
}

function mapAuthError(error: unknown, fallback: AuthErrorCode): AuthErrorCode {
  switch (errorCode(error)) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "KREDENSIAL_SALAH";
    case "auth/email-already-in-use":
      return "EMAIL_TERDAFTAR";
    case "auth/invalid-email":
      return "EMAIL_TIDAK_VALID";
    case "auth/weak-password":
      return "PASSWORD_LEMAH";
    case "auth/too-many-requests":
      return "TERLALU_BANYAK_PERCOBAAN";
    case "auth/network-request-failed":
      return "JARINGAN";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
    case "permission-denied":
      return "TIDAK_DIIZINKAN";
    default:
      return fallback;
  }
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toSafeUser(
  uid: string,
  data: Record<string, unknown>,
): ProfileLoadResult {
  const roles = Array.isArray(data.roles)
    ? Array.from(new Set(data.roles.filter(isRole)))
    : [];

  if (roles.length === 0) return { status: "no-role" };

  const storedActiveRole = isRole(data.activeRole) ? data.activeRole : null;

  return {
    status: "ok",
    user: {
      id: uid,
      nama: readString(data.nama).trim(),
      nim: readString(data.nim).trim(),
      email: readString(data.email).trim(),
      roles,
      activeRole:
        storedActiveRole && roles.includes(storedActiveRole)
          ? storedActiveRole
          : null,
    },
  };
}

export async function registerUser(
  input: RegisterInput,
): Promise<AuthResult> {
  const nama = input.nama.trim();
  const nim = input.nim.trim();
  const email = normalizeEmail(input.email);

  let uid: string;

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      input.password,
    );
    uid = credential.user.uid;
  } catch (error) {
    return fail(mapAuthError(error, "TIDAK_DIKETAHUI"));
  }

  try {
    await setDoc(doc(db, "users", uid), {
      uid,
      nama,
      nim,
      email,
      roles: ["praktikan"],
      activeRole: null,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Jangan biarkan akun Authentication tanpa profil di Firestore.
    const currentUser = auth.currentUser;
    if (currentUser) await deleteUser(currentUser).catch(() => undefined);
    await logoutUser().catch(() => undefined);
    return fail(mapAuthError(error, "TIDAK_DIIZINKAN"));
  }

  const currentUser = auth.currentUser;
  if (currentUser) {
    await updateProfile(currentUser, { displayName: nama }).catch(
      () => undefined,
    );
  }

  return {
    ok: true,
    user: {
      id: uid,
      nama,
      nim,
      email,
      roles: ["praktikan"],
      activeRole: null,
    },
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResult> {
  let uid: string;

  try {
    const credential = await signInWithEmailAndPassword(
      auth,
      normalizeEmail(email),
      password,
    );
    uid = credential.user.uid;
  } catch (error) {
    return fail(mapAuthError(error, "KREDENSIAL_SALAH"));
  }

  try {
    const result = await loadUserProfile(uid);

    if (result.status === "missing") {
      await signOut(auth).catch(() => undefined);
      return fail("PROFIL_TIDAK_DITEMUKAN");
    }

    if (result.status === "no-role") {
      await signOut(auth).catch(() => undefined);
      return fail("AKUN_TANPA_PERAN");
    }

    return { ok: true, user: result.user };
  } catch (error) {
    await signOut(auth).catch(() => undefined);
    return fail(mapAuthError(error, "TIDAK_DIIZINKAN"));
  }
}

export async function loadUserProfile(
  uid: string,
): Promise<ProfileLoadResult> {
  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) return { status: "missing" };

  return toSafeUser(uid, snapshot.data() as Record<string, unknown>);
}

export async function updateActiveRole(
  uid: string,
  role: Role | null,
): Promise<void> {
  await updateDoc(doc(db, "users", uid), { activeRole: role });
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
