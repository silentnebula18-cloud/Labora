import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../components/AppIcon";
import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import { analyzeSentiment, type SentimentAnalysisResult } from "../../services/aiService";
import { describeFirestoreError } from "../../services/classService";
import {
  getExistingPermission,
  submitPermissionRequest,
  subscribeStudentPermissions,
} from "../../services/permissionService";
import type { PermissionRecord, PermissionStatus } from "../../types";
import { formatJam, formatTanggal, formatWaktuLengkap } from "../../utils/format";

// ─── Konfigurasi Status & Tema ───────────────────────────────────────────────

const STATUS_PERMISSION_CONFIG: Record<
  PermissionStatus,
  { label: string; bg: string; border: string; text: string; icon: "clock" | "check" | "alert" }
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
    bg: "#ECFEE8",
    text: "#331E36",
    border: "#6EA4BF",
  },
  negatif: {
    label: "Sentimen Negatif",
    bg: "#fee2e2",
    text: "#991b1b",
    border: "#fca5a5",
  },
};

export default function IzinPraktikanScreen() {
  const { sessionId: initialSessionId } = useLocalSearchParams<{
    sessionId?: string;
  }>();
  const { user } = useAuth();
  const { studentSessions, myAttendances } = useSession();

  const attendedSessionIds = useMemo(
    () => new Set(myAttendances.map((a) => a.sessionId)),
    [myAttendances],
  );

  const [activeTab, setActiveTab] = useState<"form" | "riwayat">("form");
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    initialSessionId || "",
  );
  const [prevInitialId, setPrevInitialId] = useState(initialSessionId);
  if (initialSessionId !== prevInitialId) {
    setPrevInitialId(initialSessionId);
    setSelectedSessionId(initialSessionId || "");
  }

  const [alasan, setAlasan] = useState("");
  const [aiPreview, setAiPreview] = useState<SentimentAnalysisResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Sesi yang dipilih
  const selectedSession = useMemo(() => {
    return (
      studentSessions.find(
        (s) => s.id === selectedSessionId || s.scheduleId === selectedSessionId,
      ) ?? null
    );
  }, [studentSessions, selectedSessionId]);

  // Pantau riwayat izin praktikan secara real-time (SRS 009)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeStudentPermissions(
      user.id,
      (records) => {
        setPermissions(records);
        setPermissionsLoading(false);
        setPermissionsError(null);
      },
      (error) => {
        setPermissionsError(describeFirestoreError(error));
        setPermissionsLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  // Analisis sentimen secara lokal (SRS 010) saat alasan berubah
  function handleCekSentimen() {
    if (!alasan.trim()) {
      setFeedbackMessage({
        type: "error",
        text: "Alasan wajib diisi",
      });
      return;
    }
    const result = analyzeSentiment(alasan);
    setAiPreview(result);
  }

  // Kirim pengajuan izin ke Firestore (SRS 009 & SRS 010)
  async function handleSubmit() {
    if (!user) {
      setFeedbackMessage({
        type: "error",
        text: "Sesi login tidak valid",
      });
      return;
    }

    if (!selectedSession) {
      setFeedbackMessage({
        type: "error",
        text: "Sesi praktikum wajib dipilih",
      });
      return;
    }

    if (!alasan.trim()) {
      setFeedbackMessage({
        type: "error",
        text: "Alasan wajib diisi",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Periksa apakah sudah pernah mengajukan untuk sesi ini
      const existing = await getExistingPermission(user.id, selectedSession.id);
      if (existing) {
        setFeedbackMessage({
          type: "error",
          text: "Izin untuk sesi ini sudah diajukan",
        });
        setIsSubmitting(false);
        return;
      }

      await submitPermissionRequest({
        uid: user.id,
        nama: user.nama,
        nim: user.nim,
        classId: selectedSession.classId,
        sessionId: selectedSession.id,
        mataKuliah: selectedSession.practicum?.mataKuliah ?? "Mata Kuliah",
        namaPraktikum:
          selectedSession.practicum?.namaPraktikum ?? "Sesi Praktikum",
        nomorPraktikum: selectedSession.practicum?.nomorPraktikum ?? 1,
        alasan,
      });

      setFeedbackMessage({
        type: "success",
        text: "Pengajuan izin berhasil dikirim ke asisten.",
      });
      setAlasan("");
      setAiPreview(null);
      setActiveTab("riwayat");
    } catch (err) {
      setFeedbackMessage({
        type: "error",
        text: describeFirestoreError(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <AppIcon name="chevron-left" size={18} color="#41337A" />
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Pengajuan Izin</Text>
        <View style={{ width: 68 }} />
      </View>

      {/* Tab Segment Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === "form" && styles.tabButtonActive]}
          onPress={() => setActiveTab("form")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "form" && styles.tabTextActive,
            ]}
          >
            Form Pengajuan
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.tabButton,
            activeTab === "riwayat" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("riwayat")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "riwayat" && styles.tabTextActive,
            ]}
          >
            Riwayat Izin
          </Text>
          {permissions.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{permissions.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {activeTab === "form" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            {/* 1. Pilih Sesi Praktikum */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                1. Pilih Sesi Praktikum{" "}
                <Text style={styles.requiredMark}>*</Text>
              </Text>
              <Text style={styles.sectionSub}>
                Pilih pertemuan praktikum yang berhalangan Anda ikuti.
              </Text>

              {studentSessions.length === 0 ? (
                <View style={styles.emptySessionBox}>
                  <Text style={styles.emptySessionText}>
                    Belum ada jadwal sesi praktikum yang tersedia.
                  </Text>
                </View>
              ) : (
                <View style={styles.sessionList}>
                  {studentSessions.map((s) => {
                    const isSelected =
                      s.id === selectedSessionId ||
                      s.scheduleId === selectedSessionId;
                    return (
                      <Pressable
                        key={s.id}
                        style={[
                          styles.sessionItem,
                          isSelected && styles.sessionItemActive,
                        ]}
                        onPress={() => {
                          setSelectedSessionId(s.id);
                          setAiPreview(null);
                        }}
                      >
                        <View style={styles.sessionItemHeader}>
                          <Text
                            style={[
                              styles.sessionItemTitle,
                              isSelected && styles.sessionItemTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {s.practicum?.mataKuliah ?? "Mata Kuliah"}
                          </Text>
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleActive,
                            ]}
                          >
                            {isSelected && <View style={styles.radioDot} />}
                          </View>
                        </View>
                        <Text style={styles.sessionItemSub}>
                          Pertemuan {s.practicum?.nomorPraktikum ?? 1} · Kelas{" "}
                          {s.kelas?.namaKelas ?? "—"}
                        </Text>
                        <Text style={styles.sessionItemTime}>
                          {formatTanggal(s.tanggal)} ({formatJam(s.jamMulai)} -{" "}
                          {formatJam(s.jamSelesai)} WIB)
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* 2. Alasan Ketidakhadiran */}
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>
                2. Alasan Ketidakhadiran{" "}
                <Text style={styles.requiredMark}>*</Text>
              </Text>
              <Text style={styles.sectionSub}>
                Jelaskan alasan izin Anda. Model AI akan menganalisis sentimen
                alasan ini sebagai informasi pendukung bagi asisten.
              </Text>

              <TextInput
                style={styles.textArea}
                placeholder="Contoh: Saya sedang sakit demam dan tidak bisa hadir di laboratorium hari ini."
                placeholderTextColor="#6EA4BF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={alasan}
                onChangeText={(val) => {
                  setAlasan(val);
                  if (aiPreview) setAiPreview(null);
                }}
              />

              <Pressable
                style={styles.aiButton}
                onPress={handleCekSentimen}
              >
                <AppIcon name="info" size={16} color="#41337A" />
                <Text style={styles.aiButtonText}>
                  Uji Sentimen AI Terlebih Dahulu
                </Text>
              </Pressable>

              {/* Preview Hasil AI jika sudah ditekan */}
              {aiPreview && (
                <View
                  style={[
                    styles.aiPreviewBox,
                    aiPreview.status === "success" && aiPreview.label
                      ? {
                          backgroundColor:
                            AI_SENTIMENT_CONFIG[aiPreview.label]?.bg ??
                            "#ECFEE8",
                          borderColor:
                            AI_SENTIMENT_CONFIG[aiPreview.label]?.border ??
                            "#6EA4BF",
                        }
                      : styles.aiPreviewFailed,
                  ]}
                >
                  <View style={styles.aiPreviewHeader}>
                    <AppIcon
                      name="info"
                      size={16}
                      color={
                        aiPreview.status === "success" && aiPreview.label
                          ? AI_SENTIMENT_CONFIG[aiPreview.label]?.text ??
                            "#331E36"
                          : "#991b1b"
                      }
                    />
                    <Text
                      style={[
                        styles.aiPreviewTitle,
                        aiPreview.status === "success" && aiPreview.label
                          ? {
                              color:
                                AI_SENTIMENT_CONFIG[aiPreview.label]?.text ??
                                "#331E36",
                            }
                          : { color: "#991b1b" },
                      ]}
                    >
                      {aiPreview.status === "success" && aiPreview.label
                        ? `Prediksi AI: ${aiPreview.label.toUpperCase()}`
                        : "AI: Tidak dapat mengenali pola teks"}
                    </Text>
                  </View>
                  <Text style={styles.aiPreviewNote}>
                    *Hasil analisis sentimen berasal dari AI dan bersifat eksperimental.*
                  </Text>
                  {aiPreview.confidence !== null && (
                    <Text style={styles.aiConfidenceText}>
                      Skor keyakinan model: {aiPreview.confidence}
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Tombol Kirim */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.submitBtnPressed,
                (!selectedSession || !alasan.trim() || isSubmitting) &&
                  styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedSession || !alasan.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <AppIcon name="check" size={16} color="#ffffff" />
                  <Text style={styles.submitBtnText}>
                    Kirimkan Pengajuan Izin
                  </Text>
                </>
              )}
            </Pressable>

            <View style={{ height: 120 }} />
          </ScrollView>
        ) : (
          /* TAB RIWAYAT */
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {permissionsLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#41337A" />
                <Text style={styles.loadingText}>Memuat riwayat izin…</Text>
              </View>
            ) : permissionsError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{permissionsError}</Text>
              </View>
            ) : permissions.length === 0 ? (
              <View style={styles.emptyBox}>
                <View style={styles.emptyIconCircle}>
                  <AppIcon name="clipboard" size={26} color="#6EA4BF" />
                </View>
                <Text style={styles.emptyTitle}>Belum Ada Pengajuan Izin</Text>
                <Text style={styles.emptySubtitle}>
                  Pengajuan izin ketidakhadiran yang Anda kirim akan tercatat di
                  sini beserta status persetujuan asisten.
                </Text>
                <Pressable
                  style={styles.emptyActionBtn}
                  onPress={() => setActiveTab("form")}
                >
                  <Text style={styles.emptyActionBtnText}>
                    Buat Pengajuan Baru
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.historyList}>
                {permissions.map((item) => {
                  const statusCfg =
                    STATUS_PERMISSION_CONFIG[item.status] ??
                    STATUS_PERMISSION_CONFIG.pending;
                  const aiCfg = item.aiCategory
                    ? AI_SENTIMENT_CONFIG[item.aiCategory]
                    : null;

                  const isAttended = attendedSessionIds.has(item.sessionId);

                  return (
                    <View key={item.id} style={styles.historyCard}>
                      <View style={styles.historyCardHeader}>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: statusCfg.bg,
                              borderColor: statusCfg.border,
                            },
                          ]}
                        >
                          <AppIcon
                            name={statusCfg.icon}
                            size={12}
                            color={statusCfg.text}
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: statusCfg.text },
                            ]}
                          >
                            {statusCfg.label}
                          </Text>
                        </View>

                        {isAttended && (
                          <View style={styles.attendedBadge}>
                            <AppIcon name="check" size={11} color="#166534" />
                            <Text style={styles.attendedBadgeText}>
                              Hadir di Sesi
                            </Text>
                          </View>
                        )}

                        {aiCfg && (
                          <View
                            style={[
                              styles.aiBadge,
                              {
                                backgroundColor: aiCfg.bg,
                                borderColor: aiCfg.border,
                              },
                            ]}
                          >
                            <AppIcon
                              name="info"
                              size={11}
                              color={aiCfg.text}
                            />
                            <Text
                              style={[
                                styles.aiBadgeText,
                                { color: aiCfg.text },
                              ]}
                            >
                              {aiCfg.label}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.historyMataKuliah}>
                        {item.mataKuliah || "Sesi Praktikum"}
                      </Text>
                      <Text style={styles.historyPertemuan}>
                        {item.namaPraktikum
                          ? `Pertemuan ${item.nomorPraktikum ?? 1} · ${
                              item.namaPraktikum
                            }`
                          : "Pertemuan Praktikum"}
                      </Text>

                      <View style={styles.alasanBox}>
                        <Text style={styles.alasanLabel}>Alasan Izin:</Text>
                        <Text style={styles.alasanText}>{item.alasan}</Text>
                      </View>

                      {isAttended && item.status === "pending" && (
                        <Text style={styles.attendedReplaceNote}>
                          *Pengajuan izin ini digantikan oleh kehadiran fisik Anda pada sesi ini.*
                        </Text>
                      )}

                      {item.aiCategory && (
                        <Text style={styles.aiNoteHistoryText}>
                          *Hasil analisis sentimen berasal dari AI dan bersifat eksperimental.*
                        </Text>
                      )}

                      <View style={styles.historyFooter}>
                        <Text style={styles.historyTime}>
                          Diajukan:{" "}
                          {item.createdAt
                            ? formatWaktuLengkap(item.createdAt.toISOString())
                            : "—"}
                        </Text>
                        {item.status !== "pending" && item.decidedAt && (
                          <Text style={styles.historyTime}>
                            Diputuskan:{" "}
                            {formatWaktuLengkap(item.decidedAt.toISOString())}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ height: 120 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Modal Feedback Pop-up */}
      <Modal
        visible={!!feedbackMessage}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackMessage(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.feedbackModalCard}>
            <View
              style={[
                styles.feedbackIconWrap,
                feedbackMessage?.type === "success"
                  ? styles.feedbackIconSuccess
                  : styles.feedbackIconError,
              ]}
            >
              <AppIcon
                name={
                  feedbackMessage?.type === "success"
                    ? "check"
                    : "alert"
                }
                size={24}
                color={
                  feedbackMessage?.type === "success" ? "#16a34a" : "#dc2626"
                }
              />
            </View>

            <Text style={styles.feedbackModalTitle}>
              {feedbackMessage?.type === "success" ? "Berhasil" : "Perhatian"}
            </Text>

            <Text style={styles.feedbackModalMessage}>
              {feedbackMessage?.text}
            </Text>

            <Pressable
              style={styles.feedbackModalBtn}
              onPress={() => setFeedbackMessage(null)}
            >
              <Text style={styles.feedbackModalBtnText}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ECFEE8",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#C2EFEB",
    backgroundColor: "#ffffff",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#41337A",

  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#331E36",

  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderColor: "#C2EFEB",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderColor: "transparent",
  },
  tabButtonActive: {
    borderColor: "#41337A",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6EA4BF",

  },
  tabTextActive: {
    color: "#41337A",
  },
  badgeCount: {
    backgroundColor: "#C2EFEB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#331E36",

  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    shadowColor: "#331E36",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#331E36",
    marginBottom: 4,

  },
  sectionSub: {
    fontSize: 13,
    color: "#6EA4BF",
    lineHeight: 18,
    marginBottom: 12,

  },
  emptySessionBox: {
    padding: 16,
    backgroundColor: "#ECFEE8",
    borderRadius: 12,
    alignItems: "center",
  },
  emptySessionText: {
    fontSize: 13,
    color: "#6EA4BF",
    textAlign: "center",

  },
  sessionList: {
    gap: 10,
  },
  sessionItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    backgroundColor: "#ECFEE8",
  },
  sessionItemActive: {
    borderColor: "#41337A",
    backgroundColor: "#C2EFEB",
  },
  sessionItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sessionItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#331E36",
    flex: 1,
    marginRight: 8,

  },
  sessionItemTitleActive: {
    color: "#41337A",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#6EA4BF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#41337A",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#41337A",
  },
  sessionItemSub: {
    fontSize: 12,
    fontWeight: "600",
    color: "#41337A",
    marginBottom: 2,

  },
  sessionItemTime: {
    fontSize: 11,
    color: "#6EA4BF",

  },
  textArea: {
    borderWidth: 1,
    borderColor: "#6EA4BF",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#331E36",
    minHeight: 100,
    backgroundColor: "#ffffff",
    lineHeight: 20,

  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#C2EFEB",
  },
  aiButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#41337A",

  },
  aiPreviewBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiPreviewFailed: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  aiPreviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  aiPreviewTitle: {
    fontSize: 13,
    fontWeight: "700",

  },
  aiPreviewNote: {
    fontSize: 12,
    color: "#331E36",
    lineHeight: 16,

  },
  aiConfidenceText: {
    fontSize: 11,
    color: "#6EA4BF",
    marginTop: 4,
    fontStyle: "italic",

  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#41337A",
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#41337A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  submitBtnPressed: {
    opacity: 0.85,
  },
  submitBtnDisabled: {
    backgroundColor: "#6EA4BF",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",

  },
  loadingBox: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#6EA4BF",

  },
  errorBox: {
    padding: 16,
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    borderColor: "#fecaca",
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    color: "#991b1b",

  },
  emptyBox: {
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ECFEE8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#331E36",

  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6EA4BF",
    textAlign: "center",
    lineHeight: 18,

  },
  emptyActionBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#41337A",
    borderRadius: 8,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",

  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#C2EFEB",
  },
  historyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",

  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "700",

  },
  historyMataKuliah: {
    fontSize: 15,
    fontWeight: "700",
    color: "#331E36",

  },
  historyPertemuan: {
    fontSize: 12,
    color: "#6EA4BF",
    marginBottom: 10,

  },
  alasanBox: {
    backgroundColor: "#ECFEE8",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ECFEE8",
    marginBottom: 8,
  },
  alasanLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#41337A",
    marginBottom: 2,

  },
  alasanText: {
    fontSize: 13,
    color: "#331E36",
    lineHeight: 18,

  },
  attendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
    borderWidth: 1,
  },
  attendedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",

  },
  attendedReplaceNote: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#166534",
    marginBottom: 8,
    lineHeight: 15,

  },
  aiNoteHistoryText: {
    fontSize: 11,
    fontStyle: "italic",
    color: "#6EA4BF",
    marginBottom: 8,

  },
  historyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  historyTime: {
    fontSize: 11,
    color: "#6EA4BF",

  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(51, 30, 54, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  feedbackModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
  },
  feedbackIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  feedbackIconSuccess: {
    backgroundColor: "#dcfce7",
  },
  feedbackIconError: {
    backgroundColor: "#fee2e2",
  },
  feedbackModalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#331E36",
    marginBottom: 6,

  },
  feedbackModalMessage: {
    fontSize: 13,
    color: "#41337A",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,

  },
  feedbackModalBtn: {
    width: "100%",
    paddingVertical: 12,
    backgroundColor: "#41337A",
    borderRadius: 10,
    alignItems: "center",
  },
  feedbackModalBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",

  },
  requiredMark: {
    color: "#dc2626",
    fontWeight: "700",

  },
});
