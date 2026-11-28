import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import { db } from "../lib/firebase";
import {
  notifyScheduleUpdated,
  notifySessionOpened,
} from "./notificationService";
import { validateStudentLabProximity } from "./locationService";
import {
  computeLateness,
  createLateFine,
  resolveFineAmount,
  resolveGracePeriodMinutes,
} from "./fineService";
import { attendances } from "../mocks/attendances";
import { classes } from "../mocks/classes";
import { enrollments } from "../mocks/enrollments";
import { practicums } from "../mocks/practicums";
import { sessions } from "../mocks/sessions";
import { users } from "../mocks/users";
import type {
  Attendance,
  ClassRecord,
  PracticalClass,
  Practicum,
  ScheduleRecord,
  Session,
  SessionRecord,
  SessionStatus,
  ScheduleInput,
} from "../types";

export type { ScheduleInput };

// ─── Tipe Input & Hasil ───────────────────────────────────────────────────────

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
  | "SUDAH_PRESENSI"
  | "LAB_TIDAK_DITEMUKAN"
  | "IZIN_LOKASI_DITOLAK"
  | "GPS_TIDAK_AKTIF"
  | "LOKASI_GAGAL"
  | "DI_LUAR_RADIUS";

export type MarkAttendanceResult =
  | { ok: true; attendance: Attendance }
  | { ok: false; code: AttendanceErrorCode; message: string };

const ATTENDANCE_ERROR_MESSAGES: Record<AttendanceErrorCode, string> = {
  SESI_TIDAK_DITEMUKAN: "Sesi tidak ditemukan",
  TIDAK_TERDAFTAR: "Anda tidak terdaftar di kelas ini",
  SESI_BELUM_DIBUKA: "Sesi belum dibuka",
  SESI_DITUTUP: "Sesi sudah ditutup",
  SUDAH_PRESENSI: "Anda sudah melakukan presensi",
  LAB_TIDAK_DITEMUKAN: "Data lokasi laboratorium belum tersedia",
  IZIN_LOKASI_DITOLAK: "Izin akses lokasi ditolak",
  GPS_TIDAK_AKTIF: "GPS perangkat tidak aktif",
  LOKASI_GAGAL: "Gagal mendapatkan lokasi perangkat",
  DI_LUAR_RADIUS: "Lokasi di luar radius laboratorium",
};

const failAttendance = (code: AttendanceErrorCode): MarkAttendanceResult => ({
  ok: false,
  code,
  message: ATTENDANCE_ERROR_MESSAGES[code],
});

type Listener<T> = (items: T) => void;
type ErrorListener = (error: unknown) => void;

// ─── Helper Parsing Firestore ─────────────────────────────────────────────────

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readNumber(value: unknown, fallback = 1): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function readStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readOptionalNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  return null;
}

export function isSessionStatus(value: unknown): value is SessionStatus {
  return value === "scheduled" || value === "open" || value === "closed";
}

function normalizeSessionStatus(value: unknown): SessionStatus {
  if (isSessionStatus(value)) return value;
  if (value === "dibuka") return "open";
  if (value === "ditutup") return "closed";
  return "scheduled";
}

