import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import type { SessionStatus } from "../../../types";
import { formatTanggal, formatWaktuLengkap } from "../../../utils/format";

// ─── Konfigurasi Status ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<SessionStatus, string> = {
  belum_dibuka: "Belum Dibuka",
  dibuka: "Presensi Dibuka",
  ditutup: "Selesai",
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  belum_dibuka: "#f59e0b",
  dibuka: "#10b981",
  ditutup: "#9ca3af",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

type AttendanceFeedback = {
  status: "success" | "error";
  message: string;
};

// ─── Layar Detail Sesi ────────────────────────────────────────────────────────

export default function SessionDetailPraktikan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    studentSessions,
    myAttendances,
    getSession,
    markAttendance,
    refreshStudentSessions,
    refreshMyAttendances,
  } = useSession();

  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AttendanceFeedback | null>(null);
  const submittingRef = useRef(false);
  const lastSuccessSessionRef = useRef<string | null>(null);

  // Pastikan data segar walau layar dibuka langsung lewat deep link.
  useEffect(() => {
    if (!user) return;
    refreshStudentSessions(user.id);
    refreshMyAttendances(user.id);
  }, [user, refreshStudentSessions, refreshMyAttendances]);

  const session = useMemo(() => {
    const fromList = id ? studentSessions.find((s) => s.id === id) : undefined;
    return fromList ?? (id ? getSession(id) : null);
  }, [id, studentSessions, getSession]);

  const attendance = useMemo(() => {
    if (!id) return null;
    return myAttendances.find((a) => a.sessionId === id) ?? null;
  }, [id, myAttendances]);

  function lakukanPresensi() {
    if (
      !session ||
      !user ||
      submittingRef.current ||
      lastSuccessSessionRef.current === session.id
    ) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = markAttendance(session.id, user.id);
      if (result.ok) {
        lastSuccessSessionRef.current = session.id;
        setFeedback({
          status: "success",
          message: `Kehadiran Anda tercatat pada ${formatWaktuLengkap(
            result.attendance.waktuHadir,
          )}.`,
        });
      } else {
        setFeedback({ status: "error", message: result.message });
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function tutupFeedback() {
    setFeedback(null);
  }

  function bukaKonfirmasiPresensi() {
    if (!session || !user || attendance || session.status !== "dibuka") return;
    setIsConfirmVisible(true);
  }

  function tutupKonfirmasiPresensi() {
    setIsConfirmVisible(false);
  }

  function konfirmasiPresensi() {
    if (!session || !user) return;
    setIsConfirmVisible(false);
    lakukanPresensi();
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={styles.notFoundTitle}>Sesi tidak ditemukan</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLOR[session.status];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>

        {/* Info Sesi */}
        <View style={styles.sessionCard}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusColor + "22" },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {STATUS_LABEL[session.status]}
            </Text>
          </View>

          <Text style={styles.mataKuliah}>{session.practicum.mataKuliah}</Text>
          <Text style={styles.namaPraktikum}>
            Praktikum ke-{session.practicum.nomorPraktikum} ·{" "}
            {session.practicum.namaPraktikum}
          </Text>

          <View style={styles.detailList}>
            <DetailRow label="Kelas" value={session.kelas.namaKelas} />
            <DetailRow label="Ruang" value={session.ruang} />
            <DetailRow label="Tanggal" value={formatTanggal(session.tanggal)} />
            <DetailRow
              label="Waktu"
              value={`${session.jamMulai} – ${session.jamSelesai}`}
            />
          </View>
        </View>

        {/* Panel Presensi */}
        {attendance ? (
          <View style={[styles.presenceCard, styles.presenceSuccess]}>
            <Text style={styles.presenceIcon}>✅</Text>
            <Text style={styles.presenceTitle}>Presensi Berhasil</Text>
            <Text style={styles.presenceSuccessText}>
              Anda tercatat hadir pada{" "}
              {formatWaktuLengkap(attendance.waktuHadir)}.
            </Text>
            <Text style={styles.presenceNote}>
              Presensi hanya dapat dilakukan satu kali untuk setiap sesi.
            </Text>
          </View>
        ) : session.status === "dibuka" ? (
          <>
            <View style={[styles.presenceCard, styles.presenceOpen]}>
              <Text style={styles.presenceIcon}>🖐️</Text>
              <Text style={styles.presenceTitle}>Sesi sedang dibuka</Text>
              <Text style={styles.presenceOpenText}>
                Asisten telah membuka sesi ini. Lakukan presensi sebelum sesi
                ditutup.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.actionBtnPressed,
              ]}
              onPress={bukaKonfirmasiPresensi}
            >
              <Text style={styles.actionBtnIcon}>✓</Text>
              <Text style={styles.actionBtnText}>Lakukan Presensi</Text>
            </Pressable>
          </>
        ) : session.status === "belum_dibuka" ? (
          <View style={[styles.presenceCard, styles.presencePending]}>
            <Text style={styles.presenceIcon}>⏳</Text>
            <Text style={styles.presenceTitle}>Sesi belum dibuka</Text>
            <Text style={styles.presencePendingText}>
              Tombol presensi akan aktif setelah asisten membuka sesi ini.
            </Text>
          </View>
        ) : (
          <View style={[styles.presenceCard, styles.presenceClosed]}>
            <Text style={styles.presenceIcon}>🔒</Text>
            <Text style={styles.presenceTitle}>Sesi telah ditutup</Text>
            <Text style={styles.presenceClosedText}>
              Anda tidak tercatat hadir pada sesi ini.
            </Text>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <Modal
        visible={isConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={tutupKonfirmasiPresensi}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={tutupKonfirmasiPresensi}
            accessibilityLabel="Tutup konfirmasi presensi"
          />

          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalIconWrap}>
              <Text style={styles.modalIcon}>✓</Text>
            </View>

            <Text style={styles.modalTitle}>Konfirmasi Presensi</Text>
            <Text style={styles.modalDescription}>
              Pastikan data sesi berikut sudah sesuai sebelum kehadiran Anda
              dicatat.
            </Text>

            <View style={styles.modalInfo}>
              <DetailRow
                label="Mata Kuliah"
                value={session.practicum.mataKuliah}
              />
              <DetailRow
                label="Praktikum"
                value={`ke-${session.practicum.nomorPraktikum} · ${session.practicum.namaPraktikum}`}
              />
              <DetailRow label="Kelas" value={session.kelas.namaKelas} />
              <DetailRow
                label="Tanggal"
                value={formatTanggal(session.tanggal)}
              />
              <DetailRow
                label="Waktu"
                value={`${session.jamMulai} – ${session.jamSelesai}`}
              />
              <DetailRow label="Ruang" value={session.ruang} />
            </View>

            <Text style={styles.modalNote}>
              Presensi hanya dapat dilakukan satu kali untuk setiap sesi.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && styles.modalBtnPressed,
                ]}
                onPress={tutupKonfirmasiPresensi}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalConfirmBtn,
                  pressed && styles.modalBtnPressed,
                  isSubmitting && styles.modalBtnDisabled,
                ]}
                onPress={konfirmasiPresensi}
                disabled={isSubmitting}
              >
                <Text style={styles.modalConfirmText}>
                  {isSubmitting ? "Memproses..." : "Konfirmasi Presensi"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={feedback !== null}
        transparent
        animationType="fade"
        onRequestClose={tutupFeedback}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={tutupFeedback}
            accessibilityLabel="Tutup umpan balik presensi"
          />

          <View style={styles.modalCard} accessibilityViewIsModal>
            <View
              style={[
                styles.modalIconWrap,
                feedback?.status === "error" && styles.feedbackIconError,
              ]}
            >
              <Text
                style={[
                  styles.modalIcon,
                  feedback?.status === "error" && styles.feedbackIconErrorText,
                ]}
              >
                {feedback?.status === "error" ? "!" : "✓"}
              </Text>
            </View>

            <Text style={styles.modalTitle}>
              {feedback?.status === "error"
                ? "Presensi Gagal"
                : "Presensi Berhasil"}
            </Text>

            <View style={styles.feedbackSession}>
              <Text style={styles.feedbackSessionTitle}>
                {session.practicum.mataKuliah}
              </Text>
              <Text style={styles.feedbackSessionText}>
                Praktikum ke-{session.practicum.nomorPraktikum} ·{" "}
                {session.practicum.namaPraktikum}
              </Text>
              <Text style={styles.feedbackSessionText}>
                Kelas {session.kelas.namaKelas} · {session.ruang}
              </Text>
            </View>

            <Text style={styles.feedbackMessage}>
              {feedback?.message ?? ""}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalResultBtn,
                pressed && styles.modalBtnPressed,
              ]}
              onPress={tutupFeedback}
            >
              <Text style={styles.modalConfirmText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16 },

  // Tombol kembali
  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backText: { fontSize: 16, color: "#1e40af", fontWeight: "600" },

  // Kartu info sesi
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 99 },
  statusLabel: { fontSize: 12, fontWeight: "700" },

  mataKuliah: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  namaPraktikum: { fontSize: 14, color: "#6b7280", marginBottom: 16 },

  detailList: { gap: 10 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },

  // Panel presensi
  presenceCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  presenceIcon: { fontSize: 32, marginBottom: 8 },
  presenceTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  presenceNote: { fontSize: 12, color: "#6b7280", marginTop: 10 },

  presenceSuccess: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  presenceSuccessText: {
    fontSize: 14,
    color: "#047857",
    fontWeight: "600",
    textAlign: "center",
  },

  presenceOpen: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  presenceOpenText: {
    fontSize: 13,
    color: "#1d4ed8",
    textAlign: "center",
    lineHeight: 19,
  },

  presencePending: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  presencePendingText: {
    fontSize: 13,
    color: "#92400e",
    textAlign: "center",
    lineHeight: 19,
  },

  presenceClosed: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  presenceClosedText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  actionBtnPressed: { opacity: 0.82 },
  actionBtnIcon: { color: "#fff", fontSize: 16, fontWeight: "700" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 99,
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalIcon: { fontSize: 24, color: "#047857", fontWeight: "700" },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 4,
  },
  modalInfo: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    gap: 10,
    marginTop: 14,
  },
  modalNote: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 12,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  modalConfirmBtn: {
    flex: 1.4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  modalBtnPressed: { opacity: 0.82 },
  modalBtnDisabled: { opacity: 0.6 },

  feedbackSession: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    gap: 2,
    alignItems: "center",
  },
  feedbackSessionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  feedbackSessionText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },
  feedbackMessage: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
    lineHeight: 21,
    marginTop: 12,
    marginBottom: 18,
  },
  feedbackIconError: { backgroundColor: "#fee2e2" },
  feedbackIconErrorText: { color: "#b91c1c" },
  modalResultBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#059669",
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  notFoundIcon: { fontSize: 48, marginBottom: 12 },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: { color: "#fff", fontWeight: "700" },

  bottomPad: { height: 24 },
});
