import { router, useLocalSearchParams } from "expo-router";
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
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
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
import { formatTanggal, formatWaktuLengkap } from "../../../utils/format";

// ─── Konfigurasi Status & Sentimen AI ────────────────────────────────────────

const STATUS_PERMISSION_CONFIG: Record<
  PermissionStatus,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    icon: "clock" | "check" | "alert";
  }
> = {
  pending: {
    label: "Menunggu Pemeriksaan",
    bg: "#fef9c3",
    border: "#fde047",
    text: "#854d0e",
    icon: "clock",
  },
  approved: {
    label: "Izin Disetujui",
    bg: "#e6f4ea",
    border: "#b7dfc2",
    text: "#0f5132",
    icon: "check",
  },
  rejected: {
    label: "Izin Ditolak",
    bg: "#fef2f2",
    border: "#fecaca",
    text: "#991b1b",
    icon: "alert",
  },
};

const AI_SENTIMENT_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  positif: {
    label: "Sentimen Positif",
    bg: "#dcfce7",
    text: "#166534",
    border: "#86efac",
  },
  netral: {
    label: "Sentimen Netral",
    bg: "#f1f5f9",
    text: "#334155",
    border: "#cbd5e1",
  },
  negatif: {
    label: "Sentimen Negatif",
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#fca5a5",
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
      const label =
        confirmDecision === "approved" ? "disetujui" : "ditolak";
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
        <View style={styles.topBar}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <AppIcon name="chevron-left" size={18} color="#2563eb" />
            <Text style={styles.backText}>Kembali</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Detail Pengajuan Izin</Text>
          <View style={{ width: 68 }} />
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.centerText}>Memuat detail pengajuan izin…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!record) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <AppIcon name="chevron-left" size={18} color="#2563eb" />
            <Text style={styles.backText}>Kembali</Text>
          </Pressable>
          <Text style={styles.topBarTitle}>Detail Pengajuan Izin</Text>
          <View style={{ width: 68 }} />
        </View>
        <View style={styles.centerBox}>
          <Text style={styles.centerTitle}>
            {loadError || "Data pengajuan izin tidak ditemukan."}
          </Text>
          <Pressable
            style={styles.backFallbackBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backFallbackText}>Kembali ke Daftar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusCfg =
    STATUS_PERMISSION_CONFIG[record.status] ?? STATUS_PERMISSION_CONFIG.pending;
  const aiCfg = record.aiCategory
    ? AI_SENTIMENT_CONFIG[record.aiCategory]
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

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <AppIcon name="chevron-left" size={18} color="#2563eb" />
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Detail Pengajuan Izin</Text>
        <View style={{ width: 68 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Umpan Balik */}
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
              size={15}
              color={feedbackBanner.type === "success" ? "#0f5132" : "#991b1b"}
            />
            <Text
              style={[
                styles.feedbackBannerText,
                {
                  color:
                    feedbackBanner.type === "success" ? "#0f5132" : "#991b1b",
                },
              ]}
            >
              {feedbackBanner.text}
            </Text>
          </Pressable>
        )}

        {/* Kartu Utama Detail Pengajuan */}
        <View style={styles.card}>
          {/* Header Status & Kelas */}
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusCfg.bg,
                  borderColor: statusCfg.border,
                },
              ]}
            >
              <AppIcon name={statusCfg.icon} size={13} color={statusCfg.text} />
              <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>
                {statusCfg.label}
              </Text>
            </View>

            <View style={styles.classBadge}>
              <Text style={styles.classBadgeText}>Kelas {kodeKelas}</Text>
            </View>
          </View>

          {/* Bagian 1: Identitas Praktikan */}
          <Text style={styles.sectionHeader}>Identitas Praktikan</Text>
          <View style={styles.studentIdentityBox}>
            <View style={styles.studentAvatar}>
              <AppIcon name="user" size={20} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>
                {record.nama || "Praktikan"}
              </Text>
              <Text style={styles.studentNim}>NIM {record.nim || "—"}</Text>
            </View>
          </View>

          {/* Bagian 2: Kelas, Jadwal, dan Sesi */}
          <Text style={styles.sectionHeader}>Informasi Kelas & Sesi</Text>
          <View style={styles.infoGridBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nama Mata Kuliah</Text>
              <Text style={styles.infoValue}>{mataKuliah}</Text>
            </View>
            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kelas</Text>
              <Text style={styles.infoValue}>Kelas {kodeKelas}</Text>
            </View>
            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sesi Praktikum</Text>
              <Text style={styles.infoValue}>
                Pertemuan {nomorPraktikum} · {namaPraktikum}
              </Text>
            </View>

            {sessionInfo && (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Jadwal Pelaksanaan</Text>
                  <Text style={styles.infoValue}>
                    {formatTanggal(sessionInfo.tanggal)} ({sessionInfo.jamMulai}{" "}
                    – {sessionInfo.jamSelesai} WIB)
                  </Text>
                </View>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ruang Laboratorium</Text>
                  <Text style={styles.infoValue}>{sessionInfo.ruang}</Text>
                </View>
              </>
            )}
          </View>

          {/* Bagian 3: Alasan Ketidakhadiran */}
          <Text style={styles.sectionHeader}>Alasan Ketidakhadiran</Text>
          <View style={styles.alasanBox}>
            <Text style={styles.alasanText}>{record.alasan}</Text>
          </View>

          {/* Bagian 4: Hasil Klasifikasi AI (Pendukung Keputusan) */}
          <Text style={styles.sectionHeader}>
            Hasil Klasifikasi AI (Pendukung Keputusan)
          </Text>
          <View style={styles.aiSectionBox}>
            <View style={styles.aiHeaderRow}>
              <Text style={styles.aiSectionTitle}>Kategori Sentimen AI</Text>
              {aiCfg ? (
                <View
                  style={[
                    styles.aiBadge,
                    {
                      backgroundColor: aiCfg.bg,
                      borderColor: aiCfg.border,
                    },
                  ]}
                >
                  <AppIcon name="info" size={12} color={aiCfg.text} />
                  <Text style={[styles.aiBadgeText, { color: aiCfg.text }]}>
                    {aiCfg.label}
                    {typeof record.aiConfidence === "number"
                      ? ` (${Math.round(record.aiConfidence * 100)}%)`
                      : ""}
                  </Text>
                </View>
              ) : (
                <View style={styles.aiFailedBadge}>
                  <Text style={styles.aiFailedBadgeText}>
                    AI Tidak Tersedia
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.aiDisclaimerText}>
              {aiCfg
                ? "Hasil klasifikasi AI hanya menjadi informasi pendukung. Keputusan persetujuan izin sepenuhnya ditentukan oleh asisten."
                : "Hasil analisis AI tidak tersedia. Silakan tinjau alasan ketidakhadiran di atas secara manual."}
            </Text>
          </View>

          {/* Bagian 5: Informasi Waktu */}
          <View style={styles.timestampFooter}>
            <Text style={styles.timestampText}>
              Diajukan pada:{" "}
              {record.createdAt
                ? formatWaktuLengkap(record.createdAt.toISOString())
                : "—"}
            </Text>
            {record.status !== "pending" && record.decidedAt && (
              <Text style={styles.timestampText}>
                Diputuskan pada:{" "}
                {formatWaktuLengkap(record.decidedAt.toISOString())}
              </Text>
            )}
          </View>

          {/* Bagian 6: Tombol Terima / Tolak (Hanya jika status masih pending) */}
          {record.status === "pending" ? (
            <View style={styles.decisionActionsRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.decisionBtn,
                  styles.rejectBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  setDecisionError(null);
                  setConfirmDecision("rejected");
                }}
              >
                <AppIcon name="alert" size={15} color="#991b1b" />
                <Text style={styles.rejectBtnText}>Tolak Izin</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.decisionBtn,
                  styles.approveBtn,
                  pressed && styles.btnPressed,
                ]}
                onPress={() => {
                  setDecisionError(null);
                  setConfirmDecision("approved");
                }}
              >
                <AppIcon name="check" size={15} color="#ffffff" />
                <Text style={styles.approveBtnText}>Setujui Izin</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.lockedDecisionBar}>
              <AppIcon name="lock" size={14} color="#64748b" />
              <Text style={styles.lockedDecisionText}>
                Keputusan telah disimpan dan dikunci
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 36 }} />
      </ScrollView>

      {/* Modal Konfirmasi Keputusan */}
      <Modal
        visible={confirmDecision !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deciding) setConfirmDecision(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!deciding) setConfirmDecision(null);
            }}
          />

          {confirmDecision && (
            <View style={styles.modalCard} accessibilityViewIsModal>
              <View
                style={[
                  styles.modalIconCircle,
                  confirmDecision === "approved"
                    ? styles.modalIconApprove
                    : styles.modalIconReject,
                ]}
              >
                <AppIcon
                  name={confirmDecision === "approved" ? "check" : "alert"}
                  size={22}
                  color={confirmDecision === "approved" ? "#0f5132" : "#991b1b"}
                />
              </View>

              <Text style={styles.modalTitle}>
                {confirmDecision === "approved"
                  ? "Setujui Pengajuan Izin?"
                  : "Tolak Pengajuan Izin?"}
              </Text>

              <Text style={styles.modalDesc}>
                Anda akan{" "}
                <Text style={{ fontWeight: "800" }}>
                  {confirmDecision === "approved" ? "menyetujui" : "menolak"}
                </Text>{" "}
                pengajuan izin dari{" "}
                <Text style={{ fontWeight: "700" }}>
                  {record.nama} (NIM {record.nim})
                </Text>
                . Keputusan yang sudah disimpan tidak dapat diubah kembali.
              </Text>

              {decisionError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{decisionError}</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelBtn,
                    pressed && styles.btnPressed,
                  ]}
                  onPress={() => setConfirmDecision(null)}
                  disabled={deciding}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.modalConfirmBtn,
                    confirmDecision === "approved"
                      ? styles.modalConfirmApprove
                      : styles.modalConfirmReject,
                    pressed && styles.btnPressed,
                    deciding && styles.btnDisabled,
                  ]}
                  onPress={handleConfirmDecision}
                  disabled={deciding}
                >
                  {deciding ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.modalConfirmText}>
                      {confirmDecision === "approved"
                        ? "Ya, Setujui"
                        : "Ya, Tolak"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 68,
  },
  backText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  centerText: {
    fontSize: 13.5,
    color: "#64748b",
  },
  centerTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  backFallbackBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backFallbackText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  scrollContent: {
    padding: 16,
  },

  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  feedbackSuccess: {
    backgroundColor: "#e6f4ea",
    borderColor: "#b7dfc2",
  },
  feedbackError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  feedbackBannerText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4.5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  classBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  classBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },

  sectionHeader: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },

  studentIdentityBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  studentName: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  studentNim: {
    fontSize: 12.5,
    color: "#475569",
    marginTop: 2,
    fontWeight: "600",
  },

  infoGridBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  infoRow: {
    gap: 3,
  },
  infoLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748b",
  },
  infoValue: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 9,
  },

  alasanBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  alasanText: {
    fontSize: 14,
    color: "#0f172a",
    lineHeight: 20,
  },

  aiSectionBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 13,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  aiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  aiSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  aiBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  aiFailedBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  aiFailedBadgeText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748b",
  },
  aiDisclaimerText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    lineHeight: 17,
  },

  timestampFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    marginBottom: 14,
    gap: 3,
  },
  timestampText: {
    fontSize: 12,
    color: "#64748b",
  },

  decisionActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  decisionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rejectBtn: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  rejectBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#991b1b",
  },
  approveBtn: {
    backgroundColor: "#15803d",
    borderColor: "#15803d",
  },
  approveBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  btnPressed: { opacity: 0.85 },
  btnDisabled: { opacity: 0.6 },

  lockedDecisionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  lockedDecisionText: {
    fontSize: 12.5,
    color: "#64748b",
    fontWeight: "600",
  },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#991b1b", fontSize: 12.5 },

  // Modal Konfirmasi
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalIconApprove: {
    backgroundColor: "#e6f4ea",
  },
  modalIconReject: {
    backgroundColor: "#fef2f2",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  modalCancelText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#334155",
  },
  modalConfirmBtn: {
    flex: 1.2,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmApprove: {
    backgroundColor: "#15803d",
  },
  modalConfirmReject: {
    backgroundColor: "#991b1b",
  },
  modalConfirmText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#ffffff",
  },
});

