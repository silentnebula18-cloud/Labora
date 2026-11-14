import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import { db } from "../lib/firebase";
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
} from "../types";

// ─── Tipe Input & Hasil ───────────────────────────────────────────────────────

export interface ScheduleInput {
  classId: string;
  nomorPraktikum: number;
  namaPraktikum: string;
  tanggal: string; // "YYYY-MM-DD"
  jamMulai: string; // "HH:mm"
  jamSelesai: string; // "HH:mm"
  ruang: string;
}

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

function mapSchedule(
  id: string,
  data: Record<string, unknown>,
): ScheduleRecord {
  return {
    id,
    classId: readString(data.classId),
    mataKuliah: readString(data.mataKuliah),
    kodeKelas: readString(data.kodeKelas),
    nomorPraktikum: readNumber(data.nomorPraktikum, 1),
    namaPraktikum: readString(data.namaPraktikum),
    tanggal: readString(data.tanggal),
    jamMulai: readString(data.jamMulai),
    jamSelesai: readString(data.jamSelesai),
    ruang: readString(data.ruang),
    assistants: readStringList(data.assistants),
    createdBy: readString(data.createdBy),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function mapSessionRecord(
  id: string,
  data: Record<string, unknown>,
): SessionRecord {
  const kodeKelas = readString(data.kodeKelas).trim().toUpperCase();
  return {
    id,
    scheduleId: readString(data.scheduleId) || id,
    classId: readString(data.classId),
    kodeKelas: kodeKelas || undefined,
    status: normalizeSessionStatus(data.status),
    openedAt: toDate(data.openedAt),
    closedAt: toDate(data.closedAt),
    openedBy: readNullableString(data.openedBy),
    closedBy: readNullableString(data.closedBy),
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
    assistantId: schedule.createdBy || schedule.assistants[0] || "",
    assistants: schedule.assistants,
    status: session?.status ?? "scheduled",
    openedAt: session?.openedAt ?? null,
    closedAt: session?.closedAt ?? null,
    openedBy: session?.openedBy ?? null,
    closedBy: session?.closedBy ?? null,
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

function updateLocalSessionsCache(items: SessionWithMeta[]) {
  const map = new Map<string, SessionWithMeta>();
  for (const existing of _sessions) {
    map.set(existing.id, existing);
  }
  for (const item of items) {
    map.set(item.id, item);
  }
  _sessions = Array.from(map.values());
}

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

function byJadwalAsc(a: SessionWithMeta, b: SessionWithMeta): number {
  if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
  return a.jamMulai.localeCompare(b.jamMulai);
}

function byJadwalDesc(a: SessionWithMeta, b: SessionWithMeta): number {
  if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
  return b.jamMulai.localeCompare(a.jamMulai);
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
  let classMemberIdsMap = new Map<string, string[]>();
  let usersByKelasCount = new Map<string, Set<string>>();

  function recalcAssistantEnrolledCounts(
    metaMap: Map<string, { mataKuliah: string; kodeKelas: string }>,
  ) {
    metaMap.forEach((meta, classId) => {
      const combinedUids = new Set<string>(
        classMemberIdsMap.get(classId) ?? [],
      );
      const kode = meta.kodeKelas.trim().toUpperCase();
      const fromKelas = usersByKelasCount.get(kode);
      if (fromKelas) {
        fromKelas.forEach((uid) => combinedUids.add(uid));
      }
      _enrolledCountMap[classId] = combinedUids.size;
    });
  }

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
      const nextMemberIdsMap = new Map<string, string[]>();

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const memberIds = readStringList(data.memberIds);
        nextMemberIdsMap.set(docSnap.id, memberIds);
        nextClassMeta.set(docSnap.id, {
          mataKuliah: readString(data.mataKuliah),
          kodeKelas: readString(data.kodeKelas),
        });
      });
      classMemberIdsMap = nextMemberIdsMap;
      classMetaMap = nextClassMeta;
      recalcAssistantEnrolledCounts(nextClassMeta);
      emit();
    },
    (error) => onError?.(error),
  );

  const usersPraktikanQuery = query(
    collection(db, "users"),
    where("roles", "array-contains", "praktikan"),
  );
  const unsubUsersPraktikan = onSnapshot(
    usersPraktikanQuery,
    (snapshot) => {
      const nextMap = new Map<string, Set<string>>();
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as Record<string, unknown>;
        const kode = readString(data.kelas).trim().toUpperCase();
        if (!kode) return;
        const uid = readString(data.uid) || docSnap.id;
        if (!nextMap.has(kode)) {
          nextMap.set(kode, new Set());
        }
        nextMap.get(kode)?.add(uid);
      });
      usersByKelasCount = nextMap;
      recalcAssistantEnrolledCounts(classMetaMap);
      emit();
    },
    () => {
      // Abaikan jika gagal memuat daftar user
    },
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
    unsubUsersPraktikan();
    unsubSchedules();
    sessionUnsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Pantau jadwal & sesi untuk praktikan berdasarkan kelas yang diikuti (`user.kelas` misal A1–E2, maupun `memberIds`).
 */
