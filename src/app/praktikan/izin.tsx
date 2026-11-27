import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import BottomNavBar from "../../components/BottomNavBar";
import SelectDropdown, {
  type DropdownOption,
} from "../../components/SelectDropdown";
import { COLORS, RADIUS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import {
  analyzeSentiment,
  normalizeConfidencePercentage,
} from "../../services/aiService";
import { describeFirestoreError } from "../../services/classService";
import {
  getExistingPermission,
  submitPermissionRequest,
  subscribeStudentPermissions,
} from "../../services/permissionService";
import type { PermissionRecord, PermissionStatus } from "../../types";
import {
  formatJam,
  formatTanggal,
  formatWaktuLengkap,
} from "../../utils/format";

const STATUS_PILL: Record<
  PermissionStatus,
  { label: string; bg: string; text: string }
> = {
  pending: {
    label: "Menunggu",
    bg: COLORS.neutralBadgeBg,
    text: COLORS.neutralBadgeText,
  },
  approved: {
    label: "Disetujui",
    bg: COLORS.successBg,
    text: COLORS.successText,
  },
  rejected: {
    label: "Ditolak",
    bg: COLORS.dangerBg,
    text: COLORS.dangerText,
  },
};

const SENTIMENT_LABEL: Record<
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

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

  const availableSessions = useMemo(
    () =>
      studentSessions.filter(
        (s) => !attendedSessionIds.has(s.id) && s.status !== "closed",
      ),
    [studentSessions, attendedSessionIds],
  );

  const sessionOptions: DropdownOption[] = useMemo(
    () =>
      availableSessions.map((s) => ({
        value: s.id,
        label: `${s.practicum?.mataKuliah ?? "Praktikum"} · Kelas ${s.kelas?.namaKelas ?? "—"}`,
        subtitle: `${formatTanggal(s.tanggal)} · ${formatJam(s.jamMulai).replace(":", ".")}–${formatJam(s.jamSelesai).replace(":", ".")}`,
      })),
    [availableSessions],
  );

  const effectiveSessionId =
    selectedSessionId || availableSessions[0]?.id || "";

  const selectedSession = useMemo(() => {
    return (
      studentSessions.find(
        (s) =>
          s.id === effectiveSessionId || s.scheduleId === effectiveSessionId,
      ) ?? null
    );
  }, [studentSessions, effectiveSessionId]);

  const liveSentiment = useMemo(() => {
    if (!alasan.trim()) return null;
    return analyzeSentiment(alasan);
  }, [alasan]);

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
        text: "Alasan izin wajib diisi",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
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

  const sentimentCfg = liveSentiment?.label
    ? SENTIMENT_LABEL[liveSentiment.label]
    : null;

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
          <Text style={styles.headerTitle}>Pengajuan Izin</Text>
        </Pressable>
      </View>

      {/* Segmented Tab: Ajukan Izin | Riwayat */}
      <View style={styles.segmentWrap}>
        <View style={styles.segmentedTrack}>
          <Pressable
            style={[
              styles.segmentBtn,
              activeTab === "form" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("form")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "form" && styles.segmentTextActive,
              ]}
            >
              Ajukan Izin
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentBtn,
              activeTab === "riwayat" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("riwayat")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "riwayat" && styles.segmentTextActive,
              ]}
            >
              Riwayat
            </Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {activeTab === "form" ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {feedbackMessage && (
              <View
                style={[
                  styles.feedbackBanner,
                  feedbackMessage.type === "success"
                    ? styles.feedbackSuccess
                    : styles.feedbackError,
                ]}
              >
                <AppIcon
                  name={feedbackMessage.type === "success" ? "check" : "alert"}
                  size={16}
                  color={
                    feedbackMessage.type === "success"
                      ? COLORS.successText
                      : COLORS.dangerText
                  }
                />
                <Text
                  style={[
                    styles.feedbackText,
                    {
                      color:
                        feedbackMessage.type === "success"
                          ? COLORS.successText
                          : COLORS.dangerDark,
                    },
                  ]}
                >
                  {feedbackMessage.text}
                </Text>
              </View>
            )}

            {/* 1. Dropdown Sesi Praktikum */}
            <Text style={styles.fieldLabel}>
              Sesi praktikum <Text style={styles.requiredMark}>*</Text>
            </Text>
            <SelectDropdown
              value={effectiveSessionId}
              options={sessionOptions}
              onChange={(val) => {
                setSelectedSessionId(val);
                setFeedbackMessage(null);
              }}
              placeholder="Pilih sesi praktikum"
              emptyText="Tidak ada sesi aktif/mendatang untuk diajukan izin"
              disabled={isSubmitting}
            />

            {/* 2. Alasan Izin */}
            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>
              Alasan izin <Text style={styles.requiredMark}>*</Text>
            </Text>
            <View style={styles.textAreaCard}>
              <TextInput
                style={styles.textAreaInput}
                value={alasan}
                onChangeText={(t) => {
                  setAlasan(t);
                  setFeedbackMessage(null);
                }}
                placeholder="Tuliskan alasan ketidakhadiran secara jelas dan sopan..."
                placeholderTextColor={COLORS.textMuted}
                selectionColor={COLORS.primary}
                multiline
                maxLength={500}
                textAlignVertical="top"
                editable={!isSubmitting}
              />
              <Text style={styles.charCounter}>{alasan.length}/500</Text>
            </View>

            {/* 3. Kartu Pratinjau Sentimen AI (Sesuai `ajukan-izin.png`) */}
            <View style={styles.aiCard}>
              <AppIcon name="sparkles" size={18} color={COLORS.primary} />
              {sentimentCfg && liveSentiment ? (
                <View style={styles.aiResultRow}>
                  <View
                    style={[
                      styles.aiPill,
                      { backgroundColor: sentimentCfg.bg },
                    ]}
                  >
                    <Text
                      style={[styles.aiPillText, { color: sentimentCfg.text }]}
                    >
                      {sentimentCfg.label}
                    </Text>
                  </View>
                  {normalizeConfidencePercentage(liveSentiment.confidence) !==
                    null && (
                    <Text style={styles.aiConfidenceText}>
                      {normalizeConfidencePercentage(liveSentiment.confidence)}%
                    </Text>
                  )}
                </View>
              ) : alasan.trim().length > 0 ? (
                <Text style={styles.aiPlaceholderText}>
                  AI · Tuliskan alasan yang lebih lengkap agar dapat dianalisis
                </Text>
              ) : (
                <Text style={styles.aiPlaceholderText}>
                  AI · Sentimen alasan dianalisis otomatis
                </Text>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && !isSubmitting && styles.submitBtnPressed,
                isSubmitting && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color={COLORS.textOnPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>Kirim Pengajuan Izin</Text>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          /* Tab Riwayat Izin (Sesuai `riwayat-izin.png`) */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.historyCountLabel}>
              {permissions.length} pengajuan tercatat
            </Text>

            {permissionsLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.loadingText}>Memuat riwayat izin…</Text>
              </View>
            )}

            {permissionsError && (
              <View style={[styles.feedbackBanner, styles.feedbackError]}>
                <Text style={[styles.feedbackText, { color: COLORS.dangerDark }]}>
                  {permissionsError}
                </Text>
              </View>
            )}

            {!permissionsLoading &&
              !permissionsError &&
              permissions.length === 0 && (
                <View style={styles.emptyBox}>
                  <View style={styles.emptyIconCircle}>
                    <AppIcon
                      name="file-text"
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Belum ada pengajuan</Text>
                  <Text style={styles.emptySubtitle}>
                    Riwayat pengajuan izin praktikum kamu akan tampil di sini.
                  </Text>
                </View>
              )}

            {!permissionsLoading &&
              permissions.map((item) => {
                const pill =
                  STATUS_PILL[item.status] ?? STATUS_PILL.pending;
                const matchedSess = studentSessions.find(
                  (s) =>
                    s.id === item.sessionId || s.scheduleId === item.sessionId,
                );
                const topDateText = matchedSess
                  ? `${formatTanggal(matchedSess.tanggal)} · ${formatJam(matchedSess.jamMulai).replace(":", ".")}`
                  : `Pertemuan ${item.nomorPraktikum}`;

                return (
                  <View key={item.id} style={styles.historyCard}>
                    <View style={styles.historyTopRow}>
                      <Text
                        style={styles.historyDateText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {topDateText}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: pill.bg },
                        ]}
                      >
                        <Text
                          style={[styles.statusPillText, { color: pill.text }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {pill.label}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={styles.historyCourse}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.mataKuliah}
                    </Text>
                    <Text
                      style={styles.historyReason}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {item.alasan}
                    </Text>

                    {item.aiCategory && SENTIMENT_LABEL[item.aiCategory] && (
                      <View style={styles.historyAiRow}>
                        <View
                          style={[
                            styles.aiPill,
                            {
                              backgroundColor:
                                SENTIMENT_LABEL[item.aiCategory].bg,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.aiPillText,
                              {
                                color: SENTIMENT_LABEL[item.aiCategory].text,
                              },
                            ]}
                          >
                            {SENTIMENT_LABEL[item.aiCategory].label}
                          </Text>
                        </View>
                      </View>
                    )}

                    <Text
                      style={[
                        styles.historyFooterNote,
                        item.status === "rejected" && {
                          color: COLORS.dangerText,
                        },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.status === "approved"
                        ? `Disetujui asisten${
                            item.decidedAt
                              ? ` · ${formatWaktuLengkap(item.decidedAt.toISOString())} WIB`
                              : ""
                          }`
                        : item.status === "rejected"
                          ? `Ditolak asisten${
                              item.decidedAt
                                ? ` · ${formatWaktuLengkap(item.decidedAt.toISOString())} WIB`
                                : ""
                            }`
                          : item.createdAt
                            ? `Diajukan ${formatTanggal(item.createdAt)}, ${formatWaktuLengkap(item.createdAt.toISOString())} WIB`
                            : "Menunggu tinjauan asisten"}
                    </Text>
                  </View>
                );
              })}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <BottomNavBar role="praktikan" activeTab="beranda" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  segmentWrap: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  segmentedTrack: {
    flexDirection: "row",
    backgroundColor: COLORS.segmentedTrack,
    borderRadius: RADIUS.md,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: COLORS.background,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  requiredMark: {
    color: COLORS.dangerText,
    fontWeight: "700",
  },
  textAreaCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    padding: 14,
  },
  textAreaInput: {
    minHeight: 96,
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  charCounter: {
    alignSelf: "flex-end",
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
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
  aiResultRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  aiConfidenceText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  historyAiRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  aiPlaceholderText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  submitBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: 12,
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

  // Riwayat Tab
  historyCountLabel: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  historyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  historyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  historyDateText: {
    flex: 1,
    minWidth: 0,
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  statusPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "500",
  },
  historyCourse: {
    fontSize: 14.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  historyReason: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  historyFooterNote: {
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  emptyBox: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
