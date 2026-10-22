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
  getEnrolledCount,
  getSessionById,
  getSessionsByAssistant,
  resetSessionStore,
  updateSessionStatus,
  type AttendanceWithStudent,
  type SessionWithMeta,
} from "../services/sessionService";
import type { SessionStatus } from "../types";

// ─── Tipe Konteks ──────────────────────────────────────────────────────────────

interface SessionContextValue {
  /** Daftar sesi asisten saat ini */
  sessions: SessionWithMeta[];
  /** Muat ulang daftar sesi (misal setelah status berubah) */
  refreshSessions: (assistantId: string) => void;
  /** Ambil detail satu sesi */
  getSession: (sessionId: string) => SessionWithMeta | null;
  /** Ambil daftar presensi satu sesi */
  getAttendances: (sessionId: string) => AttendanceWithStudent[];
  /** Hitung total mahasiswa terdaftar di kelas */
  getEnrolled: (classId: string) => number;
  /** Update status sesi (buka / tutup) */
  setSessionStatus: (sessionId: string, status: SessionStatus) => void;
  /** Reset semua data (saat logout) */
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionWithMeta[]>([]);

  const refreshSessions = useCallback((assistantId: string) => {
    setSessions(getSessionsByAssistant(assistantId));
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
    },
    [],
  );

  const reset = useCallback(() => {
    resetSessionStore();
    setSessions([]);
  }, []);

  const value = useMemo(
    () => ({
      sessions,
      refreshSessions,
      getSession,
      getAttendances,
      getEnrolled,
      setSessionStatus,
      reset,
    }),
    [sessions, refreshSessions, getSession, getAttendances, getEnrolled, setSessionStatus, reset],
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
