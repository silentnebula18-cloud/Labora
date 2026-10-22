import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getAttendancesBySession,
  getAttendancesByStudent,
  getAttendance,
  getEnrolledCount,
  getSessionById,
  getSessionsByAssistant,
  getSessionsByStudent,
  markAttendance as markAttendanceService,
  resetSessionStore,
  updateSessionStatus,
  type AttendanceWithSession,
  type AttendanceWithStudent,
  type MarkAttendanceResult,
  type SessionWithMeta,
} from "../services/sessionService";
import type { Attendance, SessionStatus } from "../types";

// ─── Tipe Konteks ──────────────────────────────────────────────────────────────

interface SessionContextValue {
  /** Daftar sesi asisten saat ini */
  sessions: SessionWithMeta[];
  /** Muat ulang daftar sesi (misal setelah status berubah) */
  refreshSessions: (assistantId: string) => void;
  /** Daftar sesi milik praktikan saat ini */
  studentSessions: SessionWithMeta[];
  /** Muat ulang jadwal praktikan */
  refreshStudentSessions: (studentId: string) => void;
  /** Riwayat presensi praktikan saat ini */
  myAttendances: AttendanceWithSession[];
  /** Muat ulang riwayat presensi praktikan */
  refreshMyAttendances: (studentId: string) => void;
  /** Ambil detail satu sesi */
  getSession: (sessionId: string) => SessionWithMeta | null;
  /** Ambil daftar presensi satu sesi */
  getAttendances: (sessionId: string) => AttendanceWithStudent[];
  /** Cek presensi praktikan pada satu sesi */
  getAttendance: (sessionId: string, studentId: string) => Attendance | null;
  /** Hitung total mahasiswa terdaftar di kelas */
  getEnrolled: (classId: string) => number;
  /** Update status sesi (buka / tutup) */
  setSessionStatus: (sessionId: string, status: SessionStatus) => void;
  /** Catat presensi praktikan */
  markAttendance: (
    sessionId: string,
    studentId: string,
  ) => MarkAttendanceResult;
  /** Reset semua data (saat logout) */
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionWithMeta[]>([]);
  const [studentSessions, setStudentSessions] = useState<SessionWithMeta[]>([]);
  const [myAttendances, setMyAttendances] = useState<AttendanceWithSession[]>([]);

  const refreshSessions = useCallback((assistantId: string) => {
    setSessions(getSessionsByAssistant(assistantId));
  }, []);

  const refreshStudentSessions = useCallback((studentId: string) => {
    setStudentSessions(getSessionsByStudent(studentId));
  }, []);

  const refreshMyAttendances = useCallback((studentId: string) => {
    setMyAttendances(getAttendancesByStudent(studentId));
  }, []);

  const getSession = useCallback((sessionId: string) => {
    return getSessionById(sessionId);
  }, []);

  const getAttendances = useCallback((sessionId: string) => {
    return getAttendancesBySession(sessionId);
  }, []);

  const getEnrolled = useCallback((classId: string) => {
    return getEnrolledCount(classId);
  }, []);

  const setSessionStatus = useCallback(
    (sessionId: string, status: SessionStatus) => {
      updateSessionStatus(sessionId, status);
      // Perbarui daftar sesi supaya UI reaktif
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status } : s)),
      );
      setStudentSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status } : s)),
      );
    },
    [],
  );

  const markAttendance = useCallback(
    (sessionId: string, studentId: string) => {
      const result = markAttendanceService(sessionId, studentId);
      if (result.ok) {
        setMyAttendances(getAttendancesByStudent(studentId));
      }
      return result;
    },
    [],
  );

  const reset = useCallback(() => {
    resetSessionStore();
    setSessions([]);
    setStudentSessions([]);
    setMyAttendances([]);
  }, []);

  const value = useMemo(
    () => ({
      sessions,
      refreshSessions,
      studentSessions,
      refreshStudentSessions,
      myAttendances,
      refreshMyAttendances,
      getSession,
      getAttendances,
      getAttendance,
      getEnrolled,
      setSessionStatus,
      markAttendance,
      reset,
    }),
    [
      sessions,
      refreshSessions,
      studentSessions,
      refreshStudentSessions,
      myAttendances,
      refreshMyAttendances,
      getSession,
      getAttendances,
      getEnrolled,
      setSessionStatus,
      markAttendance,
      reset,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession harus dipakai di dalam <SessionProvider>");
  return ctx;
}
