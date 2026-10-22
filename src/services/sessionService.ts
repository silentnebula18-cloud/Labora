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

// ─── Store In-Memory (mutable copy) ───────────────────────────────────────────

let _sessions: Session[] = sessions.map((s) => ({ ...s }));
let _attendances: Attendance[] = attendances.map((a) => ({ ...a }));

// ─── Query ─────────────────────────────────────────────────────────────────────

/** Ambil semua sesi yang diasistensi oleh asisten tertentu, dilengkapi meta. */
export function getSessionsByAssistant(assistantId: string): SessionWithMeta[] {
  return _sessions
    .filter((s) => s.assistantId === assistantId)
    .map((s) => {
      const practicum = practicums.find((p) => p.id === s.practicumId)!;
      const kelas = classes.find((c) => c.id === s.classId)!;
      return { ...s, practicum, kelas };
    })
    .sort((a, b) => {
      // Urutkan: terbaru dulu
      if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.jamMulai.localeCompare(a.jamMulai);
    });
}

/** Ambil satu sesi lengkap berdasarkan id. */
export function getSessionById(sessionId: string): SessionWithMeta | null {
  const s = _sessions.find((s) => s.id === sessionId);
  if (!s) return null;
  const practicum = practicums.find((p) => p.id === s.practicumId)!;
  const kelas = classes.find((c) => c.id === s.classId)!;
  return { ...s, practicum, kelas };
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

/** Reset store ke data mock awal (berguna saat logout). */
export function resetSessionStore() {
  _sessions = sessions.map((s) => ({ ...s }));
  _attendances = attendances.map((a) => ({ ...a }));
}
