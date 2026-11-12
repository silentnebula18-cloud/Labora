export type Role = "asisten" | "praktikan";

export const ROLES: readonly Role[] = ["praktikan", "asisten"];

export function isRole(value: unknown): value is Role {
  return value === "praktikan" || value === "asisten";
}

export interface User {
  id: string;
  nim: string;
  nama: string;
  password: string;
  roles: Role[];
}

<<<<<<< HEAD
// User tanpa password, aman disimpan di state.
export type SafeUser = Omit<User, "password">;
  nim: string;
  nama: string;
  email: string;
  roles: Role[];
>>>>>>> d17bf37 (Initial commit)
  activeRole: Role | null;
}
export interface Practicum {
  id: string;
  mataKuliah: string;
  namaPraktikum: string;
  nomorPraktikum: number;
}

export interface PracticalClass {
  id: string;
  namaKelas: string;
  practicumId: string;
}

export interface ClassRecord {
  id: string;
  mataKuliah: string;
  kodeKelas: string;
  assistants: string[];
  createdBy: string;
  createdAt: Date | null;
}

  nama: string;
  nim: string;
  email: string;
  joinedAt: Date | null;
}

export type SessionStatus = "belum_dibuka" | "dibuka" | "ditutup";

export interface Session {
  id: string;
  practicumId: string;
  classId: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  ruang: string;
  status: SessionStatus;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
}

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  waktuHadir: string;
}
