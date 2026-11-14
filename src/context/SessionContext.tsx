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
  subscribeStudentSessionAttendance,
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
  /** Update status sesi (scheduled / open / closed). actor default adalah UID user aktif atau "system" jika auto-close. */
  setSessionStatus: (
    sessionId: string,
    status: SessionStatus,
    actor?: string,
  ) => Promise<void>;
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
    studentInfo?: { nama?: string; nim?: string },
  ) => Promise<MarkAttendanceResult>;
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
    user && activeRole ? `${user.id}:${activeRole}` : null;

  const sessionsLoading =
    currentSubscriptionKey !== null && loadedKey !== currentSubscriptionKey;

  // Langganan real-time otomatis berdasarkan user & peran aktif
  useEffect(() => {
    if (!user || !activeRole) {
      resetSessionStore();
      return;
    }

    const subKey = `${user.id}:${activeRole}`;

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
        if (items.length === 0) {
          setMyAttendances([]);
        }
        setSessionsError(null);
        setLoadedKey(subKey);
      },
      (error) => {
        setSessionsError(describeFirestoreError(error));
        setLoadedKey(subKey);
      },
    );
    return unsubscribe;
  }, [user, activeRole]);

  // Pantau presensi praktikan di setiap sesi miliknya secara real-time dari Firestore (SRS 007 & 008)
  useEffect(() => {
    if (!user || activeRole !== "praktikan" || studentSessions.length === 0) {
      return;
    }

    const unsubscribers: (() => void)[] = [];
    const attendanceMap = new Map<string, AttendanceWithSession>();

    studentSessions.forEach((sess) => {
      const unsub = subscribeStudentSessionAttendance(
        sess.id,
        user.id,
        (att) => {
          if (att) {
            attendanceMap.set(sess.id, { ...att, session: sess });
          } else {
            attendanceMap.delete(sess.id);
          }
          const list = Array.from(attendanceMap.values()).sort((a, b) =>
            b.waktuHadir.localeCompare(a.waktuHadir),
          );
          setMyAttendances(list);
        },
        (error) => {
          setSessionsError(describeFirestoreError(error));
        },
      );
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((u) => u());
    };
  }, [user, activeRole, studentSessions]);

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
    async (sessionId: string, status: SessionStatus, actor?: string) => {
      const now = new Date();
      const uid =
        actor !== undefined
          ? actor
          : status === "closed"
            ? (user?.id || "system")
            : (user?.id || "");

      updateSessionStatus(sessionId, status);

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId || s.scheduleId === sessionId
            ? {
                ...s,
                status,
                openedAt: status === "open" ? now : s.openedAt,
                closedAt: status === "closed" ? now : (status === "open" ? null : s.closedAt),
                closedBy: status === "closed" ? uid : (status === "open" ? null : s.closedBy),
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
                closedAt: status === "closed" ? now : (status === "open" ? null : s.closedAt),
                closedBy: status === "closed" ? uid : (status === "open" ? null : s.closedBy),
                updatedBy: uid || s.updatedBy,
                updatedAt: now,
              }
            : s,
        ),
      );

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
    async (
      sessionId: string,
      studentId: string,
      studentInfo?: { nama?: string; nim?: string },
    ): Promise<MarkAttendanceResult> => {
      const studentName = studentInfo?.nama || user?.nama || "Praktikan";
      const studentNim = studentInfo?.nim || user?.nim || "—";
      const result = await markAttendanceService(sessionId, studentId, {
        nama: studentName,
        nim: studentNim,
      });
      if (result.ok) {
        const session = getSessionById(sessionId);
        if (session) {
          setMyAttendances((prev) => {
            const exists = prev.some((a) => a.sessionId === sessionId);
            if (exists) return prev;
            return [{ ...result.attendance, session }, ...prev];
          });
        }
      }
      return result;
    },
    [user],
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
