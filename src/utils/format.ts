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

/** "13 Jan 2026" */
export function formatTanggal(value: Date | string | null | undefined): string {
  const d = toValidDate(value);
  if (!d) return "—";
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Sel, 13 Jan 2026" */
export function formatTanggalHari(
  value: Date | string | null | undefined,
): string {
  const d = toValidDate(value);
  if (!d) return "—";
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
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

/** "05.10" (tanpa detik) */
export function formatJam(value: Date | string | null | undefined): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{2})[:.](\d{2})(?:[:.]\d{2})?$/);
    if (match) {
      return `${match[1]}.${match[2]}`;
    }
  }
  const d = toValidDate(value);
  if (!d) return "—";
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}.${minutes}`;
}

/** "05.10" (ringkas hingga menit, tanpa detik) */
export function formatWaktuLengkap(
  value: Date | string | null | undefined,
): string {
  return formatJam(value);
}

/** "13 Jan 2026 · 05.10" */
export function formatTanggalWaktu(
  value: Date | string | null | undefined,
): string {
  const d = toValidDate(value);
  if (!d) return "—";
  return `${formatTanggal(d)} · ${formatJam(d)}`;
}
