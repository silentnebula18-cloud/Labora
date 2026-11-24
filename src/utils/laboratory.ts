/**
 * Normalisasi nama laboratorium/ruang agar pencocokan antara data master
 * `laboratories.nama` dan `schedules.ruang`/`sessions.ruang` tetap toleran
 * terhadap variasi penulisan ("Lab Komputer B", "Laboratorium Komputer B",
 * "Lab. Komputer B", dan sebagainya).
 */
export function normalizeLaboratoryName(value: string | null | undefined): string {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "";

  return raw
    .replace(/^(laboratorium|lab)\b\.?\s*/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactName(value: string): string {
  return normalizeLaboratoryName(value).replace(/\s+/g, "");
}

/**
 * TRUE jika dua nama merujuk ke ruang laboratorium yang sama.
 * Perbandingan dilakukan pada nama yang sudah dinormalisasi (tanpa prefix
 * "Lab"/"Laboratorium" dan tanpa pemisah), sehingga tidak menimbulkan
 * pencocokan parsial yang salah (mis. "Komputer B" vs "Komputer B2").
 */
export function isSameLaboratoryRoom(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = compactName(a ?? "");
  const right = compactName(b ?? "");
  if (!left || !right) return false;
  return left === right;
}
