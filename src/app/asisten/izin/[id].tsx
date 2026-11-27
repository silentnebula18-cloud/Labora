import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
import BottomNavBar from "../../../components/BottomNavBar";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import { normalizeConfidencePercentage } from "../../../services/aiService";
import {
  describeFirestoreError,
  subscribeAssistantClasses,
} from "../../../services/classService";
import {
  decidePermissionRequest,
  subscribePermissionById,
} from "../../../services/permissionService";
import type {
  ClassRecord,
  PermissionRecord,
  PermissionStatus,
} from "../../../types";
import {
  formatJam,
  formatTanggal,
  formatWaktuLengkap,
} from "../../../utils/format";

const STATUS_PILL: Record<
  PermissionStatus,
  { label: string; bg: string; text: string }
> = {
  pending: {
    label: "Menunggu tinjauan",
    bg: COLORS.neutralBadgeBg,
    text: COLORS.neutralBadgeText,
  },
  approved: {
    label: "Izin disetujui",
    bg: COLORS.successBg,
    text: COLORS.successText,
  },
  rejected: {
    label: "Izin ditolak",
    bg: COLORS.dangerBg,
    text: COLORS.dangerText,
  },
};

const AI_SENTIMENT_PILL: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  positif: {
    label: "AI · Sentimen: Positif",
    bg: COLORS.successBg,
    text: COLORS.successText,
  },
  netral: {
    label: "AI · Sentimen: Netral",
    bg: COLORS.primarySoft,
    text: COLORS.primary,
  },
  negatif: {
    label: "AI · Sentimen: Negatif",
    bg: COLORS.dangerBg,
    text: COLORS.dangerText,
  },
};

