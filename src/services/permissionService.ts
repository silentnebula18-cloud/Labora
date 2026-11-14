import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "@react-native-firebase/firestore";

import { db } from "../lib/firebase";
import type { PermissionRecord, PermissionStatus } from "../types";
import { analyzeSentiment, type SentimentLabel } from "./aiService";

export interface CreatePermissionInput {
  uid: string;
  nama: string;
  nim: string;
  classId: string;
  sessionId: string;
  mataKuliah: string;
  namaPraktikum: string;
  nomorPraktikum: number;
  alasan: string;
}

type Listener<T> = (items: T) => void;
type ErrorListener = (error: unknown) => void;

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

function toDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  return null;
}

function isPermissionStatus(value: unknown): value is PermissionStatus {
  return value === "pending" || value === "approved" || value === "rejected";
}

function isAiCategory(value: unknown): value is SentimentLabel {
  return value === "positif" || value === "netral" || value === "negatif";
}

function mapPermissionRecord(
  id: string,
  data: Record<string, unknown>,
): PermissionRecord {
  return {
    id,
    uid: readString(data.uid),
    nama: readString(data.nama),
    nim: readString(data.nim),
    classId: readString(data.classId),
    sessionId: readString(data.sessionId),
    mataKuliah: readString(data.mataKuliah) || undefined,
    namaPraktikum: readString(data.namaPraktikum) || undefined,
    nomorPraktikum: data.nomorPraktikum ? readNumber(data.nomorPraktikum) : undefined,
    alasan: readString(data.alasan),
    status: isPermissionStatus(data.status) ? data.status : "pending",
    aiStatus: data.aiStatus === "success" ? "success" : "failed",
    aiCategory: isAiCategory(data.aiCategory) ? data.aiCategory : null,
    aiConfidence: typeof data.aiConfidence === "number" ? data.aiConfidence : null,
    aiProcessedAt: toDate(data.aiProcessedAt),
    decidedBy: readNullableString(data.decidedBy),
    decidedAt: toDate(data.decidedAt),
    createdAt: toDate(data.createdAt),
  };
}

/**
 * Mengirim pengajuan izin praktikan dan mengintegrasikan hasil klasifikasi AI (SRS 009 & SRS 010).
 * Jika proses AI gagal, pengajuan tetap berhasil disimpan ke Firestore.
 */
export async function submitPermissionRequest(
  input: CreatePermissionInput,
): Promise<{ id: string; record: PermissionRecord }> {
  const trimmedAlasan = input.alasan.trim();
  if (!trimmedAlasan) {
    throw new Error("Alasan ketidakhadiran tidak boleh kosong.");
  }

  // 1. Jalankan klasifikasi model AI (SRS 010)
  let aiResult = analyzeSentiment(trimmedAlasan);

  // Fallback pengaman jika terjadi exception tak terduga pada AI
  if (!aiResult) {
    aiResult = {
      status: "failed",
      label: null,
      confidence: null,
      note: "Gagal menjalankan analisis AI.",
      processedAt: new Date(),
    };
  }

  // 2. Simpan pengajuan ke collection "permissionRequests" di Firestore (SRS 009)
  const docRef = await addDoc(collection(db, "permissionRequests"), {
    uid: input.uid,
    nama: input.nama,
    nim: input.nim,
    classId: input.classId,
    sessionId: input.sessionId,
    mataKuliah: input.mataKuliah,
    namaPraktikum: input.namaPraktikum,
    nomorPraktikum: input.nomorPraktikum,
    alasan: trimmedAlasan,
    status: "pending",
    aiStatus: aiResult.status,
    aiCategory: aiResult.label,
    aiConfidence: aiResult.confidence,
    aiProcessedAt: serverTimestamp(),
    decidedBy: null,
    decidedAt: null,
    createdAt: serverTimestamp(),
  });

  const record: PermissionRecord = {
    id: docRef.id,
    uid: input.uid,
    nama: input.nama,
    nim: input.nim,
    classId: input.classId,
    sessionId: input.sessionId,
    mataKuliah: input.mataKuliah,
    namaPraktikum: input.namaPraktikum,
    nomorPraktikum: input.nomorPraktikum,
    alasan: trimmedAlasan,
    status: "pending",
    aiStatus: aiResult.status,
    aiCategory: aiResult.label,
    aiConfidence: aiResult.confidence,
    aiProcessedAt: aiResult.processedAt,
    decidedBy: null,
    decidedAt: null,
    createdAt: new Date(),
  };

  return { id: docRef.id, record };
}

/**
 * Pantau riwayat pengajuan izin milik praktikan secara real-time (SRS 009).
 */
export function subscribeStudentPermissions(
  studentUid: string,
  onData: Listener<PermissionRecord[]>,
  onError?: ErrorListener,
) {
  const permissionsQuery = query(
    collection(db, "permissionRequests"),
    where("uid", "==", studentUid),
  );

  return onSnapshot(
    permissionsQuery,
    (snapshot) => {
      const records = snapshot.docs.map((docSnap) =>
        mapPermissionRecord(docSnap.id, docSnap.data() as Record<string, unknown>),
      );
      // Urutkan pengajuan terbaru di atas
      records.sort((a, b) => {
        const timeA = a.createdAt?.getTime() ?? 0;
        const timeB = b.createdAt?.getTime() ?? 0;
        return timeB - timeA;
      });
      onData(records);
    },
    (error) => onError?.(error),
  );
}

/**
 * Cek apakah praktikan sudah pernah mengajukan izin untuk sesi ini.
 */
export async function getExistingPermission(
  studentUid: string,
  sessionId: string,
): Promise<PermissionRecord | null> {
  const q = query(
    collection(db, "permissionRequests"),
    where("uid", "==", studentUid),
    where("sessionId", "==", sessionId),
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  return mapPermissionRecord(docSnap.id, docSnap.data() as Record<string, unknown>);
}
