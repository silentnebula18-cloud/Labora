import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "@react-native-firebase/firestore";

import { db } from "../lib/firebase";
import type { Laboratory } from "../types";
import { isSameLaboratoryRoom } from "../utils/laboratory";

export const LABORATORY_LIMITS = {
  namaMax: 100,
  deskripsiMax: 500,
  alamatMax: 200,
  radiusMin: 5,
  radiusMax: 10000,
} as const;

export interface LaboratoryInput {
  nama: string;
  deskripsi: string;
  alamat: string;
  latitude: number;
  longitude: number;
  radius: number;
  aktif: boolean;
}

/** Nilai mentah dari form (masih berupa string). */
export interface LaboratoryDraft {
  nama: string;
  deskripsi: string;
  alamat: string;
  latitude: string;
  longitude: string;
  radius: string;
  aktif: boolean;
}

export interface LaboratoryFieldErrors {
  nama?: string;
  deskripsi?: string;
  alamat?: string;
  latitude?: string;
  longitude?: string;
  radius?: string;
}

export interface LaboratoryValidationResult {
  valid: boolean;
  errors: LaboratoryFieldErrors;
  input: LaboratoryInput | null;
}

type Listener<T> = (items: T) => void;
type ErrorListener = (error: unknown) => void;

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  if (value instanceof Date) return value;
  return null;
}

function toFiniteNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function mapLaboratory(
  id: string,
  data: Record<string, unknown>,
): Laboratory {
  return {
    id,
    // Kompatibilitas dengan dokumen lama yang menyimpan nama ruang di `ruang`.
    nama: readString(data.nama) || readString(data.ruang),
    deskripsi: readString(data.deskripsi),
    alamat: readString(data.alamat),
    latitude: toFiniteNumber(data.latitude),
    longitude: toFiniteNumber(data.longitude),
    radius: toFiniteNumber(data.radius),
    // Dokumen lama tanpa `aktif` dianggap aktif.
    aktif: data.aktif !== false,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    updatedBy: readNullableString(data.updatedBy),
  };
}

function sortLaboratories(items: Laboratory[]): Laboratory[] {
  return items.sort((a, b) => {
    if (a.aktif !== b.aktif) return a.aktif ? -1 : 1;
    return a.nama.localeCompare(b.nama, "id", { sensitivity: "base" });
  });
}

function parseDraftNumber(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return NaN;
  return Number(normalized);
}

/**
 * Validasi data form laboratorium: nama/alamat wajib, koordinat dalam rentang
 * yang valid, dan radius presensi dalam meter.
 */
export function validateLaboratoryDraft(
  draft: LaboratoryDraft,
): LaboratoryValidationResult {
  const errors: LaboratoryFieldErrors = {};

  const nama = draft.nama.trim();
  const deskripsi = draft.deskripsi.trim();
  const alamat = draft.alamat.trim();
  const latitude = parseDraftNumber(draft.latitude);
  const longitude = parseDraftNumber(draft.longitude);
  const radius = parseDraftNumber(draft.radius);

  if (!nama) {
    errors.nama = "Nama laboratorium wajib diisi";
  } else if (nama.length > LABORATORY_LIMITS.namaMax) {
    errors.nama = `Nama maksimal ${LABORATORY_LIMITS.namaMax} karakter`;
  }

  if (deskripsi.length > LABORATORY_LIMITS.deskripsiMax) {
    errors.deskripsi = `Deskripsi maksimal ${LABORATORY_LIMITS.deskripsiMax} karakter`;
  }

  if (!alamat) {
    errors.alamat = "Alamat wajib diisi";
  } else if (alamat.length > LABORATORY_LIMITS.alamatMax) {
    errors.alamat = `Alamat maksimal ${LABORATORY_LIMITS.alamatMax} karakter`;
  }

  if (!Number.isFinite(latitude)) {
    errors.latitude = "Latitude wajib berupa angka";
  } else if (latitude < -90 || latitude > 90) {
    errors.latitude = "Latitude harus berada di antara -90 dan 90";
  }

  if (!Number.isFinite(longitude)) {
    errors.longitude = "Longitude wajib berupa angka";
  } else if (longitude < -180 || longitude > 180) {
    errors.longitude = "Longitude harus berada di antara -180 dan 180";
  }

  if (!Number.isFinite(radius)) {
    errors.radius = "Radius wajib berupa angka";
  } else if (radius < LABORATORY_LIMITS.radiusMin) {
    errors.radius = `Radius minimal ${LABORATORY_LIMITS.radiusMin} meter`;
  } else if (radius > LABORATORY_LIMITS.radiusMax) {
    errors.radius = `Radius maksimal ${LABORATORY_LIMITS.radiusMax} meter`;
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    input: valid
      ? {
          nama,
          deskripsi,
          alamat,
          latitude,
          longitude,
          radius: Math.round(radius),
          aktif: draft.aktif,
        }
      : null,
  };
}

