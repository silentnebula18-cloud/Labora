import type { SessionWithMeta } from "../services/sessionService";
import type { Laboratory } from "../types";
import { isSameLaboratoryRoom } from "./laboratory";

export interface LaboratoryActivities {
  /** Sesi yang sedang berlangsung saat ini (berdasarkan tanggal & jam). */
  ongoing: SessionWithMeta[];
  /** Sesi berikutnya yang belum dimulai, terdekat lebih dulu. */
  upcoming: SessionWithMeta[];
}

function startTime(session: SessionWithMeta): number {
  return session.jamMulai.getTime();
}

function endTime(session: SessionWithMeta): number {
  return session.jamSelesai.getTime();
}

/**
 * Hitung aktivitas praktikum pada satu laboratorium berdasarkan data jadwal
 * aktual (bukan data statis). Status sesi "closed" tidak dianggap aktif,
 * tetapi sesi "scheduled"/"open" tetap dihitung sesuai rentang waktunya.
 */
export function getLaboratoryActivities(
  laboratory: Pick<Laboratory, "nama"> | string,
  sessions: SessionWithMeta[],
  now: number = Date.now(),
): LaboratoryActivities {
  const nama = typeof laboratory === "string" ? laboratory : laboratory.nama;

  const roomSessions = sessions.filter((session) =>
    isSameLaboratoryRoom(session.ruang, nama),
  );

  const ongoing = roomSessions
    .filter(
      (session) =>
        session.status !== "closed" &&
        startTime(session) <= now &&
        endTime(session) >= now,
    )
    .sort((a, b) => startTime(a) - startTime(b));

  const upcoming = roomSessions
    .filter((session) => session.status !== "closed" && startTime(session) > now)
    .sort((a, b) => startTime(a) - startTime(b));

  return { ongoing, upcoming };
}

/** Format singkat rentang waktu sesi, mis. "08.00–10.00 WIB". */
export function formatSessionTimeRange(session: SessionWithMeta): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const start = `${pad(session.jamMulai.getHours())}.${pad(
    session.jamMulai.getMinutes(),
  )}`;
  const end = `${pad(session.jamSelesai.getHours())}.${pad(
    session.jamSelesai.getMinutes(),
  )}`;
  return `${start}–${end} WIB`;
}