export function subscribeStudentSchedulesWithSessions(
  studentId: string,
  onData: Listener<SessionWithMeta[]>,
  onError?: ErrorListener,
  studentKelas?: string,
) {
  let schedulesByClassMap = new Map<string, ScheduleRecord>();
  let schedulesByKodeMap = new Map<string, ScheduleRecord>();
  let sessionsBySchedule = new Map<string, SessionRecord>();
  let classMetaByMember = new Map<
    string,
    { mataKuliah: string; kodeKelas: string }
  >();
  let classMetaByKode = new Map<
    string,
    { mataKuliah: string; kodeKelas: string }
  >();
  let innerUnsubscribers: (() => void)[] = [];
  let activeClassIdsKey: string | null = null;

  const normalizedKelas = studentKelas?.trim().toUpperCase() || "";

  function getMergedClassMeta() {
    const merged = new Map<string, { mataKuliah: string; kodeKelas: string }>();
    classMetaByMember.forEach((val, key) => merged.set(key, val));
    classMetaByKode.forEach((val, key) => merged.set(key, val));
    return merged;
  }

  function getMergedSchedules() {
    const merged = new Map<string, ScheduleRecord>();
    schedulesByClassMap.forEach((val, key) => merged.set(key, val));
    schedulesByKodeMap.forEach((val, key) => merged.set(key, val));
    return merged;
  }

  function emit() {
    const classMetaMap = getMergedClassMeta();
    const allSchedules = getMergedSchedules();
    const combined: SessionWithMeta[] = [];

    allSchedules.forEach((sched) => {
      const sess = sessionsBySchedule.get(sched.id);
      const classMeta = classMetaMap.get(sched.classId);
      combined.push(combineScheduleAndSession(sched, sess, classMeta));
    });
    combined.sort(byJadwalAsc);
    updateLocalSessionsCache(combined);
    onData(combined);
  }

  function syncClassSubscriptions() {
    const classMetaMap = getMergedClassMeta();
    const classIdsSet = new Set<string>(classMetaMap.keys());
    schedulesByKodeMap.forEach((sched) => {
      if (sched.classId) classIdsSet.add(sched.classId);
    });

    const classIds = Array.from(classIdsSet);
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

  // 1. Pantau kelas di mana memberIds memuat studentId
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

  // 2. Jika praktikan memiliki kode kelas (misal A1), pantau kelas & jadwal dengan kodeKelas == studentKelas
  let unsubKodeClasses: (() => void) | null = null;
  let unsubKodeSchedules: (() => void) | null = null;

  if (normalizedKelas) {
    const kodeClassesQuery = query(
      collection(db, "classes"),
      where("kodeKelas", "==", normalizedKelas),
    );
    unsubKodeClasses = onSnapshot(
      kodeClassesQuery,
      (snapshot) => {
        const nextMeta = new Map<
          string,
          { mataKuliah: string; kodeKelas: string }
        >();
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Record<string, unknown>;
          const memberIds = readStringList(data.memberIds);
          if (typeof _enrolledCountMap[docSnap.id] !== "number") {
            _enrolledCountMap[docSnap.id] = memberIds.length;
          }
          nextMeta.set(docSnap.id, {
            mataKuliah: readString(data.mataKuliah),
            kodeKelas: readString(data.kodeKelas),
          });
        });

        classMetaByKode = nextMeta;
        syncClassSubscriptions();
        emit();
      },
      (error) => onError?.(error),
    );

    const kodeSchedulesQuery = query(
      collection(db, "schedules"),
      where("kodeKelas", "==", normalizedKelas),
    );
    unsubKodeSchedules = onSnapshot(
      kodeSchedulesQuery,
      (snapshot) => {
        const nextSchedMap = new Map<string, ScheduleRecord>();
        snapshot.docs.forEach((docSnap) => {
          const sched = mapSchedule(
            docSnap.id,
            docSnap.data() as Record<string, unknown>,
          );
          nextSchedMap.set(sched.id, sched);
        });
        schedulesByKodeMap = nextSchedMap;
        syncClassSubscriptions();
        emit();
      },
      (error) => onError?.(error),
    );
  }

  return () => {
    unsubMemberClasses();
    unsubKodeClasses?.();
    unsubKodeSchedules?.();
    innerUnsubscribers.forEach((unsub) => unsub());
  };
}

// ─── Operasi CRUD Jadwal & Status Sesi (SRS 006) ──────────────────────────────

/**
 * Buat jadwal baru di `schedules/{id}` beserta dokumen sesi di `sessions/{id}`.
 */
