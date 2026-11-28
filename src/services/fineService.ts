import {
  doc,
  runTransaction,
  serverTimestamp,
} from "@react-native-firebase/firestore";

import { db } from "../lib/firebase";
import type { FineRecord, FineStatus } from "../types";
import type { SessionWithMeta } from "./sessionService";

export const FINE_DEFAULTS = {
  gracePeriodMinutes: 15,
  fineAmount: 10000,
} as const;

export interface LatenessResult {
  /** Selisih menit antara waktu presensi dan jam mulai sesi (minimal 0). */
  lateMinutes: number;
  /** True bila keterlambatan melewati grace period. */
  isLate: boolean;
  gracePeriodMinutes: number;
}

export function resolveGracePeriodMinutes(value?: number | null): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  return FINE_DEFAULTS.gracePeriodMinutes;
}

export function resolveFineAmount(value?: number | null): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return FINE_DEFAULTS.fineAmount;
}

/**
 * Hitung keterlambatan praktikan terhadap jam mulai sesi (SRS 020).
 * Denda hanya berlaku bila `lateMinutes` melewati `gracePeriodMinutes`.
 */
export function computeLateness(
  waktuHadir: Date,
  jamMulai: Date,
  gracePeriodMinutes: number = FINE_DEFAULTS.gracePeriodMinutes,
): LatenessResult {
  const grace = resolveGracePeriodMinutes(gracePeriodMinutes);
  const diffMs = waktuHadir.getTime() - jamMulai.getTime();
  const lateMinutes = diffMs > 0 ? Math.floor(diffMs / 60000) : 0;
  return {
    lateMinutes,
    isLate: lateMinutes > grace,
    gracePeriodMinutes: grace,
  };
}

export function fineDocumentId(sessionId: string, studentId: string): string {
  return `${sessionId}_${studentId}`;
}

export function fineRef(sessionId: string, studentId: string) {
  return doc(db, "fines", fineDocumentId(sessionId, studentId));
}

export function mapFine(id: string, data: Record<string, unknown>): FineRecord {
  const readString = (value: unknown) =>
    typeof value === "string" ? value : "";
  const readNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  const toDate = (value: unknown): Date | null => {
    if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
      return (value as { toDate: () => Date }).toDate();
    }
    return null;
  };
  const status = readString(data.status);

  return {
    fineId: readString(data.fineId) || id,
    studentId: readString(data.studentId),
    nama: readString(data.nama),
    nim: readString(data.nim),
    sessionId: readString(data.sessionId),
    classId: readString(data.classId),
    kodeKelas: readString(data.kodeKelas),
    mataKuliah: readString(data.mataKuliah),
    nomorPraktikum: readNumber(data.nomorPraktikum),
    namaPraktikum: readString(data.namaPraktikum),
    ruang: readString(data.ruang),
    labId: readString(data.labId),
    waktuHadir: toDate(data.waktuHadir),
    lateMinutes: readNumber(data.lateMinutes),
    gracePeriodMinutes: readNumber(data.gracePeriodMinutes),
    nominal: readNumber(data.nominal),
    status: (["unpaid", "pending", "paid", "failed"].includes(status)
      ? status
      : "unpaid") as FineStatus,
    latestOrderId: readString(data.latestOrderId) || null,
    paidAt: toDate(data.paidAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

export interface CreateLateFineParams {
  session: SessionWithMeta;
  studentId: string;
  nama: string;
  nim: string;
  waktuHadir: Date;
  lateMinutes: number;
  gracePeriodMinutes: number;
}

/**
 * Buat tagihan denda keterlambatan dengan ID deterministik
 * `fines/{sessionId}_{studentId}` sehingga maksimal satu denda per sesi/praktikan.
 * Denda yang sudah lunas tidak akan ditimpa.
 */
export async function createLateFine(
  params: CreateLateFineParams,
): Promise<string> {
  const {
    session,
    studentId,
    nama,
    nim,
    waktuHadir,
    lateMinutes,
    gracePeriodMinutes,
  } = params;
  const id = fineDocumentId(session.id, studentId);
  const nominal = resolveFineAmount(session.fineAmount);
  const reference = doc(db, "fines", id);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists()) return;

    transaction.set(reference, {
      fineId: id,
      studentId,
      nama,
      nim,
      sessionId: session.id,
      classId: session.classId,
      kodeKelas: session.kelas.namaKelas,
      mataKuliah: session.practicum.mataKuliah,
      nomorPraktikum: session.practicum.nomorPraktikum,
      namaPraktikum: session.practicum.namaPraktikum,
      ruang: session.ruang,
      labId: session.labId ?? "",
      waktuHadir,
      lateMinutes,
      gracePeriodMinutes,
      nominal,
      status: "unpaid",
      latestOrderId: null,
      paidAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return id;
}