function parseScheduleDate(value: unknown): Date {
  const asDate = toDate(value);
  if (asDate) return asDate;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const parsed = new Date(`${value.trim()}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function parseScheduleTime(
  value: unknown,
  baseDate: Date,
  fallbackHours: number,
  fallbackMinutes: number,
): Date {
  const asDate = toDate(value);
  if (asDate) return asDate;
  const result = new Date(baseDate);
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value.trim())) {
    const [h, m] = value.trim().split(":").map(Number);
    result.setHours(h, m, 0, 0);
    return result;
  }
  result.setHours(fallbackHours, fallbackMinutes, 0, 0);
  return result;
}

function mapSchedule(
  id: string,
  data: Record<string, unknown>,
): ScheduleRecord {
  const tanggal = parseScheduleDate(data.tanggal);
  const jamMulai = parseScheduleTime(data.jamMulai, tanggal, 7, 40);
  const jamSelesai = parseScheduleTime(data.jamSelesai, tanggal, 9, 40);

  return {
    id,
    classId: readString(data.classId),
    mataKuliah: readString(data.mataKuliah),
    kodeKelas: readString(data.kodeKelas),
    nomorPraktikum: readNumber(data.nomorPraktikum, 1),
    namaPraktikum: readString(data.namaPraktikum),
    tanggal,
    jamMulai,
    jamSelesai,
    ruang: readString(data.ruang),
    labId: readString(data.labId) || undefined,
    assistants: readStringList(data.assistants),
    createdBy: readString(data.createdBy),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/**
 * Bangkitkan kode presensi unik beridentitas kelas & pertemuan:
 * `<2 Karakter Kode Kelas><Nomor Pertemuan><4 Digit Angka Acak>` (contoh: "A114829").
 */
export function generateAttendanceCode(
  kodeKelas?: string,
  nomorPraktikum?: number,
): string {
  const cleanPrefix = (kodeKelas ?? "")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 2);
  const prefix = cleanPrefix.length === 2 ? cleanPrefix : "LB";
  const pertemuan =
    typeof nomorPraktikum === "number" &&
    Number.isFinite(nomorPraktikum) &&
    nomorPraktikum > 0
      ? String(Math.floor(nomorPraktikum))
      : "1";
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${pertemuan}${randomDigits}`;
}

function mapSessionRecord(
  id: string,
  data: Record<string, unknown>,
): SessionRecord {
  const kodeKelas = readString(data.kodeKelas).trim().toUpperCase();
  const kodePresensi = readString(data.kodePresensi).trim().toUpperCase();
  return {
    id,
    scheduleId: readString(data.scheduleId) || id,
    classId: readString(data.classId),
    kodeKelas: kodeKelas || undefined,
    kodePresensi: kodePresensi || undefined,
    status: normalizeSessionStatus(data.status),
    openedAt: toDate(data.openedAt),
    closedAt: toDate(data.closedAt),
    openedBy: readNullableString(data.openedBy),
    closedBy: readNullableString(data.closedBy),
    gracePeriodMinutes: readOptionalNumber(data.gracePeriodMinutes),
    fineAmount: readOptionalNumber(data.fineAmount),
    updatedBy: readNullableString(data.updatedBy),
    updatedAt: toDate(data.updatedAt),
  };
}

function combineScheduleAndSession(
  schedule: ScheduleRecord,
  session?: SessionRecord,
  classInfo?: { mataKuliah?: string; kodeKelas?: string },
): SessionWithMeta {
  const sessionId = session?.id ?? schedule.id;
  const mataKuliah =
    classInfo?.mataKuliah || schedule.mataKuliah || "Mata Kuliah";
  const kodeKelas = classInfo?.kodeKelas || schedule.kodeKelas || "—";

  return {
    id: sessionId,
    scheduleId: schedule.id,
    practicumId: schedule.id,
    classId: schedule.classId,
    tanggal: schedule.tanggal,
    jamMulai: schedule.jamMulai,
    jamSelesai: schedule.jamSelesai,
    ruang: schedule.ruang,
    labId: schedule.labId,
    assistantId: schedule.createdBy || schedule.assistants[0] || "",
    assistants: schedule.assistants,
    kodePresensi: session?.kodePresensi,
    status: session?.status ?? "scheduled",
    openedAt: session?.openedAt ?? null,
    closedAt: session?.closedAt ?? null,
    openedBy: session?.openedBy ?? null,
    closedBy: session?.closedBy ?? null,
    gracePeriodMinutes: session?.gracePeriodMinutes,
    fineAmount: session?.fineAmount,
    updatedBy: session?.updatedBy ?? null,
    updatedAt: session?.updatedAt ?? schedule.updatedAt ?? null,
    practicum: {
      id: schedule.id,
      mataKuliah,
      namaPraktikum: schedule.namaPraktikum,
      nomorPraktikum: schedule.nomorPraktikum,
    },
    kelas: {
      id: schedule.classId,
      namaKelas: kodeKelas,
      practicumId: schedule.id,
    },
  };
}

function chunkList<T>(items: T[], size = 10): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// ─── Store In-Memory (Sinkron dengan Firestore & Fallback Presensi) ───────────

let _sessions: SessionWithMeta[] = [];
let _attendances: Attendance[] = attendances.map((a) => ({ ...a }));
let _enrolledCountMap: Record<string, number> = {};
let _studentClassIds = new Set<string>();

function withMeta(session: Session): SessionWithMeta {
  const practicum = practicums.find((p) => p.id === session.practicumId) ?? {
    id: session.practicumId,
    mataKuliah: "Praktikum",
    namaPraktikum: "Sesi Praktikum",
    nomorPraktikum: 1,
  };
  const kelas = classes.find((c) => c.id === session.classId) ?? {
    id: session.classId,
    namaKelas: "—",
    practicumId: session.practicumId,
  };
  return { ...session, practicum, kelas };
}

function ensureSessionWithMeta(
  session: Session | SessionWithMeta,
): SessionWithMeta {
  const maybe = session as Partial<SessionWithMeta>;
  if (maybe.practicum && maybe.kelas) {
    return session as SessionWithMeta;
  }
  return withMeta(session);
}

function updateLocalSessionsCache(items: SessionWithMeta[]) {
  const map = new Map<string, SessionWithMeta>();
  for (const existing of _sessions) {
    if (existing?.id) {
      map.set(existing.id, ensureSessionWithMeta(existing));
    }
  }
  for (const item of items) {
    if (item?.id) {
      map.set(item.id, ensureSessionWithMeta(item));
    }
  }
  _sessions = Array.from(map.values());
}

function byJadwalAsc(a: SessionWithMeta, b: SessionWithMeta): number {
  const diffTanggal = a.tanggal.getTime() - b.tanggal.getTime();
  if (diffTanggal !== 0) return diffTanggal;
  return a.jamMulai.getTime() - b.jamMulai.getTime();
}

function byJadwalDesc(a: SessionWithMeta, b: SessionWithMeta): number {
  const diffTanggal = b.tanggal.getTime() - a.tanggal.getTime();
  if (diffTanggal !== 0) return diffTanggal;
  return b.jamMulai.getTime() - a.jamMulai.getTime();
}

// ─── Listener Real-Time Firestore (SRS 006) ───────────────────────────────────

/**
 * Pantau jadwal & sesi yang diasistensi oleh asisten tertentu secara real-time.
 */
export function subscribeAssistantSchedulesWithSessions(
  assistantId: string,
  onData: Listener<SessionWithMeta[]>,
  onError?: ErrorListener,
) {
  let schedulesMap = new Map<string, ScheduleRecord>();
  let sessionsBySchedule = new Map<string, SessionRecord>();
  let classMetaMap = new Map<
    string,
    { mataKuliah: string; kodeKelas: string }
  >();
  let sessionUnsubscribers: (() => void)[] = [];
  let activeClassIdsKey = "";

  function emit() {
    const combined: SessionWithMeta[] = [];
    schedulesMap.forEach((sched) => {
      const sess = sessionsBySchedule.get(sched.id);
      const classMeta = classMetaMap.get(sched.classId);
      combined.push(combineScheduleAndSession(sched, sess, classMeta));
    });
    combined.sort(byJadwalDesc);
    updateLocalSessionsCache(combined);
    onData(combined);
  }

  function rebuildSessionListeners(classIds: string[]) {
    const sortedUnique = Array.from(new Set(classIds.filter(Boolean))).sort();
    const nextKey = sortedUnique.join(",");
    if (nextKey === activeClassIdsKey) return;
    activeClassIdsKey = nextKey;

    sessionUnsubscribers.forEach((unsub) => unsub());
    sessionUnsubscribers = [];
    sessionsBySchedule = new Map();

    if (sortedUnique.length === 0) {
      emit();
      return;
    }

    const chunks = chunkList(sortedUnique, 10);
    const chunkMaps = new Map<number, Map<string, SessionRecord>>();

    chunks.forEach((chunk, index) => {
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("classId", "in", chunk),
      );
      const unsub = onSnapshot(
        sessionsQuery,
        (snapshot) => {
          const mapForChunk = new Map<string, SessionRecord>();
          snapshot.docs.forEach((docSnap) => {
            const record = mapSessionRecord(
              docSnap.id,
              docSnap.data() as Record<string, unknown>,
            );
            mapForChunk.set(record.scheduleId || record.id, record);
          });
          chunkMaps.set(index, mapForChunk);

          const merged = new Map<string, SessionRecord>();
          chunkMaps.forEach((m) => {
            m.forEach((val, key) => merged.set(key, val));
          });
          sessionsBySchedule = merged;
          emit();
        },
        (error) => onError?.(error),
      );
      sessionUnsubscribers.push(unsub);
    });
  }

  // Pantau kelas asisten untuk jumlah peserta & metadata kelas terbaru
  const classesQuery = query(
    collection(db, "classes"),
    where("assistants", "array-contains", assistantId),
  );
  const unsubClasses = onSnapshot(
    classesQuery,
    (snapshot) => {
      const nextClassMeta = new Map<
        string,
        { mataKuliah: string; kodeKelas: string }
      >();

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const memberIds = readStringList(data.memberIds);
        _enrolledCountMap[docSnap.id] = memberIds.length;
        nextClassMeta.set(docSnap.id, {
          mataKuliah: readString(data.mataKuliah),
          kodeKelas: readString(data.kodeKelas),
        });
      });
      classMetaMap = nextClassMeta;
      emit();
    },
    (error) => onError?.(error),
  );

  // Pantau jadwal asisten
  const schedulesQuery = query(
    collection(db, "schedules"),
    where("assistants", "array-contains", assistantId),
  );
  const unsubSchedules = onSnapshot(
    schedulesQuery,
    (snapshot) => {
      const nextSchedules = new Map<string, ScheduleRecord>();
      const classIds: string[] = [];

      snapshot.docs.forEach((docSnap) => {
        const sched = mapSchedule(
          docSnap.id,
          docSnap.data() as Record<string, unknown>,
        );
        nextSchedules.set(sched.id, sched);
        if (sched.classId) classIds.push(sched.classId);
      });

      schedulesMap = nextSchedules;
      rebuildSessionListeners(classIds);
      emit();
    },
    (error) => onError?.(error),
  );

  return () => {
    unsubClasses();
    unsubSchedules();
    sessionUnsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Pantau jadwal & sesi untuk praktikan berdasarkan kelas yang diikuti (`memberIds`).
 */
export function subscribeStudentSchedulesWithSessions(
  studentId: string,
  onData: Listener<SessionWithMeta[]>,
  onError?: ErrorListener,
) {
  let schedulesByClassMap = new Map<string, ScheduleRecord>();
  let sessionsBySchedule = new Map<string, SessionRecord>();
  let classMetaByMember = new Map<
    string,
    { mataKuliah: string; kodeKelas: string }
  >();
  let innerUnsubscribers: (() => void)[] = [];
  let activeClassIdsKey: string | null = null;

  function emit() {
    const combined: SessionWithMeta[] = [];

    schedulesByClassMap.forEach((sched) => {
      const sess = sessionsBySchedule.get(sched.id);
      const classMeta = classMetaByMember.get(sched.classId);
      combined.push(combineScheduleAndSession(sched, sess, classMeta));
    });
    combined.sort(byJadwalAsc);
    updateLocalSessionsCache(combined);
    onData(combined);
  }

  function syncClassSubscriptions() {
    const classIds = Array.from(classMetaByMember.keys());
    _studentClassIds = new Set(classIds);
    rebuildInnerListeners(classIds);
  }

  function rebuildInnerListeners(classIds: string[]) {
    const sortedUnique = Array.from(new Set(classIds.filter(Boolean))).sort();
    const nextKey = sortedUnique.join(",");
    if (nextKey === activeClassIdsKey) return;
    activeClassIdsKey = nextKey;

    innerUnsubscribers.forEach((unsub) => unsub());
    innerUnsubscribers = [];
    schedulesByClassMap = new Map();
    sessionsBySchedule = new Map();

    if (sortedUnique.length === 0) {
      emit();
      return;
    }

    const chunks = chunkList(sortedUnique, 10);
    const scheduleChunkMaps = new Map<number, Map<string, ScheduleRecord>>();
    const sessionChunkMaps = new Map<number, Map<string, SessionRecord>>();

    chunks.forEach((chunk, index) => {
      const schedulesQuery = query(
        collection(db, "schedules"),
        where("classId", "in", chunk),
      );
      const unsubSched = onSnapshot(
        schedulesQuery,
        (snapshot) => {
          const mapForChunk = new Map<string, ScheduleRecord>();
          snapshot.docs.forEach((docSnap) => {
            const sched = mapSchedule(
              docSnap.id,
              docSnap.data() as Record<string, unknown>,
            );
            mapForChunk.set(sched.id, sched);
          });
          scheduleChunkMaps.set(index, mapForChunk);

          const merged = new Map<string, ScheduleRecord>();
          scheduleChunkMaps.forEach((m) => {
            m.forEach((val, key) => merged.set(key, val));
          });
          schedulesByClassMap = merged;
          emit();
        },
        (error) => onError?.(error),
      );

      const sessionsQuery = query(
        collection(db, "sessions"),
        where("classId", "in", chunk),
      );
      const unsubSess = onSnapshot(
        sessionsQuery,
        (snapshot) => {
          const mapForChunk = new Map<string, SessionRecord>();
          snapshot.docs.forEach((docSnap) => {
            const sess = mapSessionRecord(
              docSnap.id,
              docSnap.data() as Record<string, unknown>,
            );
            mapForChunk.set(sess.scheduleId || sess.id, sess);
          });
          sessionChunkMaps.set(index, mapForChunk);

          const merged = new Map<string, SessionRecord>();
          sessionChunkMaps.forEach((m) => {
            m.forEach((val, key) => merged.set(key, val));
          });
          sessionsBySchedule = merged;
          emit();
        },
        (error) => onError?.(error),
      );

      innerUnsubscribers.push(unsubSched, unsubSess);
    });
  }

  // Pantau kelas di mana memberIds memuat studentId
  const memberClassesQuery = query(
    collection(db, "classes"),
    where("memberIds", "array-contains", studentId),
  );
  const unsubMemberClasses = onSnapshot(
    memberClassesQuery,
    (snapshot) => {
      const nextMeta = new Map<
        string,
        { mataKuliah: string; kodeKelas: string }
      >();

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const memberIds = readStringList(data.memberIds);
        _enrolledCountMap[docSnap.id] = memberIds.length;
        nextMeta.set(docSnap.id, {
          mataKuliah: readString(data.mataKuliah),
          kodeKelas: readString(data.kodeKelas),
        });
      });

      classMetaByMember = nextMeta;
      syncClassSubscriptions();
      emit();
    },
    (error) => onError?.(error),
  );

  return () => {
    unsubMemberClasses();
    innerUnsubscribers.forEach((unsub) => unsub());
  };
}

