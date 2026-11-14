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

// User tanpa password, aman disimpan di state.
export interface SafeUser extends Omit<User, "password"> {
  email: string;
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

export interface ClassMember {
  uid: string;
  nama: string;
  nim: string;
  email: string;
  joinedAt: Date | null;
}

export type SessionStatus = "scheduled" | "open" | "closed";

export interface ScheduleRecord {
  id: string;
  classId: string;
  mataKuliah: string;
  kodeKelas: string;
  nomorPraktikum: number;
  namaPraktikum: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  ruang: string;
  assistants: string[];
  createdBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SessionRecord {
  id: string;
  scheduleId: string;
  classId: string;
  kodeKelas?: string;
  status: SessionStatus;
  openedAt: Date | null;
  closedAt: Date | null;
  openedBy: string | null;
  closedBy: string | null;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export interface Session {
  id: string;
  scheduleId?: string;
  practicumId: string;
  classId: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  ruang: string;
  assistantId: string;
  assistants?: string[];
  status: SessionStatus;
  openedAt?: Date | null;
  closedAt?: Date | null;
  openedBy?: string | null;
  closedBy?: string | null;
  updatedBy?: string | null;
  updatedAt?: Date | null;
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

export type PermissionStatus = "pending" | "approved" | "rejected";

export interface PermissionRecord {
  id: string;
  uid: string;
  nama: string;
  nim: string;
  classId: string;
  sessionId: string;
  mataKuliah?: string;
  namaPraktikum?: string;
  nomorPraktikum?: number;
  alasan: string;
  status: PermissionStatus;
  aiStatus: "success" | "failed";
  aiCategory: "positif" | "netral" | "negatif" | null;
  aiConfidence?: number | null;
  aiProcessedAt?: Date | null;
  decidedBy?: string | null;
  decidedAt?: Date | null;
  createdAt: Date | null;
}

