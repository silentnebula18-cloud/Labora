export type Role = "asisten" | "praktikan" | "aslab";

export const ROLES: readonly Role[] = ["praktikan", "asisten", "aslab"];

export function isRole(value: unknown): value is Role {
  return value === "praktikan" || value === "asisten" || value === "aslab";
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
  fcmToken?: string | null;
  fcmTokenUpdatedAt?: Date | null;
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
  memberIds?: string[];
  labId?: string;
  ruang?: string;
  gracePeriodMinutes?: number;
  fineAmount?: number;
}

export interface ClassMember {
  uid: string;
  nama: string;
  nim: string;
  email: string;
  joinedAt: Date | null;
}

export interface ScheduleInput {
  classId: string;
  nomorPraktikum: number;
  namaPraktikum: string;
  tanggal: Date;
  jamMulai: Date;
  jamSelesai: Date;
  ruang: string;
}

export type SessionStatus = "scheduled" | "open" | "closed";

export interface ScheduleRecord {
  id: string;
  classId: string;
  mataKuliah: string;
  kodeKelas: string;
  nomorPraktikum: number;
  namaPraktikum: string;
  tanggal: Date;
  jamMulai: Date;
  jamSelesai: Date;
  ruang: string;
  labId?: string;
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
  kodePresensi?: string;
  status: SessionStatus;
  openedAt: Date | null;
  closedAt: Date | null;
  openedBy: string | null;
  closedBy: string | null;
  gracePeriodMinutes?: number;
  fineAmount?: number;
  updatedBy: string | null;
  updatedAt: Date | null;
}

export interface Session {
  id: string;
  scheduleId?: string;
  practicumId: string;
  classId: string;
  tanggal: Date;
  jamMulai: Date;
  jamSelesai: Date;
  ruang: string;
  labId?: string;
  assistantId: string;
  assistants?: string[];
  kodePresensi?: string;
  status: SessionStatus;
  openedAt?: Date | null;
  closedAt?: Date | null;
  openedBy?: string | null;
  closedBy?: string | null;
  gracePeriodMinutes?: number;
  fineAmount?: number;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface Enrollment {
  id: string;
  studentId: string;
  classId: string;
}

export interface LabLocation {
  id: string;
  nama: string;
  latitude: number;
  longitude: number;
  radius: number; // dalam meter
}

/**
 * Data master laboratorium (SRS-015).
 * `nama` harus konsisten dengan field `ruang` pada `schedules`/`sessions`
 * agar validasi presensi dapat mencocokkan laboratorium yang dimaksud.
 */
export interface Laboratory extends LabLocation {
  deskripsi: string;
  alamat: string;
  aktif: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export type AttendanceStatus = "hadir" | "izin";
export type LatenessStatus = "on_time" | "late" | "excused";

export interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  waktuHadir: string;
  latitude?: number;
  longitude?: number;
  jarakMeter?: number;
  radiusMeter?: number;
  attendanceStatus?: AttendanceStatus;
  latenessStatus?: LatenessStatus;
  lateMinutes?: number;
  fineId?: string | null;
}

export type FineStatus = "unpaid" | "pending" | "paid" | "failed";

export interface FineRecord {
  fineId: string;
  studentId: string;
  nama: string;
  nim: string;
  sessionId: string;
  classId: string;
  kodeKelas: string;
  mataKuliah: string;
  nomorPraktikum: number;
  namaPraktikum: string;
  ruang: string;
  labId: string;
  waktuHadir: Date | null;
  lateMinutes: number;
  gracePeriodMinutes: number;
  nominal: number;
  status: FineStatus;
  latestOrderId: string | null;
  paidAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type PaymentTransactionStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired";

export interface PaymentTransaction {
  orderId: string;
  fineId: string;
  studentId: string;
  sessionId: string;
  nominal: number;
  status: PaymentTransactionStatus;
  paidAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
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
  excusedRecorded?: boolean;
  createdAt: Date | null;
}

export type NotificationType =
  | "session_opened"
  | "schedule_updated"
  | "permission_decided"
  | "system_info";

export interface AppNotification {
  id: string;
  recipientUid: string;
  recipientRole?: Role;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date | null;
}