// ─── Operasi CRUD Jadwal & Status Sesi (SRS 006) ──────────────────────────────

function normalizeRoomName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}.${minutes}`;
}

/**
 * Tolak jadwal yang bertabrakan dengan jadwal lain di laboratorium (ruang) yang
 * sama pada tanggal yang sama (SRS 019). Bentrok terjadi bila rentang waktu
 * beririsan: `mulaiBaru < selesaiLama && selesaiBaru > mulaiLama`.
 */
async function ensureNoScheduleConflict(params: {
  tanggal: Date;
  jamMulai: Date;
  jamSelesai: Date;
  ruang: string;
  excludeScheduleId?: string;
}): Promise<void> {
  const dayStart = new Date(params.tanggal);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const snapshot = await getDocs(
    query(
      collection(db, "schedules"),
      where("tanggal", ">=", Timestamp.fromDate(dayStart)),
      where("tanggal", "<", Timestamp.fromDate(dayEnd)),
    ),
  );

  const targetRoom = normalizeRoomName(params.ruang);

  for (const docSnap of snapshot.docs) {
    if (docSnap.id === params.excludeScheduleId) continue;
    const data = docSnap.data() as Record<string, unknown>;
    if (normalizeRoomName(readString(data.ruang)) !== targetRoom) continue;

    const existingTanggal = parseScheduleDate(data.tanggal);
    const existingMulai = parseScheduleTime(data.jamMulai, existingTanggal, 0, 0);
    const existingSelesai = parseScheduleTime(
      data.jamSelesai,
      existingTanggal,
      0,
      0,
    );

    const overlaps =
      params.jamMulai.getTime() < existingSelesai.getTime() &&
      params.jamSelesai.getTime() > existingMulai.getTime();
    if (!overlaps) continue;

    const label = readString(data.namaPraktikum) || readString(data.kodeKelas);
    throw new Error(
      `Jadwal bentrok dengan ${label || "jadwal lain"} di ${params.ruang.trim()} pada pukul ${formatClock(existingMulai)}–${formatClock(existingSelesai)}. Pilih waktu atau ruang lain.`,
    );
  }
}

/**
 * Buat jadwal baru di `schedules/{id}` beserta dokumen sesi di `sessions/{id}`.
 */
export async function createScheduleAndSession(
  assistantUid: string,
  kelas: ClassRecord,
  input: ScheduleInput,
): Promise<string> {
  await ensureNoScheduleConflict({
    tanggal: input.tanggal,
    jamMulai: input.jamMulai,
    jamSelesai: input.jamSelesai,
    ruang: input.ruang,
  });

  const scheduleRef = doc(collection(db, "schedules"));
  const sessionRef = doc(db, "sessions", scheduleRef.id);

  // Simpan dokumen jadwal terlebih dahulu agar pengecekan `exists` pada rule
  // `sessions/{sessionId}` terpenuhi saat dokumen sesi dibuat.
  await setDoc(scheduleRef, {
    classId: kelas.id,
    mataKuliah: kelas.mataKuliah.trim(),
    kodeKelas: kelas.kodeKelas.trim().toUpperCase(),
    nomorPraktikum: Number(input.nomorPraktikum),
    namaPraktikum: input.namaPraktikum.trim(),
    tanggal: Timestamp.fromDate(input.tanggal),
    jamMulai: Timestamp.fromDate(input.jamMulai),
    jamSelesai: Timestamp.fromDate(input.jamSelesai),
    ruang: input.ruang.trim(),
    labId: kelas.labId ?? null,
    assistants: kelas.assistants,
    createdBy: assistantUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const normalizedKodeKelas = kelas.kodeKelas.trim().toUpperCase();
  const kodePresensi = generateAttendanceCode(
    normalizedKodeKelas,
    input.nomorPraktikum,
  );

  try {
    await setDoc(sessionRef, {
      scheduleId: scheduleRef.id,
      classId: kelas.id,
      kodeKelas: normalizedKodeKelas,
      kodePresensi,
      status: "scheduled",
      openedAt: null,
      closedAt: null,
      openedBy: null,
      closedBy: null,
      updatedBy: assistantUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    await deleteDoc(scheduleRef).catch(() => undefined);
    throw error;
  }

  return scheduleRef.id;
}

/**
 * Perbarui informasi jadwal di `schedules/{scheduleId}` dan sinkronkan `sessions/{scheduleId}`.
 */
export async function updateScheduleAndSession(
  assistantUid: string,
  scheduleId: string,
  kelas: ClassRecord,
  input: ScheduleInput,
): Promise<void> {
  const scheduleRef = doc(db, "schedules", scheduleId);
  const sessionRef = doc(db, "sessions", scheduleId);

  await ensureNoScheduleConflict({
    tanggal: input.tanggal,
    jamMulai: input.jamMulai,
    jamSelesai: input.jamSelesai,
    ruang: input.ruang,
    excludeScheduleId: scheduleId,
  });

  const batch = writeBatch(db);

  batch.update(scheduleRef, {
    classId: kelas.id,
    mataKuliah: kelas.mataKuliah.trim(),
    kodeKelas: kelas.kodeKelas.trim().toUpperCase(),
    nomorPraktikum: Number(input.nomorPraktikum),
    namaPraktikum: input.namaPraktikum.trim(),
    tanggal: Timestamp.fromDate(input.tanggal),
    jamMulai: Timestamp.fromDate(input.jamMulai),
    jamSelesai: Timestamp.fromDate(input.jamSelesai),
    ruang: input.ruang.trim(),
    labId: kelas.labId ?? null,
    assistants: kelas.assistants,
    updatedAt: serverTimestamp(),
  });

  batch.update(sessionRef, {
    classId: kelas.id,
    kodeKelas: kelas.kodeKelas.trim().toUpperCase(),
    updatedBy: assistantUid,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();

  void notifyScheduleUpdated(scheduleId, assistantUid, input, kelas).catch(
    (err) => {
      console.warn("[sessionService] notifyScheduleUpdated error:", err);
    },
  );
}

/**
 * Hapus jadwal beserta dokumen sesi pasangannya.
 */
export async function deleteScheduleAndSession(
  scheduleId: string,
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, "schedules", scheduleId));
  batch.delete(doc(db, "sessions", scheduleId));
  await batch.commit();
  _sessions = _sessions.filter(
    (s) => s.id !== scheduleId && s.scheduleId !== scheduleId,
  );
}

/**
 * Buka sesi praktikum (`status = "open"`).
 * Hanya diizinkan pada tanggal & rentang jam jadwal (SRS 019), serta menyalin
 * `gracePeriodMinutes` dan `fineAmount` dari kelas ke dokumen sesi (SRS 020).
 * Jika sebelumnya berstatus closed, closedAt dan closedBy dibersihkan.
 */
export async function openSessionInFirestore(
  sessionId: string,
  assistantUid: string,
): Promise<void> {
  const sessionRef = doc(db, "sessions", sessionId);
  const existing = getSessionById(sessionId);

  const sessionSnap = await getDoc(sessionRef);
  const sessionData = sessionSnap.data() as Record<string, unknown> | undefined;
  const classId = readString(sessionData?.classId) || existing?.classId || "";

  const scheduleSnap = await getDoc(doc(db, "schedules", sessionId));
  if (!scheduleSnap.exists()) {
    throw new Error("Data jadwal sesi tidak ditemukan");
  }
  const scheduleData = scheduleSnap.data() as Record<string, unknown>;
  const tanggal = parseScheduleDate(scheduleData.tanggal);
  const jamMulai = parseScheduleTime(scheduleData.jamMulai, tanggal, 7, 40);
  const jamSelesai = parseScheduleTime(scheduleData.jamSelesai, tanggal, 9, 40);

  const windowStart = new Date(tanggal);
  windowStart.setHours(jamMulai.getHours(), jamMulai.getMinutes(), 0, 0);
  const windowEnd = new Date(tanggal);
  windowEnd.setHours(jamSelesai.getHours(), jamSelesai.getMinutes(), 0, 0);

  const now = Date.now();
  if (now < windowStart.getTime()) {
    throw new Error(
      `Sesi belum dapat dibuka. Jadwal dimulai pukul ${formatClock(windowStart)} WIB.`,
    );
  }
  if (now > windowEnd.getTime()) {
    throw new Error(
      `Waktu jadwal sesi telah berakhir pada pukul ${formatClock(windowEnd)} WIB.`,
    );
  }

  let kodePresensi =
    readString(sessionData?.kodePresensi).trim().toUpperCase() ||
    existing?.kodePresensi;
  const storedKelas =
    readString(sessionData?.kodeKelas).trim().toUpperCase() ||
    existing?.kelas?.namaKelas;
  if (!kodePresensi) {
    kodePresensi = generateAttendanceCode(
      storedKelas,
      existing?.practicum?.nomorPraktikum,
    );
  }

  let gracePeriodMinutes = resolveGracePeriodMinutes(
    existing?.gracePeriodMinutes,
  );
  let fineAmount = resolveFineAmount(existing?.fineAmount);
  if (classId) {
    try {
      const classSnap = await getDoc(doc(db, "classes", classId));
      const classData = classSnap.data() as
        | Record<string, unknown>
        | undefined;
      gracePeriodMinutes = resolveGracePeriodMinutes(
        readOptionalNumber(classData?.gracePeriodMinutes),
      );
      fineAmount = resolveFineAmount(
        readOptionalNumber(classData?.fineAmount),
      );
    } catch {
      // Gunakan nilai default bila konfigurasi kelas tidak terbaca.
    }
  }

  await setDoc(
    sessionRef,
    {
      status: "open",
      kodePresensi,
      gracePeriodMinutes,
      fineAmount,
      openedAt: serverTimestamp(),
      openedBy: assistantUid,
      closedAt: null,
      closedBy: null,
      updatedBy: assistantUid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  void notifySessionOpened(sessionId, assistantUid).catch((err) => {
    console.warn("[sessionService] notifySessionOpened error:", err);
  });
}

/**
 * Periksa apakah rentang waktu jadwal sesi telah berakhir.
 * Membandingkan jamSelesai (Date / Timestamp) dengan waktu saat ini.
 */
export function isScheduleExpired(
  tanggal?: Date | string,
  jamSelesai?: Date | string,
  currentEpoch: number = Date.now(),
): boolean {
  if (!jamSelesai) return false;
  if (jamSelesai instanceof Date) {
    return currentEpoch > jamSelesai.getTime();
  }
  if (!tanggal) return false;
  try {
    const dateStr =
      tanggal instanceof Date
        ? tanggal.toISOString().slice(0, 10)
        : String(tanggal);
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hours, minutes] = String(jamSelesai).split(":").map(Number);
    if (!year || !month || !day || isNaN(hours) || isNaN(minutes)) return false;
    const end = new Date(year, month - 1, day, hours, minutes, 0);
    return currentEpoch > end.getTime();
  } catch {
    return false;
  }
}

/**
 * Tutup sesi praktikum (`status = "closed"`).
 * closedBy default adalah "system" jika ditutup otomatis oleh sistem, atau UID asisten jika manual.
 */
export async function closeSessionInFirestore(
  sessionId: string,
  closedBy: string = "system",
): Promise<void> {
  await setDoc(
    doc(db, "sessions", sessionId),
    {
      status: "closed",
      closedAt: serverTimestamp(),
      closedBy,
      updatedBy: closedBy,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ─── Query & Helper Kompatibilitas ────────────────────────────────────────────

/** Ambil semua sesi yang diasistensi oleh asisten tertentu dari cache. */
export function getSessionsByAssistant(assistantId: string): SessionWithMeta[] {
  return _sessions
    .filter(
      (s) =>
        s.assistantId === assistantId ||
        (Array.isArray(s.assistants) && s.assistants.includes(assistantId)),
    )
    .map(ensureSessionWithMeta)
    .sort(byJadwalDesc);
}

/** Ambil semua sesi dari kelas yang diikuti praktikan dari cache. */
export function getSessionsByStudent(studentId: string): SessionWithMeta[] {
  const mockClassIds = enrollments
    .filter((e) => e.studentId === studentId)
    .map((e) => e.classId);
  const classIds = new Set([..._studentClassIds, ...mockClassIds]);

  return _sessions
    .filter((s) => classIds.has(s.classId))
    .map(ensureSessionWithMeta)
    .sort(byJadwalAsc);
}

/** Ambil satu sesi lengkap berdasarkan id. */
export function getSessionById(sessionId: string): SessionWithMeta | null {
  const found = _sessions.find(
    (s) => s.id === sessionId || s.scheduleId === sessionId,
  );
  if (found) return ensureSessionWithMeta(found);

  const mock = sessions.find((s) => s.id === sessionId);
  return mock ? withMeta(mock) : null;
}

/** Ambil daftar presensi beserta data mahasiswa untuk satu sesi. */
export function getAttendancesBySession(
  sessionId: string,
): AttendanceWithStudent[] {
  return _attendances
    .filter((a) => a.sessionId === sessionId)
    .map((a) => {
      const user = users.find((u) => u.id === a.studentId);
      return {
        ...a,
        namaStudentId: a.studentId,
        namaStudent: user?.nama ?? "Praktikan",
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
      const session = getSessionById(a.sessionId);
      return session ? { ...a, session } : null;
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
  if (typeof _enrolledCountMap[classId] === "number") {
    return _enrolledCountMap[classId];
  }
  return enrollments.filter((e) => e.classId === classId).length;
}

/** Ubah status sesi di cache lokal & Firestore. */
export function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
  assistantUid?: string,
): Session | null {
  const idx = _sessions.findIndex(
    (s) => s.id === sessionId || s.scheduleId === sessionId,
  );
  if (idx !== -1) {
    const now = new Date();
    _sessions[idx] = {
      ..._sessions[idx],
      status,
      openedAt: status === "open" ? now : _sessions[idx].openedAt,
      closedAt: status === "closed" ? now : _sessions[idx].closedAt,
      updatedBy: assistantUid ?? _sessions[idx].updatedBy,
      updatedAt: now,
    };
  }

  if (assistantUid) {
    if (status === "open") {
      void openSessionInFirestore(sessionId, assistantUid);
    } else if (status === "closed") {
      void closeSessionInFirestore(sessionId, assistantUid);
    }
  }

  return idx !== -1 ? { ..._sessions[idx] } : null;
}

/**
 * Pantau rekap presensi suatu sesi secara real-time dari Firestore (SRS 007 & SRS 008).
 * Asisten dapat membaca rekap kehadiran seluruh mahasiswa yang presensi.
 */
export function subscribeSessionAttendances(
  sessionId: string,
  onData: Listener<AttendanceWithStudent[]>,
  onError?: ErrorListener,
) {
  const attendancesQuery = collection(db, "sessions", sessionId, "attendance");

  return onSnapshot(
    attendancesQuery,
    (snapshot) => {
      const items: AttendanceWithStudent[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const studentId = readString(data.studentId) || docSnap.id;
        const studentName = readString(data.nama);
        const studentNim = readString(data.nim);
        const waktuHadirDate = toDate(data.waktuHadir);
        const waktuHadir = waktuHadirDate
          ? waktuHadirDate.toISOString()
          : new Date().toISOString();
        const latitude =
          typeof data.latitude === "number" && Number.isFinite(data.latitude)
            ? data.latitude
            : undefined;
        const longitude =
          typeof data.longitude === "number" && Number.isFinite(data.longitude)
            ? data.longitude
            : undefined;
        const jarakMeter =
          typeof data.jarakMeter === "number" && Number.isFinite(data.jarakMeter)
            ? data.jarakMeter
            : undefined;
        const radiusMeter =
          typeof data.radiusMeter === "number" &&
          Number.isFinite(data.radiusMeter)
            ? data.radiusMeter
            : undefined;
        const attendanceStatus =
          data.attendanceStatus === "izin" ? "izin" : "hadir";
        const latenessStatus =
          data.latenessStatus === "late"
            ? "late"
            : data.latenessStatus === "excused"
              ? "excused"
              : "on_time";
        const lateMinutes =
          typeof data.lateMinutes === "number" &&
          Number.isFinite(data.lateMinutes)
            ? data.lateMinutes
            : undefined;
        const fineId =
          typeof data.fineId === "string" ? data.fineId : undefined;

        // Update cache lokal juga
        const existingIdx = _attendances.findIndex(
          (a) => a.sessionId === sessionId && a.studentId === studentId,
        );
        const attendanceId = `${sessionId}_${docSnap.id}`;
        const attRecord: Attendance = {
          id: attendanceId,
          sessionId,
          studentId,
          waktuHadir,
          latitude,
          longitude,
          jarakMeter,
          radiusMeter,
          attendanceStatus,
          latenessStatus,
          lateMinutes,
          fineId,
        };
        if (existingIdx === -1) {
          _attendances.push(attRecord);
        } else {
          _attendances[existingIdx] = attRecord;
        }

        return {
          id: attendanceId,
          sessionId,
          studentId,
          waktuHadir,
          latitude,
          longitude,
          jarakMeter,
          radiusMeter,
          attendanceStatus,
          latenessStatus,
          lateMinutes,
          fineId,
          namaStudentId: studentId,
          namaStudent: studentName || "Praktikan",
          nimStudent: studentNim || "—",
        };
      });

      items.sort((a, b) => a.waktuHadir.localeCompare(b.waktuHadir));
      onData(items);
    },
    (error) => onError?.(error),
  );
}

/**
 * Pantau presensi seorang praktikan pada sesi tertentu secara real-time (SRS 007).
 */
export function subscribeStudentSessionAttendance(
  sessionId: string,
  studentId: string,
  onData: (attendance: Attendance | null) => void,
  onError?: ErrorListener,
) {
  const attendanceRef = doc(db, "sessions", sessionId, "attendance", studentId);

  return onSnapshot(
    attendanceRef,
    (docSnap) => {
      if (!docSnap.exists()) {
        onData(null);
        return;
      }
      const data = docSnap.data() as Record<string, unknown>;
      const waktuHadirDate = toDate(data.waktuHadir);
      const waktuHadir = waktuHadirDate
        ? waktuHadirDate.toISOString()
        : new Date().toISOString();
      const latitude =
        typeof data.latitude === "number" && Number.isFinite(data.latitude)
          ? data.latitude
          : undefined;
      const longitude =
        typeof data.longitude === "number" && Number.isFinite(data.longitude)
          ? data.longitude
          : undefined;
      const jarakMeter =
        typeof data.jarakMeter === "number" && Number.isFinite(data.jarakMeter)
          ? data.jarakMeter
          : undefined;
      const radiusMeter =
        typeof data.radiusMeter === "number" && Number.isFinite(data.radiusMeter)
          ? data.radiusMeter
          : undefined;
      const attendanceStatus =
        data.attendanceStatus === "izin" ? "izin" : "hadir";
      const latenessStatus =
        data.latenessStatus === "late"
          ? "late"
          : data.latenessStatus === "excused"
            ? "excused"
            : "on_time";
      const lateMinutes =
        typeof data.lateMinutes === "number" &&
        Number.isFinite(data.lateMinutes)
          ? data.lateMinutes
          : undefined;
      const fineId = typeof data.fineId === "string" ? data.fineId : undefined;

      const record: Attendance = {
        id: `${sessionId}_${docSnap.id}`,
        sessionId,
        studentId,
        waktuHadir,
        latitude,
        longitude,
        jarakMeter,
        radiusMeter,
        attendanceStatus,
        latenessStatus,
        lateMinutes,
        fineId,
      };

      // Sinkronkan ke cache lokal
      const existingIdx = _attendances.findIndex(
        (a) => a.sessionId === sessionId && a.studentId === studentId,
      );
      if (existingIdx === -1) {
        _attendances.push(record);
      } else {
        _attendances[existingIdx] = record;
      }

      onData(record);
    },
    (error) => onError?.(error),
  );
}

/**
 * Catat presensi praktikan pada sesi yang sedang dibuka (`status === "open"`) ke Firestore (SRS 007).
 * - Menolak presensi ganda (SRS 007)
 * - Menolak presensi pada sesi scheduled atau closed (SRS 007)
 * - Menyimpan UID, nama, nim, dan serverTimestamp ke sessions/{sessionId}/attendance/{studentId}
 */
export async function markAttendance(
  sessionId: string,
  studentId: string,
  studentInfo?: { nama?: string; nim?: string },
): Promise<MarkAttendanceResult> {
  const session = getSessionById(sessionId);
  if (!session) return failAttendance("SESI_TIDAK_DITEMUKAN");

  const enrolledInFirestore = _studentClassIds.has(session.classId);
  const enrolledInMock = enrollments.some(
    (e) => e.studentId === studentId && e.classId === session.classId,
  );
  if (!enrolledInFirestore && !enrolledInMock && _studentClassIds.size > 0) {
    return failAttendance("TIDAK_TERDAFTAR");
  }

  if (session.status === "scheduled") {
    return failAttendance("SESI_BELUM_DIBUKA");
  }
  if (session.status === "closed") {
    return failAttendance("SESI_DITUTUP");
  }
  if (isScheduleExpired(session.tanggal, session.jamSelesai)) {
    return {
      ok: false,
      code: "SESI_DITUTUP",
      message: "Waktu presensi telah berakhir",
    };
  }

  // Cek apakah sudah presensi di Firestore (mencegah presensi ganda di level database)
  const attendanceRef = doc(db, "sessions", sessionId, "attendance", studentId);
  try {
    const snap = await getDoc(attendanceRef);
    if (snap.exists()) {
      return failAttendance("SUDAH_PRESENSI");
    }
  } catch {
    // Jika getDoc gagal (misal offline/rules), periksa cache lokal
    const alreadyLocal = _attendances.some(
      (a) => a.sessionId === sessionId && a.studentId === studentId,
    );
    if (alreadyLocal) return failAttendance("SUDAH_PRESENSI");
  }

  // Validasi Lokasi GPS & Radius Laboratorium (SRS-014)
  const proximity = await validateStudentLabProximity(session.ruang);
  if (!proximity.ok) {
    return {
      ok: false,
      code: proximity.code,
      message: proximity.message,
    };
  }

  const nowIso = new Date().toISOString();
  const nowDate = new Date(nowIso);
  const studentName =
    studentInfo?.nama?.trim() ||
    users.find((u) => u.id === studentId)?.nama ||
    "Praktikan";
  const studentNim =
    studentInfo?.nim?.trim() ||
    users.find((u) => u.id === studentId)?.nim ||
    "—";

  // Perhitungan keterlambatan terhadap jam mulai + grace period (SRS 020)
  const gracePeriodMinutes = resolveGracePeriodMinutes(
    session.gracePeriodMinutes,
  );
  const lateness = computeLateness(
    nowDate,
    session.jamMulai,
    gracePeriodMinutes,
  );
  const latenessStatus = lateness.isLate ? "late" : "on_time";

  // Tulis ke subcollection attendance di Firestore (SRS 007, 014, 020)
  await setDoc(attendanceRef, {
    studentId,
    nama: studentName,
    nim: studentNim,
    sessionId,
    waktuHadir: serverTimestamp(),
    latitude: proximity.studentCoords.latitude,
    longitude: proximity.studentCoords.longitude,
    jarakMeter: proximity.distanceMeters,
    radiusMeter: proximity.labLocation.radius,
    attendanceStatus: "hadir",
    latenessStatus,
    lateMinutes: lateness.lateMinutes,
    fineId: null,
  });

  let fineId: string | null = null;
  if (lateness.isLate) {
    try {
      fineId = await createLateFine({
        session,
        studentId,
        nama: studentName,
        nim: studentNim,
        waktuHadir: nowDate,
        lateMinutes: lateness.lateMinutes,
        gracePeriodMinutes: lateness.gracePeriodMinutes,
      });
      await updateDoc(attendanceRef, { fineId });
    } catch (error) {
      console.warn("[sessionService] createLateFine error:", error);
      fineId = null;
    }
  }

  const attendance: Attendance = {
    id: `${sessionId}_${studentId}`,
    sessionId,
    studentId,
    waktuHadir: nowIso,
    latitude: proximity.studentCoords.latitude,
    longitude: proximity.studentCoords.longitude,
    jarakMeter: proximity.distanceMeters,
    radiusMeter: proximity.labLocation.radius,
    attendanceStatus: "hadir",
    latenessStatus,
    lateMinutes: lateness.lateMinutes,
    fineId,
  };

  const existingIdx = _attendances.findIndex(
    (a) => a.sessionId === sessionId && a.studentId === studentId,
  );
  if (existingIdx === -1) {
    _attendances.push(attendance);
  } else {
    _attendances[existingIdx] = attendance;
  }

  return { ok: true, attendance };
}

/** Reset store saat logout. */
export function resetSessionStore() {
  _sessions = [];
  _enrolledCountMap = {};
  _studentClassIds = new Set();
  _attendances = attendances.map((a) => ({ ...a }));
}
