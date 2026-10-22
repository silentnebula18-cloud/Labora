export type Role = "asisten" | "praktikan";

export interface User {
  id: string;
  nim: string;
  nama: string;
  password: string;
  roles: Role[];
}

// User tanpa password, aman disimpan di state.
export type SafeUser = Omit<User, "password">;

export interface AuthSession {
  userId: string;
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

export type SessionStatus = "belum_dibuka" | "dibuka" | "ditutup";

export interface Session {
  id: string;
  practicumId: string;
  classId: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  ruang: string;
  assistantId: string;
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
