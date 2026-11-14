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

// Inisialisasi classifier sekali di luar fungsi agar efisien
const classify = createSentimentClassifier(model);

/**
 * Menganalisis sentimen alasan izin menggunakan model AI lokal (SRS 010).
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
    const prediction = classify(trimmed);

    if (!prediction || !prediction.label) {
      return {
        status: "failed",
        label: null,
        confidence: null,
        note: "Alasan belum dapat dianalisis oleh model AI.",
        processedAt,
      };
    }

    // Ambil skor tertinggi jika tersedia
    let confidence: number | null = null;
    if (Array.isArray(prediction.scores) && prediction.scores.length > 0) {
      const maxScore = Math.max(...prediction.scores);
      confidence = Number.isFinite(maxScore) ? Number(maxScore.toFixed(3)) : null;
    }

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