export async function createScheduleAndSession(
  assistantUid: string,
  kelas: ClassRecord,
  input: ScheduleInput,
): Promise<string> {
  const scheduleRef = doc(collection(db, "schedules"));
  const sessionRef = doc(db, "sessions", scheduleRef.id);

  const batch = writeBatch(db);

  batch.set(scheduleRef, {
    classId: kelas.id,
    mataKuliah: kelas.mataKuliah.trim(),
    kodeKelas: kelas.kodeKelas.trim().toUpperCase(),
    nomorPraktikum: Number(input.nomorPraktikum),
    namaPraktikum: input.namaPraktikum.trim(),
    tanggal: input.tanggal.trim(),
    jamMulai: input.jamMulai.trim(),
    jamSelesai: input.jamSelesai.trim(),
    ruang: input.ruang.trim(),
    assistants: kelas.assistants,
    createdBy: assistantUid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(sessionRef, {
    scheduleId: scheduleRef.id,
    classId: kelas.id,
    kodeKelas: kelas.kodeKelas.trim().toUpperCase(),
    status: "scheduled",
    openedAt: null,
    closedAt: null,
    openedBy: null,
    closedBy: null,
    updatedBy: assistantUid,
    updatedAt: serverTimestamp(),
  });

  await batch.commit();
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

  const batch = writeBatch(db);

  batch.update(scheduleRef, {
    classId: kelas.id,
    mataKuliah: kelas.mataKuliah.trim(),
    kodeKelas: kelas.kodeKelas.trim().toUpperCase(),
    nomorPraktikum: Number(input.nomorPraktikum),
    namaPraktikum: input.namaPraktikum.trim(),
    tanggal: input.tanggal.trim(),
    jamMulai: input.jamMulai.trim(),
    jamSelesai: input.jamSelesai.trim(),
    ruang: input.ruang.trim(),
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
 * Jika sebelumnya berstatus closed, closedAt dan closedBy dibersihkan.
 */
export async function openSessionInFirestore(
  sessionId: string,
  assistantUid: string,
): Promise<void> {
  await setDoc(
    doc(db, "sessions", sessionId),
    {
      status: "open",
      openedAt: serverTimestamp(),
      openedBy: assistantUid,
      closedAt: null,
      closedBy: null,
      updatedBy: assistantUid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * Periksa apakah rentang waktu jadwal sesi telah berakhir.
 * Membandingkan tanggal (YYYY-MM-DD) dan jamSelesai (HH:mm) dengan waktu saat ini.
 */
export function isScheduleExpired(
  tanggal?: string,
  jamSelesai?: string,
  currentEpoch: number = Date.now(),
): boolean {
  if (!tanggal || !jamSelesai) return false;
  try {
    const [year, month, day] = tanggal.split("-").map(Number);
    const [hours, minutes] = jamSelesai.split(":").map(Number);
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
    .sort(byJadwalDesc);
}

/** Ambil semua sesi dari kelas yang diikuti praktikan dari cache. */
export function getSessionsByStudent(studentId: string): SessionWithMeta[] {
  const mockClassIds = enrollments
    .filter((e) => e.studentId === studentId)
    .map((e) => e.classId);
  const classIds = new Set([..._studentClassIds, ...mockClassIds]);

  return _sessions.filter((s) => classIds.has(s.classId)).sort(byJadwalAsc);
}

/** Ambil satu sesi lengkap berdasarkan id. */
export function getSessionById(sessionId: string): SessionWithMeta | null {
  const found = _sessions.find(
    (s) => s.id === sessionId || s.scheduleId === sessionId,
  );
  if (found) return found;

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

        // Update cache lokal juga
        const existingIdx = _attendances.findIndex(
          (a) => a.sessionId === sessionId && a.studentId === studentId,
        );
        const attRecord: Attendance = {
          id: docSnap.id,
          sessionId,
          studentId,
          waktuHadir,
        };
        if (existingIdx === -1) {
          _attendances.push(attRecord);
        } else {
          _attendances[existingIdx] = attRecord;
        }

        return {
          id: docSnap.id,
          sessionId,
          studentId,
          waktuHadir,
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

      const record: Attendance = {
        id: docSnap.id,
        sessionId,
        studentId,
        waktuHadir,
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
      message:
        "Waktu praktikum telah berakhir (melewati jam selesai). Presensi tidak dapat dilakukan.",
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

  const nowIso = new Date().toISOString();
  const studentName =
    studentInfo?.nama?.trim() ||
    users.find((u) => u.id === studentId)?.nama ||
    "Praktikan";
  const studentNim =
    studentInfo?.nim?.trim() ||
    users.find((u) => u.id === studentId)?.nim ||
    "—";

  // Tulis ke subcollection attendance di Firestore (SRS 007)
  await setDoc(attendanceRef, {
    studentId,
    nama: studentName,
    nim: studentNim,
    sessionId,
    waktuHadir: serverTimestamp(),
  });

  const attendance: Attendance = {
    id: studentId,
    sessionId,
    studentId,
    waktuHadir: nowIso,
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
