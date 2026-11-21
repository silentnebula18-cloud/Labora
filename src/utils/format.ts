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

function toValidDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = value.trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{2}:\d{2}$/.test(raw)) {
    const [h, m] = raw.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Kamis, 22 Oktober 2026" */
export function formatTanggal(value: Date | string | null | undefined): string {
  const d = toValidDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Pecahan tanggal untuk badge kalender: { hari, tanggal, bulan } */
export function tanggalRingkas(value: Date | string | null | undefined): {
  hari: string;
  tanggal: string;
  bulan: string;
} {
  const d = toValidDate(value);
  if (!d) {
    return { hari: "—", tanggal: "—", bulan: "—" };
  }
  return {
    hari: HARI[d.getDay()],
    tanggal: String(d.getDate()).padStart(2, "0"),
    bulan: BULAN[d.getMonth()],
  };
}

/** "07:40" */
export function formatJam(value: Date | string | null | undefined): string {
  if (typeof value === "string" && /^\d{2}:\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = toValidDate(value);
  if (!d) return "—";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** "08:05:12" */
export function formatWaktuLengkap(
  value: Date | string | null | undefined,
): string {
  const d = toValidDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** "Kamis, 22 Oktober 2026 · 08:05:12" */
export function formatTanggalWaktu(
  value: Date | string | null | undefined,
): string {
  const d = toValidDate(value);
  if (!d) return "—";
  return `${formatTanggal(d)} · ${formatWaktuLengkap(d)}`;
}