function validateLaboratoryInput(input: LaboratoryInput): LaboratoryInput {
  const result = validateLaboratoryDraft({
    nama: input.nama,
    deskripsi: input.deskripsi,
    alamat: input.alamat,
    latitude: String(input.latitude),
    longitude: String(input.longitude),
    radius: String(input.radius),
    aktif: input.aktif,
  });

  if (!result.input) {
    const firstError = Object.values(result.errors)[0];
    throw new Error(firstError ?? "Data laboratorium tidak valid");
  }

  return result.input;
}

/** Pantau seluruh laboratorium secara real-time (untuk pengelolaan asisten). */
export function subscribeLaboratories(
  onData: Listener<Laboratory[]>,
  onError?: ErrorListener,
) {
  return onSnapshot(
    collection(db, "laboratories"),
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) =>
        mapLaboratory(docSnap.id, docSnap.data() as Record<string, unknown>),
      );
      onData(sortLaboratories(items));
    },
    (error) => onError?.(error),
  );
}

/** Pantau satu laboratorium secara real-time. */
export function subscribeLaboratory(
  laboratoryId: string,
  onData: (item: Laboratory | null) => void,
  onError?: ErrorListener,
) {
  return onSnapshot(
    doc(db, "laboratories", laboratoryId),
    (docSnap) => {
      onData(
        docSnap.exists()
          ? mapLaboratory(
              docSnap.id,
              docSnap.data() as Record<string, unknown>,
            )
          : null,
      );
    },
    (error) => onError?.(error),
  );
}

export async function getLaboratoryById(
  laboratoryId: string,
): Promise<Laboratory | null> {
  const snap = await getDoc(doc(db, "laboratories", laboratoryId));
  if (!snap.exists()) return null;
  return mapLaboratory(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Cari laboratorium aktif berdasarkan nama ruang. Digunakan oleh validasi
 * presensi (SRS-014) agar koordinat & radius selalu berasal dari Firestore.
 */
export async function findActiveLaboratoryByRoom(
  ruang?: string,
): Promise<Laboratory | null> {
  const target = (ruang ?? "").trim();
  if (!target) return null;

  const snapshot = await getDocs(collection(db, "laboratories"));
  for (const docSnap of snapshot.docs) {
    const lab = mapLaboratory(
      docSnap.id,
      docSnap.data() as Record<string, unknown>,
    );
    if (!lab.aktif) continue;
    if (
      !Number.isFinite(lab.latitude) ||
      !Number.isFinite(lab.longitude) ||
      !Number.isFinite(lab.radius) ||
      lab.radius <= 0
    ) {
      continue;
    }
    if (isSameLaboratoryRoom(lab.nama, target)) return lab;
  }

  return null;
}

export async function createLaboratory(
  updatedBy: string,
  input: LaboratoryInput,
): Promise<string> {
  const valid = validateLaboratoryInput(input);
  const reference = await addDoc(collection(db, "laboratories"), {
    nama: valid.nama,
    deskripsi: valid.deskripsi,
    alamat: valid.alamat,
    latitude: valid.latitude,
    longitude: valid.longitude,
    radius: valid.radius,
    aktif: valid.aktif,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy,
  });
  return reference.id;
}

export async function updateLaboratory(
  updatedBy: string,
  laboratoryId: string,
  input: LaboratoryInput,
): Promise<void> {
  const valid = validateLaboratoryInput(input);
  await updateDoc(doc(db, "laboratories", laboratoryId), {
    nama: valid.nama,
    deskripsi: valid.deskripsi,
    alamat: valid.alamat,
    latitude: valid.latitude,
    longitude: valid.longitude,
    radius: valid.radius,
    aktif: valid.aktif,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export async function deleteLaboratory(laboratoryId: string): Promise<void> {
  await deleteDoc(doc(db, "laboratories", laboratoryId));
}

export async function toggleLaboratoryActive(
  updatedBy: string,
  laboratoryId: string,
  aktif: boolean,
): Promise<void> {
  await updateDoc(doc(db, "laboratories", laboratoryId), {
    aktif,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
}

export function describeFirestoreError(error: unknown): string {
  const code =
    typeof (error as { code?: unknown })?.code === "string"
      ? (error as { code: string }).code
      : "";

  if (code.includes("permission-denied")) {
    return "Akses ditolak: Hanya asisten yang berhak mengelola laboratorium";
  }
  if (
    code.includes("unavailable") ||
    code.includes("network-request-failed") ||
    code.includes("failed-precondition")
  ) {
    return "Koneksi bermasalah: Periksa koneksi internet Anda";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Terjadi kesalahan saat menyimpan data laboratorium";
}
