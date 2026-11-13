import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { describeFirestoreError } from "../services/classService";
import {
  closeSessionInFirestore,
  createScheduleAndSession,
  deleteScheduleAndSession,
  getAttendance,
  getAttendancesBySession,
  getAttendancesByStudent,
  getEnrolledCount,
  getSessionById,
  getSessionsByAssistant,
  getSessionsByStudent,
  markAttendance as markAttendanceService,
  openSessionInFirestore,
  resetSessionStore,
  subscribeAssistantSchedulesWithSessions,
  subscribeStudentSchedulesWithSessions,
  updateScheduleAndSession,
  updateSessionStatus,
  type AttendanceWithSession,
  type AttendanceWithStudent,
  type MarkAttendanceResult,
  type ScheduleInput,
  type SessionWithMeta,
} from "../services/sessionService";
import type { Attendance, ClassRecord, SessionStatus } from "../types";
import { useAuth } from "./AuthContext";

// ─── Tipe Konteks ──────────────────────────────────────────────────────────────

interface SessionContextValue {
  /** Daftar sesi asisten saat ini (real-time dari Firestore) */
  sessions: SessionWithMeta[];
  /** Status pemuatan jadwal/sesi */
  sessionsLoading: boolean;
  /** Pesan error pemuatan jadwal/sesi (jika ada) */
  sessionsError: string | null;
  /** Muat ulang daftar sesi asisten */
  refreshSessions: (assistantId: string) => void;
  /** Daftar sesi milik praktikan saat ini (real-time dari Firestore) */
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
  /** Update status sesi (scheduled / open / closed) */
  setSessionStatus: (sessionId: string, status: SessionStatus) => Promise<void>;
  /** Buat jadwal & sesi baru di Firestore */
  createSchedule: (kelas: ClassRecord, input: ScheduleInput) => Promise<string>;
  /** Ubah jadwal di Firestore */
  updateSchedule: (
    scheduleId: string,
    kelas: ClassRecord,
    input: ScheduleInput,
  ) => Promise<void>;
  /** Hapus jadwal & sesi di Firestore */
  deleteSchedule: (scheduleId: string) => Promise<void>;
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
  const { user, activeRole } = useAuth();

  const [sessions, setSessions] = useState<SessionWithMeta[]>([]);
  const [studentSessions, setStudentSessions] = useState<SessionWithMeta[]>([]);
  const [myAttendances, setMyAttendances] = useState<AttendanceWithSession[]>(
    [],
  );
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);

  const currentSubscriptionKey =
    user && activeRole ? `${user.id}:${activeRole}:${user.kelas ?? ""}` : null;

  const sessionsLoading =
    currentSubscriptionKey !== null && loadedKey !== currentSubscriptionKey;

  // Langganan real-time otomatis berdasarkan user & peran aktif
  useEffect(() => {
    if (!user || !activeRole) {
      resetSessionStore();
      return;
    }

    const subKey = `${user.id}:${activeRole}:${user.kelas ?? ""}`;

    if (activeRole === "asisten") {
      const unsubscribe = subscribeAssistantSchedulesWithSessions(
        user.id,
        (items) => {
          setSessions(items);
          setSessionsError(null);
          setLoadedKey(subKey);
        },
        (error) => {
          setSessionsError(describeFirestoreError(error));
          setLoadedKey(subKey);
        },
      );
      return unsubscribe;
    }

    const unsubscribe = subscribeStudentSchedulesWithSessions(
      user.id,
      (items) => {
        setStudentSessions(items);
        setMyAttendances(getAttendancesByStudent(user.id));
        setSessionsError(null);
        setLoadedKey(subKey);
      },
      (error) => {
        setSessionsError(describeFirestoreError(error));
        setLoadedKey(subKey);
      },
      user.kelas,
    );
    return unsubscribe;
  }, [user, activeRole]);

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
    async (sessionId: string, status: SessionStatus) => {
      const now = new Date();
      const uid = user?.id ?? "";

      updateSessionStatus(sessionId, status);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId || s.scheduleId === sessionId
            ? {
                ...s,
                status,
                openedAt: status === "open" ? now : s.openedAt,
                closedAt: status === "closed" ? now : s.closedAt,
                updatedBy: uid || s.updatedBy,
                updatedAt: now,
              }
            : s,
        ),
      );
      setStudentSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId || s.scheduleId === sessionId
            ? {
                ...s,
                status,
                openedAt: status === "open" ? now : s.openedAt,
                closedAt: status === "closed" ? now : s.closedAt,
                updatedBy: uid || s.updatedBy,
                updatedAt: now,
              }
            : s,
        ),
      );

      if (!uid) return;
      if (status === "open") {
        await openSessionInFirestore(sessionId, uid);
      } else if (status === "closed") {
        await closeSessionInFirestore(sessionId, uid);
      }
    },
    [user],
  );

  const createSchedule = useCallback(
    async (kelas: ClassRecord, input: ScheduleInput) => {
      if (!user) throw new Error("Pengguna belum masuk");
      return createScheduleAndSession(user.id, kelas, input);
    },
    [user],
  );

  const updateSchedule = useCallback(
    async (scheduleId: string, kelas: ClassRecord, input: ScheduleInput) => {
      if (!user) throw new Error("Pengguna belum masuk");
      await updateScheduleAndSession(user.id, scheduleId, kelas, input);
    },
    [user],
  );

  const deleteSchedule = useCallback(async (scheduleId: string) => {
    await deleteScheduleAndSession(scheduleId);
    setSessions((prev) =>
      prev.filter((s) => s.id !== scheduleId && s.scheduleId !== scheduleId),
    );
  }, []);

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
    setLoadedKey(null);
    setSessionsError(null);
  }, []);

  const value = useMemo(
    () => ({
      sessions: user && activeRole === "asisten" ? sessions : [],
      sessionsLoading,
      sessionsError: user && activeRole ? sessionsError : null,
      refreshSessions,
      studentSessions: user && activeRole === "praktikan" ? studentSessions : [],
      refreshStudentSessions,
      myAttendances: user && activeRole === "praktikan" ? myAttendances : [],
      refreshMyAttendances,
      getSession,
      getAttendances,
      getAttendance,
      getEnrolled,
      setSessionStatus,
      createSchedule,
      updateSchedule,
      deleteSchedule,
      markAttendance,
      reset,
    }),
    [
      user,
      activeRole,
      sessions,
      sessionsLoading,
      sessionsError,
      refreshSessions,
      studentSessions,
      refreshStudentSessions,
      myAttendances,
      refreshMyAttendances,
      getSession,
      getAttendances,
      getEnrolled,
      setSessionStatus,
      createSchedule,
      updateSchedule,
      deleteSchedule,
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
  if (!ctx) {
    throw new Error("useSession harus dipakai di dalam <SessionProvider>");
  }
  return ctx;
}
