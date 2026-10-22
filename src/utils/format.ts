const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** "Kamis, 22 Oktober 2026" */
export function formatTanggal(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Pecahan tanggal untuk badge kalender: { hari, tanggal, bulan } */
export function tanggalRingkas(iso: string): {
  hari: string;
  tanggal: string;
  bulan: string;
} {
  const d = new Date(iso + "T00:00:00");
  return {
    hari: HARI[d.getDay()],
    tanggal: String(d.getDate()).padStart(2, "0"),
    bulan: BULAN[d.getMonth()],
  };
}

/** "08:00" */
export function formatJam(isoWaktu: string): string {
  const d = new Date(isoWaktu);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "08:05:12" */
export function formatWaktuLengkap(isoWaktu: string): string {
  const d = new Date(isoWaktu);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** "Kamis, 22 Oktober 2026 · 08:05:12" */
export function formatTanggalWaktu(isoWaktu: string): string {
  const d = new Date(isoWaktu);
  const tanggal = d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${tanggal} · ${formatWaktuLengkap(isoWaktu)}`;
}