export default function IzinAsistenDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const permissionId = typeof id === "string" ? id : "";
  const { user } = useAuth();
  const { sessions } = useSession();

  const [record, setRecord] = useState<PermissionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassRecord[]>([]);

  const [confirmDecision, setConfirmDecision] = useState<
    Exclude<PermissionStatus, "pending"> | null
  >(null);
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeAssistantClasses(user.id, (items) => {
      setClasses(items);
    });
  }, [user]);

  useEffect(() => {
    if (!permissionId) return;

    const unsubscribe = subscribePermissionById(
      permissionId,
      (item) => {
        setRecord(item);
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        setLoadError(describeFirestoreError(error));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [permissionId]);

  const classInfo = useMemo(() => {
    if (!record) return undefined;
    return classes.find((c) => c.id === record.classId);
  }, [classes, record]);

  const sessionInfo = useMemo(() => {
    if (!record) return undefined;
    return sessions.find(
      (s) => s.id === record.sessionId || s.scheduleId === record.sessionId,
    );
  }, [sessions, record]);

  async function handleConfirmDecision() {
    if (!record || !confirmDecision || !user || deciding) return;

    setDeciding(true);
    setDecisionError(null);

    try {
      await decidePermissionRequest(record.id, user.id, confirmDecision);
      const label = confirmDecision === "approved" ? "disetujui" : "ditolak";
      setFeedbackBanner({
        type: "success",
        text: `Pengajuan izin ${record.nama} berhasil ${label}.`,
      });
      setConfirmDecision(null);
    } catch (error) {
      const msg =
        error instanceof Error && error.message
          ? error.message
          : describeFirestoreError(error);
      setDecisionError(msg);
    } finally {
      setDeciding(false);
    }
  }

  if (loading && permissionId) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.centerText}>Memuat detail izin…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.centerBox}>
          <Text style={styles.centerTitle}>
            {loadError || "Data pengajuan izin tidak ditemukan."}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg = STATUS_PILL[record.status] ?? STATUS_PILL.pending;
  const aiCfg = record.aiCategory
    ? AI_SENTIMENT_PILL[record.aiCategory]
    : null;
  const kodeKelas =
    classInfo?.kodeKelas || sessionInfo?.kelas.namaKelas || "—";
  const mataKuliah =
    record.mataKuliah ||
    classInfo?.mataKuliah ||
    sessionInfo?.practicum.mataKuliah ||
    "Praktikum";
  const nomorPraktikum =
    record.nomorPraktikum ?? sessionInfo?.practicum.nomorPraktikum ?? 1;
  const namaPraktikum =
    record.namaPraktikum ||
    sessionInfo?.practicum.namaPraktikum ||
    "Sesi Praktikum";
  const confidencePct = normalizeConfidencePercentage(record.aiConfidence);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backRow}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <AppIcon name="chevron-left" size={20} color={COLORS.textPrimary} />
          <Text style={styles.headerTitle}>Tinjau Izin</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {feedbackBanner && (
          <Pressable
            style={[
              styles.feedbackBanner,
              feedbackBanner.type === "success"
                ? styles.feedbackSuccess
                : styles.feedbackError,
            ]}
            onPress={() => setFeedbackBanner(null)}
          >
            <AppIcon
              name={feedbackBanner.type === "success" ? "check" : "alert"}
              size={16}
              color={
                feedbackBanner.type === "success"
                  ? COLORS.successText
                  : COLORS.dangerText
              }
            />
            <Text
              style={[
                styles.feedbackText,
                {
                  color:
                    feedbackBanner.type === "success"
                      ? COLORS.successText
                      : COLORS.dangerDark,
                },
              ]}
            >
              {feedbackBanner.text}
            </Text>
          </Pressable>
        )}

        {/* Kartu Identitas Praktikan & Sesi */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View
              style={[styles.statusPill, { backgroundColor: statusCfg.bg }]}
            >
              <Text style={[styles.statusPillText, { color: statusCfg.text }]}>
                {statusCfg.label}
              </Text>
            </View>
            {record.createdAt && (
              <Text style={styles.timestampText}>
                {formatWaktuLengkap(record.createdAt.toISOString())} WIB
              </Text>
            )}
          </View>

          <Text
            style={styles.studentName}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {record.nama}
          </Text>
          <Text
            style={styles.studentNim}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {record.nim}
          </Text>

          <View style={styles.divider} />

          <View style={styles.detailRows}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mata kuliah</Text>
              <Text
                style={styles.detailValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {mataKuliah}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kelas</Text>
              <Text
                style={styles.detailValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Kelas {kodeKelas}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pertemuan</Text>
              <Text
                style={styles.detailValue}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {String(nomorPraktikum).padStart(2, "0")} · {namaPraktikum}
              </Text>
            </View>
            {sessionInfo && (
              <>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Jadwal</Text>
                  <Text
                    style={styles.detailValue}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formatTanggal(sessionInfo.tanggal)} ·{" "}
                    {formatJam(sessionInfo.jamMulai)}–
                    {formatJam(sessionInfo.jamSelesai)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Laboratorium</Text>
                  <Text
                    style={styles.detailValue}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {sessionInfo.ruang}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Kartu Alasan Izin */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Alasan ketidakhadiran</Text>
          <Text style={styles.reasonBody}>{record.alasan}</Text>
        </View>

        {/* Kartu Sentimen AI */}
        <View style={styles.aiCard}>
          <View style={styles.aiTopRow}>
            <View style={styles.aiLeftRow}>
              <AppIcon name="sparkles" size={18} color={COLORS.primary} />
              {aiCfg ? (
                <View style={[styles.aiPill, { backgroundColor: aiCfg.bg }]}>
                  <Text style={[styles.aiPillText, { color: aiCfg.text }]}>
                    {aiCfg.label}
                  </Text>
                </View>
              ) : (
                <Text style={styles.aiMuted}>Analisis AI tidak tersedia</Text>
              )}
            </View>
            {confidencePct !== null && (
              <Text style={styles.confidenceText}>{confidencePct}%</Text>
            )}
          </View>

          {confidencePct !== null && (
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${confidencePct}%` }]}
              />
            </View>
          )}

          <Text style={styles.aiNote}>
            Hasil sentimen AI digunakan sebagai referensi pendukung keputusan
            asisten.
          </Text>
        </View>

        {/* Tombol Keputusan (Hanya jika status masih pending) */}
        {record.status === "pending" ? (
          <View style={styles.decisionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.rejectBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => {
                setDecisionError(null);
                setConfirmDecision("rejected");
              }}
            >
              <Text style={styles.rejectBtnText}>Tolak Izin</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.approveBtn,
                pressed && styles.approveBtnPressed,
              ]}
              onPress={() => {
                setDecisionError(null);
                setConfirmDecision("approved");
              }}
            >
              <Text style={styles.approveBtnText}>Setujui Izin</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.finalNoticeCard}>
            <AppIcon name="lock" size={16} color={COLORS.textSecondary} />
            <Text style={styles.finalNoticeText}>
              Keputusan telah disimpan pada{" "}
              {record.decidedAt
                ? `${formatTanggal(record.decidedAt)} pukul ${formatWaktuLengkap(record.decidedAt.toISOString())} WIB`
                : "sistem"}{" "}
              dan bersifat final.
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomNavBar role="asisten" activeTab="izin" />

      {/* Modal Konfirmasi Keputusan */}
      <Modal
        visible={!!confirmDecision}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deciding) setConfirmDecision(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={deciding ? undefined : () => setConfirmDecision(null)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {confirmDecision === "approved"
                ? "Setujui Pengajuan Izin?"
                : "Tolak Pengajuan Izin?"}
            </Text>
            <Text style={styles.modalSubtitle}>
              Keputusan untuk {record.nama} bersifat final dan hanya dapat
              ditentukan satu kali.
            </Text>

            {decisionError && (
              <View style={[styles.feedbackBanner, styles.feedbackError]}>
                <Text style={[styles.feedbackText, { color: COLORS.dangerDark }]}>
                  {decisionError}
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelModalBtn}
                onPress={() => setConfirmDecision(null)}
                disabled={deciding}
              >
                <Text style={styles.cancelModalText}>Batal</Text>
              </Pressable>

              <Pressable
                style={[
                  confirmDecision === "approved"
                    ? styles.confirmApproveBtn
                    : styles.confirmRejectBtn,
                  deciding && { opacity: 0.7 },
                ]}
                onPress={handleConfirmDecision}
                disabled={deciding}
              >
                {deciding ? (
                  <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.confirmModalText}>
                    {confirmDecision === "approved" ? "Ya, Setujui" : "Ya, Tolak"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  centerText: { fontSize: 13, color: COLORS.textSecondary },
  centerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  feedbackError: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
  },
  feedbackText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  timestampText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  studentName: {
    fontSize: 16.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  studentNim: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
  },
  detailRows: {
    gap: 9,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "right",
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  reasonBody: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  aiCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  aiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  aiLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  aiPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  aiPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  aiMuted: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  progressTrack: {
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  aiNote: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  decisionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.dangerText,
  },
  approveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  approveBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  finalNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  finalNoticeText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 13.5,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  cancelModalText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmApproveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  confirmRejectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerText,
    alignItems: "center",
  },
  confirmModalText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
