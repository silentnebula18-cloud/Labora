// Import model dan classifier sesuai pola contoh pengajar
import model from "../../ai/model-edom.json";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createSentimentClassifier } = require("../../ai/sentiment.js");

export type SentimentLabel = "positif" | "netral" | "negatif";

export type AiProcessStatus = "success" | "failed";

export interface SentimentAnalysisResult {
  status: AiProcessStatus;
  label: SentimentLabel | null;
  confidence: number | null;
  note: string;
  processedAt: Date;
}

// Inisialisasi classifier asli dari model-edom.json
const classifyRaw = createSentimentClassifier(model);

// Alias kata-kata alasan izin praktikum ke kosakata model-edom.json
// digunakan sebagai fallback hanya ketika kalimat alasan izin mengandung kata di luar kosakata EDOM.
const PRACTICUM_LEAVE_ALIASES: Record<string, string> = {
  ...model.aliases,
  // Kesehatan / Medis
  sakit: "kesehatan",
  demam: "kesehatan",
  flu: "kesehatan",
  batuk: "kesehatan",
  pilek: "kesehatan",
  tipes: "kesehatan",
  tifus: "kesehatan",
  diare: "kesehatan",
  mual: "pusing",
  muntah: "pusing",
  migrain: "pusing",
  vertigo: "pusing",
  asma: "kesehatan",
  radang: "kesehatan",
  operasi: "kesehatan",
  rawat: "kesehatan",
  inap: "keadaan",
  rs: "kesehatan",
  puskesmas: "kesehatan",
  klinik: "kesehatan",
  dokter: "kesehatan",
  berobat: "kesehatan",
  obat: "kesehatan",
  istirahat: "sehat",
  pemulihan: "sehat",
  // Keluarga / Musibah
  acara: "kegiatan",
  keluarga: "keadaan",
  keperluan: "keadaan",
  urusan: "keadaan",
  mendadak: "tiba",
  duka: "keadaan",
  meninggal: "keadaan",
  wafat: "keadaan",
  musibah: "keadaan",
  kecelakaan: "keadaan",
  bencana: "keadaan",
  banjir: "keadaan",
  mudik: "pulang",
  kampung: "pulang",
  // Akademik / Lomba / Dispensasi
  lomba: "kegiatan",
  kompetisi: "kegiatan",
  delegasi: "kegiatan",
  dispensasi: "ijin",
  seminar: "kegiatan",
  organisasi: "kegiatan",
  kepanitiaan: "kegiatan",
  kampus: "kuliah",
  fakultas: "fti",
  universitas: "kuliah",
  akademik: "perkuliahan",
  // Kendala Perjalanan / Kelalaian
  hujan: "keadaan",
  macet: "terlambat",
  ban: "keadaan",
  bocor: "eror",
  mogok: "eror",
  motor: "keadaan",
  kendaraan: "keadaan",
  ketiduran: "terlambat",
  kesiangan: "terlambat",
  malas: "kurang",
  mager: "kurang",
  lupa: "kurang",
  capek: "pusing",
  lelah: "pusing",
  ngantuk: "bosan",
};

const classifyWithLeaveAliases = createSentimentClassifier({
  ...model,
  aliases: PRACTICUM_LEAVE_ALIASES,
});

/**
 * Mengonversi skor decision_margin LinearSVC menjadi nilai confidence terukur (0..1)
 * menggunakan fungsi softmax agar persentase selalu valid (0% - 100%).
 */
export function computeConfidenceFromScores(
  scores: unknown,
): number | null {
  if (!Array.isArray(scores) || scores.length === 0) return null;
  const numericScores = scores.filter(
    (s): s is number => typeof s === "number" && Number.isFinite(s),
  );
  if (numericScores.length === 0) return null;

  const maxScore = Math.max(...numericScores);
  // Gunakan softmax dengan scaling temperatur agar margin SVM terkonversi ke probabilitas [0..1]
  const expScores = numericScores.map((s) => Math.exp((s - maxScore) * 1.6));
  const sumExp = expScores.reduce((acc, val) => acc + val, 0);
  if (sumExp <= 0 || !Number.isFinite(sumExp)) return null;

  const bestProb = Math.max(...expScores) / sumExp;
  return Number(Math.min(0.99, Math.max(0.35, bestProb)).toFixed(3));
}

/**
 * Menormalkan nilai confidence (termasuk data lama di Firestore yang mungkin menyimpan raw margin SVM).
 */
export function normalizeConfidencePercentage(
  rawConfidence: number | null | undefined,
): number | null {
  if (typeof rawConfidence !== "number" || !Number.isFinite(rawConfidence)) {
    return null;
  }
  if (rawConfidence > 0 && rawConfidence <= 1) {
    return Math.round(rawConfidence * 100);
  }
  // Jika dokumen lama menyimpan raw margin LinearSVC (bisa negatif atau > 1), petakan dengan sigmoid
  const prob = 1 / (1 + Math.exp(-rawConfidence));
  return Math.round(Math.min(99, Math.max(35, prob * 100)));
}

/**
 * Menganalisis sentimen alasan izin menggunakan model AI lokal di folder `ai/` (SRS 010).
 * Mengembalikan hasil klasifikasi (positif, netral, negatif) beserta confidence dan status.
 */
export function analyzeSentiment(text: string): SentimentAnalysisResult {
  const processedAt = new Date();
  const trimmed = typeof text === "string" ? text.trim() : "";

  if (!trimmed) {
    return {
      status: "failed",
      label: null,
      confidence: null,
      note: "Alasan izin kosong.",
      processedAt,
    };
  }

  try {
    let prediction = classifyRaw(trimmed);

    // Jika kosakata murni EDOM belum mengenali istilah alasan izin (misal "sakit demam"),
    // jalankan kembali melalui classifier dengan pemetaan alias alasan izin praktikum.
    if (!prediction || !prediction.label) {
      prediction = classifyWithLeaveAliases(trimmed);
    }

    if (!prediction || !prediction.label) {
      return {
        status: "failed",
        label: null,
        confidence: null,
        note: "Alasan belum dapat dianalisis oleh model AI.",
        processedAt,
      };
    }

    const confidence = computeConfidenceFromScores(prediction.scores);

    const note = prediction.experimental
      ? "Hasil analisis sentimen bersifat eksperimental."
      : "Hasil analisis sentimen berhasil.";

    return {
      status: "success",
      label: prediction.label as SentimentLabel,
      confidence,
      note,
      processedAt,
    };
  } catch {
    return {
      status: "failed",
      label: null,
      confidence: null,
      note: "Terjadi kesalahan saat memproses model AI.",
      processedAt,
    };
  }
}
