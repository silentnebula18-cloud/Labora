import { attendances } from "../mocks/attendances";
import { classes } from "../mocks/classes";
import { enrollments } from "../mocks/enrollments";
import { practicums } from "../mocks/practicums";
import { sessions } from "../mocks/sessions";
import { users } from "../mocks/users";
import type { Attendance, Practicum, PracticalClass, Session, SessionStatus } from "../types";

// ─── Tipe Hasil ────────────────────────────────────────────────────────────────

export interface SessionWithMeta extends Session {
  practicum: Practicum;
  kelas: PracticalClass;
}

export interface AttendanceWithStudent extends Attendance {
  namaStudentId: string;
  namaStudent: string;
  nimStudent: string;
}

export interface AttendanceWithSession extends Attendance {
  session: SessionWithMeta;
}

export type AttendanceErrorCode =
  | "SESI_TIDAK_DITEMUKAN"
  | "TIDAK_TERDAFTAR"
  | "SESI_BELUM_DIBUKA"
  | "SESI_DITUTUP"
  | "SUDAH_PRESENSI";

export type MarkAttendanceResult =
  | { ok: true; attendance: Attendance }
  | { ok: false; code: AttendanceErrorCode; message: string };

const ATTENDANCE_ERROR_MESSAGES: Record<AttendanceErrorCode, string> = {
  SESI_TIDAK_DITEMUKAN: "Sesi praktikum tidak ditemukan",
  TIDAK_TERDAFTAR: "Anda tidak terdaftar pada kelas sesi ini",
  SESI_BELUM_DIBUKA: "Sesi belum dibuka oleh asisten",
  SESI_DITUTUP: "Sesi sudah ditutup, presensi tidak dapat dilakukan",
  SUDAH_PRESENSI: "Anda sudah melakukan presensi pada sesi ini",
};

const failAttendance = (code: AttendanceErrorCode): MarkAttendanceResult => ({
  ok: false,
  code,
  message: ATTENDANCE_ERROR_MESSAGES[code],
});

// ─── Store In-Memory (mutable copy) ───────────────────────────────────────────

let _sessions: Session[] = sessions.map((s) => ({ ...s }));
let _attendances: Attendance[] = attendances.map((a) => ({ ...a }));

// ─── Helper ────────────────────────────────────────────────────────────────────

function withMeta(session: Session): SessionWithMeta {
  const practicum = practicums.find((p) => p.id === session.practicumId)!;
  const kelas = classes.find((c) => c.id === session.classId)!;
  return { ...session, practicum, kelas };
}

function byJadwalAsc(a: Session, b: Session): number {
  if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
  return a.jamMulai.localeCompare(b.jamMulai);
}

// ─── Query ─────────────────────────────────────────────────────────────────────

/** Ambil semua sesi yang diasistensi oleh asisten tertentu, dilengkapi meta. */
export function getSessionsByAssistant(assistantId: string): SessionWithMeta[] {
  return _sessions
    .filter((s) => s.assistantId === assistantId)
    .map(withMeta)
    .sort((a, b) => {
      // Urutkan: terbaru dulu
      if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.jamMulai.localeCompare(a.jamMulai);
    });
}

/** Ambil semua sesi dari kelas yang diikuti praktikan, urut jadwal terdekat. */
export function getSessionsByStudent(studentId: string): SessionWithMeta[] {
  const classIds = new Set(
    enrollments
      .filter((e) => e.studentId === studentId)
      .map((e) => e.classId),
  );

  return _sessions
    .filter((s) => classIds.has(s.classId))
    .map(withMeta)
    .sort(byJadwalAsc);
}

/** Ambil satu sesi lengkap berdasarkan id. */
export function getSessionById(sessionId: string): SessionWithMeta | null {
  const s = _sessions.find((s) => s.id === sessionId);
  if (!s) return null;
  return withMeta(s);
}

/** Ambil daftar presensi beserta data mahasiswa untuk satu sesi. */
export function getAttendancesBySession(sessionId: string): AttendanceWithStudent[] {
  return _attendances
    .filter((a) => a.sessionId === sessionId)
    .map((a) => {
      const user = users.find((u) => u.id === a.studentId);
      return {
        ...a,
        namaStudentId: a.studentId,
        namaStudent: user?.nama ?? "—",
        nimStudent: user?.nim ?? "—",
      };
    })
    .sort((a, b) => a.waktuHadir.localeCompare(b.waktuHadir));
}

/** Ambil riwayat presensi milik satu praktikan, terbaru dulu. */
export function getAttendancesByStudent(
  studentId: string,
): AttendanceWithSession[] {
  return _attendances
    .filter((a) => a.studentId === studentId)
    .map((a) => {
      const session = _sessions.find((s) => s.id === a.sessionId);
      return session ? { ...a, session: withMeta(session) } : null;
    })
    .filter((a): a is AttendanceWithSession => a !== null)
    .sort((a, b) => b.waktuHadir.localeCompare(a.waktuHadir));
}

/** Cek presensi seorang praktikan pada satu sesi (null jika belum presensi). */
export function getAttendance(
  sessionId: string,
  studentId: string,
): Attendance | null {
  const found = _attendances.find(
    (a) => a.sessionId === sessionId && a.studentId === studentId,
  );
  return found ? { ...found } : null;
}

/** Hitung jumlah praktikan yang terdaftar di kelas tertentu. */
export function getEnrolledCount(classId: string): number {
  return enrollments.filter((e) => e.classId === classId).length;
}

// ─── Mutasi ────────────────────────────────────────────────────────────────────

/** Ubah status sesi. Kembalikan sesi yang sudah diperbarui atau null jika tidak ditemukan. */
export function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
): Session | null {
  const idx = _sessions.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  _sessions[idx] = { ..._sessions[idx], status };
  return { ..._sessions[idx] };
}

/**
 * Catat presensi praktikan pada sesi yang sedang dibuka.
 * Menolak presensi ganda dan sesi yang tidak dapat dihadiri.
 */
export function markAttendance(
  sessionId: string,
  studentId: string,
): MarkAttendanceResult {
  const session = _sessions.find((s) => s.id === sessionId);
  if (!session) return failAttendance("SESI_TIDAK_DITEMUKAN");

  const enrolled = enrollments.some(
    (e) => e.studentId === studentId && e.classId === session.classId,
  );
  if (!enrolled) return failAttendance("TIDAK_TERDAFTAR");

  if (session.status === "belum_dibuka") {
    return failAttendance("SESI_BELUM_DIBUKA");
  }
  if (session.status === "ditutup") return failAttendance("SESI_DITUTUP");

  const already = _attendances.some(
    (a) => a.sessionId === sessionId && a.studentId === studentId,
  );
  if (already) return failAttendance("SUDAH_PRESENSI");

  const attendance: Attendance = {
    id: `A-${Date.now()}`,
    sessionId,
    studentId,
    waktuHadir: new Date().toISOString(),
  };
  _attendances.push(attendance);

  return { ok: true, attendance: { ...attendance } };
}

/** Reset store ke data mock awal (berguna saat logout). */
export function resetSessionStore() {
  _sessions = sessions.map((s) => ({ ...s }));
  _attendances = attendances.map((a) => ({ ...a }));
}
