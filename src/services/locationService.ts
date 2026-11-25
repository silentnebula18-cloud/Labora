import * as Location from "expo-location";
import { Linking, Platform } from "react-native";

import type { LabLocation } from "../types";
import { findActiveLaboratoryByRoom } from "./laboratoryService";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type LocationErrorCode =
  | "LAB_TIDAK_DITEMUKAN"
  | "IZIN_LOKASI_DITOLAK"
  | "GPS_TIDAK_AKTIF"
  | "LOKASI_GAGAL"
  | "DI_LUAR_RADIUS";

export type LocationValidationResult =
  | {
      ok: true;
      studentCoords: Coordinates;
      labLocation: LabLocation;
      distanceMeters: number;
    }
  | {
      ok: false;
      code: LocationErrorCode;
      message: string;
      studentCoords?: Coordinates;
      labLocation?: LabLocation;
      distanceMeters?: number;
    };

export interface LocationErrorDetail {
  code: LocationErrorCode;
  title: string;
  guide: string;
  actionType: "open_settings" | "enable_gps" | "retry" | "none";
  actionLabel?: string;
}

/**
 * Mendapatkan detail panduan penanganan kesalahan perangkat (SRS-018).
 */
export function getLocationErrorDetail(
  code: LocationErrorCode,
): LocationErrorDetail {
  switch (code) {
    case "IZIN_LOKASI_DITOLAK":
      return {
        code,
        title: "Izin Akses Lokasi Ditolak",
        guide:
          "Labora memerlukan izin lokasi agar Anda dapat memvalidasi kehadiran di ruangan laboratorium.",
        actionType: "open_settings",
        actionLabel: "Buka Pengaturan HP",
      };
    case "GPS_TIDAK_AKTIF":
      return {
        code,
        title: "GPS Perangkat Tidak Aktif",
        guide:
          "Layanan lokasi/GPS di HP Anda sedang nonaktif. Mohon nyalakan GPS untuk melanjutkan presensi.",
        actionType: "enable_gps",
        actionLabel: "Nyalakan GPS",
      };
    case "LOKASI_GAGAL":
      return {
        code,
        title: "Gagal Mengambil Titik Koordinat",
        guide:
          "Sinyal satelit GPS lemah atau perangkat berada di ruang tertutup. Pastikan tidak dalam mode hemat daya ekstrem lalu coba lagi.",
        actionType: "retry",
        actionLabel: "Coba Lagi",
      };
    case "DI_LUAR_RADIUS":
      return {
        code,
        title: "Berada di Luar Radius Laboratorium",
        guide:
          "Pastikan Anda telah berada di dalam atau dekat dengan ruangan laboratorium yang ditentukan.",
        actionType: "retry",
        actionLabel: "Periksa Ulang Jarak",
      };
    case "LAB_TIDAK_DITEMUKAN":
    default:
      return {
        code,
        title: "Data Laboratorium Tidak Ditemukan",
        guide:
          "Koordinat ruangan praktikum ini belum didaftarkan di sistem oleh asisten praktikum.",
        actionType: "none",
      };
  }
}

/**
 * Buka pengaturan aplikasi di perangkat untuk mengaktifkan izin lokasi (SRS-018).
 */
export async function openLocationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (err) {
    console.warn("Gagal membuka pengaturan aplikasi:", err);
  }
}

/**
 * Memicu dialog sistem Android untuk mengaktifkan GPS / High Accuracy Location (SRS-018).
 */
export async function promptEnableLocationServices(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Location.enableNetworkProviderAsync();
      return true;
    }
    await openLocationSettings();
    return false;
  } catch (err) {
    console.warn("User menolak mengaktifkan GPS lewat dialog:", err);
    return false;
  }
}

/**
 * Konversi derajat ke radian (acuan SilverSky Technology Medium Guide).
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Menghitung jarak garis lurus antara dua koordinat GPS menggunakan Formula Haversine.
 * Mengembalikan jarak dalam satuan meter (dibulatkan ke bilangan bulat terdekat).
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const EARTH_RADIUS_METERS = 6371000; // 6.371 km dalam meter
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceMeters = EARTH_RADIUS_METERS * c;

  return Math.round(distanceMeters);
}

/**
 * Ambil data lokasi & radius laboratorium langsung dari koleksi `laboratories` di Firestore
 * berdasarkan nama ruang sesi (`session.ruang`).
 * Menggunakan pencocokan cerdas via `findActiveLaboratoryByRoom` (SRS-014 & SRS-015).
 * Mengembalikan `null` jika dokumen laboratorium belum tersedia di Firestore.
 */
export async function getLabLocationByRoom(
  ruang?: string,
): Promise<LabLocation | null> {
  try {
    return await findActiveLaboratoryByRoom(ruang);
  } catch {
    return null;
  }
}

/**
 * Minta izin lokasi foreground, cek status GPS perangkat, dan ambil koordinat saat ini.
 */
export async function getStudentCurrentCoordinates(): Promise<
  | { ok: true; coords: Coordinates }
  | {
      ok: false;
      code: "IZIN_LOKASI_DITOLAK" | "GPS_TIDAK_AKTIF" | "LOKASI_GAGAL";
      message: string;
    }
> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") {
      return {
        ok: false,
        code: "IZIN_LOKASI_DITOLAK",
        message: "Izin akses lokasi ditolak",
      };
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        ok: false,
        code: "GPS_TIDAK_AKTIF",
        message: "GPS perangkat tidak aktif",
      };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      ok: true,
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch {
    return {
      ok: false,
      code: "LOKASI_GAGAL",
      message: "Gagal mendapatkan lokasi perangkat",
    };
  }
}

/**
 * Validasi posisi perangkat praktikan terhadap koordinat & radius laboratorium di Firestore (SRS-014).
 */
export async function validateStudentLabProximity(
  ruang?: string,
): Promise<LocationValidationResult> {
  const [labLocation, coordsResult] = await Promise.all([
    getLabLocationByRoom(ruang),
    getStudentCurrentCoordinates(),
  ]);

  if (!labLocation) {
    return {
      ok: false,
      code: "LAB_TIDAK_DITEMUKAN",
      message: "Data lokasi laboratorium belum tersedia",
    };
  }

  if (!coordsResult.ok) {
    return {
      ok: false,
      code: coordsResult.code,
      message: coordsResult.message,
      labLocation,
    };
  }

  const distanceMeters = calculateHaversineDistanceMeters(
    coordsResult.coords.latitude,
    coordsResult.coords.longitude,
    labLocation.latitude,
    labLocation.longitude,
  );

  if (distanceMeters > labLocation.radius) {
    return {
      ok: false,
      code: "DI_LUAR_RADIUS",
      message: "Lokasi di luar radius laboratorium",
      studentCoords: coordsResult.coords,
      labLocation,
      distanceMeters,
    };
  }

  return {
    ok: true,
    studentCoords: coordsResult.coords,
    labLocation,
    distanceMeters,
  };
}
