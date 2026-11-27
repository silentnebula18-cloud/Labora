import { useEffect, useMemo, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RADIUS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useSession } from "../context/SessionContext";
import { describeFirestoreError } from "../services/classService";
import {
  getLocationErrorDetail,
  openLocationSettings,
  promptEnableLocationServices,
  type LocationErrorCode,
} from "../services/locationService";
import { subscribeStudentSessionPermission } from "../services/permissionService";
import {
  isScheduleExpired as checkScheduleExpired,
  subscribeStudentSessionAttendance,
  type SessionWithMeta,
} from "../services/sessionService";
import type { Attendance, PermissionRecord, SessionStatus } from "../types";
import { formatJam, formatTanggal } from "../utils/format";
import AppIcon from "./AppIcon";
import BottomSheetModal from "./BottomSheetModal";

interface PraktikanPresensiViewProps {
  onBackToHome?: () => void;
}

const LOCATION_ERROR_CODES = new Set<string>([
  "LAB_TIDAK_DITEMUKAN",
  "IZIN_LOKASI_DITOLAK",
  "GPS_TIDAK_AKTIF",
  "LOKASI_GAGAL",
  "DI_LUAR_RADIUS",
]);

interface ResultPopupState {
  type: "success" | "error";
  title: string;
  message: string;
  details?: {
    mataKuliah: string;
    pertemuan: string;
    ruang: string;
    waktuHadir: string;
  };
  actionType?: "open_settings" | "enable_gps" | "none";
  actionLabel?: string;
}

const STATUS_BADGE: Record<
  SessionStatus,
  { label: string; bg: string; text: string }
> = {
  scheduled: {
    label: "Terjadwal",
    bg: COLORS.neutralBadgeBg,
    text: COLORS.neutralBadgeText,
  },
  open: {
    label: "Berlangsung",
    bg: COLORS.successBg,
    text: COLORS.successText,
  },
  closed: {
    label: "Selesai",
    bg: COLORS.neutralBadgeBg,
    text: COLORS.neutralBadgeText,
  },
};

function DetailRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          valueColor ? { color: valueColor, fontWeight: "700" } : null,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
}

export default function PraktikanPresensiView({
  onBackToHome,
}: PraktikanPresensiViewProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { studentSessions, myAttendances, markAttendance } = useSession();

  const [kodeInput, setKodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultPopup, setResultPopup] = useState<ResultPopupState | null>(null);
  const submittingRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const sessionByCodeMap = useMemo(() => {
    const map = new Map<string, SessionWithMeta>();
    studentSessions.forEach((sess) => {
      const code = (sess.kodePresensi ?? "").trim().toUpperCase();
      if (code) {
        map.set(code, sess);
      }
    });
    return map;
  }, [studentSessions]);

  const normalizedCode = kodeInput.trim().toUpperCase();
  const matchedSession = useMemo(() => {
    if (normalizedCode.length < 4) return null;
    return sessionByCodeMap.get(normalizedCode) ?? null;
  }, [normalizedCode, sessionByCodeMap]);

  const [realtimeAttendance, setRealtimeAttendance] =
    useState<Attendance | null>(null);
  const [rawPermission, setRawPermission] =
    useState<PermissionRecord | null>(null);

  useEffect(() => {
    if (!matchedSession?.id || !user?.id) {
      return;
    }
    const unsubscribe = subscribeStudentSessionAttendance(
      matchedSession.id,
      user.id,
      (att) => {
        setRealtimeAttendance(att);
      },
    );
    return unsubscribe;
  }, [matchedSession?.id, user?.id]);

  useEffect(() => {
    if (!matchedSession?.id || !user?.id) {
      return;
    }
    const unsubscribe = subscribeStudentSessionPermission(
      user.id,
      matchedSession.id,
      (rec) => {
        setRawPermission(rec);
      },
    );
    return unsubscribe;
  }, [matchedSession?.id, user?.id]);

  const permission = useMemo(() => {
    if (!matchedSession) return null;
    if (rawPermission && rawPermission.sessionId === matchedSession.id) {
      return rawPermission;
    }
    return null;
  }, [matchedSession, rawPermission]);

  const attendance = useMemo(() => {
    if (!matchedSession) return null;
    if (
      realtimeAttendance &&
      realtimeAttendance.sessionId === matchedSession.id
    ) {
      return realtimeAttendance;
    }
    return (
      myAttendances.find((a) => a.sessionId === matchedSession.id) ?? null
    );
  }, [matchedSession, myAttendances, realtimeAttendance]);

  const isScheduleExpired = useMemo(() => {
    if (!matchedSession) return false;
    return checkScheduleExpired(
      matchedSession.tanggal,
      matchedSession.jamSelesai,
      currentTime,
    );
  }, [matchedSession, currentTime]);

  async function handlePopupAction(actionType?: string) {
    if (actionType === "open_settings") {
      await openLocationSettings();
    } else if (actionType === "enable_gps") {
      await promptEnableLocationServices();
    }
    setResultPopup(null);
  }

  function handleClosePopup() {
    const wasSuccess = resultPopup?.type === "success";
    setResultPopup(null);
    if (wasSuccess) {
      setKodeInput("");
    }
  }

  async function handlePresensi() {
    if (!matchedSession || !user || submittingRef.current) return;

    if (permission?.status === "approved") {
      setResultPopup({
        type: "error",
        title: "Presensi tidak diperlukan",
        message: "Pengajuan izinmu untuk sesi ini sudah disetujui asisten.",
      });
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await markAttendance(matchedSession.id, user.id, {
        nama: user.nama,
        nim: user.nim,
      });

      if (result.ok) {
        const nomorFormatted = String(
          matchedSession.practicum?.nomorPraktikum ?? 1,
        ).padStart(2, "0");

        setResultPopup({
          type: "success",
          title: "Presensi berhasil!",
          message: "Kehadiranmu sudah tercatat. Selamat mengikuti praktikum.",
          details: {
            mataKuliah: matchedSession.practicum?.mataKuliah ?? "Mata Kuliah",
            pertemuan: `Pertemuan ${nomorFormatted} · ${matchedSession.practicum?.namaPraktikum ?? "Sesi Praktikum"}`,
            ruang: matchedSession.ruang,
            waktuHadir: `${formatJam(result.attendance.waktuHadir)} WIB`,
          },
        });
      } else {
        const isLocError = LOCATION_ERROR_CODES.has(result.code);
        const locDetail = isLocError
          ? getLocationErrorDetail(result.code as LocationErrorCode)
          : null;

        setResultPopup({
          type: "error",
          title: locDetail?.title ?? "Presensi gagal",
          message: result.message || locDetail?.guide || "Gagal mencatat presensi.",
          actionType:
            locDetail?.actionType === "open_settings" ||
            locDetail?.actionType === "enable_gps"
              ? locDetail.actionType
              : "none",
          actionLabel:
            locDetail?.actionType === "open_settings" ||
            locDetail?.actionType === "enable_gps"
              ? locDetail.actionLabel
              : undefined,
        });
      }
    } catch (error) {
      setResultPopup({
        type: "error",
        title: "Presensi gagal",
        message: describeFirestoreError(error),
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const paddingTop = Math.max(insets.top + 14, 24);
  const statusBadge = matchedSession
    ? (STATUS_BADGE[matchedSession.status] ?? STATUS_BADGE.scheduled)
    : STATUS_BADGE.scheduled;

  return (
    <KeyboardAvoidingView
      style={styles.screenBg}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.screenBg}
        contentContainerStyle={[styles.content, { paddingTop }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Presensi</Text>
        <Text style={styles.pageSubtitle}>
          Masukkan kode sesi dari asisten untuk mencatat kehadiran.
        </Text>

        {/* Kartu Input Kode Presensi */}
        <View style={styles.codeCard}>
          <Text style={styles.fieldLabel}>
            Kode sesi <Text style={styles.requiredMark}>*</Text>
          </Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.codeInput}
              value={kodeInput}
              onChangeText={(text) => {
                const cleaned = text
                  .replace(/[^A-Z0-9]/gi, "")
                  .toUpperCase()
                  .slice(0, 8);
                setKodeInput(cleaned);
              }}
              placeholder="XXXXXXX"
              placeholderTextColor="rgba(107, 114, 128, 0.38)"
              selectionColor={COLORS.primary}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
            {kodeInput.length > 0 && (
              <Pressable
                style={styles.resetBtn}
                onPress={() => setKodeInput("")}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Kondisi Kode Kosong / Tidak Valid / Ditemukan */}
        {normalizedCode.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon
                name="user-round-check"
                size={24}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Siap melakukan presensi</Text>
            <Text style={styles.emptySubtitle}>
              Rincian sesi akan tampil otomatis setelah kode sesi dimasukkan.
            </Text>
          </View>
        ) : !matchedSession ? (
          <View style={styles.invalidCard}>
            <View style={styles.invalidIconCircle}>
              <AppIcon name="alert" size={22} color={COLORS.dangerText} />
            </View>
            <Text style={styles.invalidTitle}>
              {normalizedCode.length < 7
                ? "Lengkapi kode sesi"
                : "Kode sesi tidak ditemukan"}
            </Text>
            <Text style={styles.invalidSubtitle}>
              {normalizedCode.length < 7
                ? "Masukkan kode sesi secara lengkap seperti yang ditampilkan asisten."
                : "Pastikan kode benar dan kamu terdaftar pada kelas sesi tersebut."}
            </Text>
          </View>
        ) : (
          <>
            {/* Kartu Informasi Sesi */}
            <View style={styles.summaryCard}>
              <View style={styles.sessionTopRow}>
                <Text
                  style={styles.sessionMetaOverline}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  KELAS {matchedSession.kelas?.namaKelas ?? "—"} · PERTEMUAN{" "}
                  {String(
                    matchedSession.practicum?.nomorPraktikum ?? 1,
                  ).padStart(2, "0")}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: statusBadge.bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: statusBadge.text },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {statusBadge.label}
                  </Text>
                </View>
              </View>

              <Text
                style={styles.summaryCourse}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {matchedSession.practicum?.mataKuliah ?? "Mata Kuliah"}
              </Text>
              <Text
                style={styles.summarySub}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {matchedSession.practicum?.namaPraktikum ?? "Sesi Praktikum"}
              </Text>

              <View style={styles.summaryRows}>
                <DetailRow
                  label="Tanggal"
                  value={formatTanggal(matchedSession.tanggal)}
                />
                <DetailRow
                  label="Waktu"
                  value={`${formatJam(matchedSession.jamMulai)}–${formatJam(matchedSession.jamSelesai)} WIB`}
                />
                <DetailRow label="Laboratorium" value={matchedSession.ruang} />
              </View>
            </View>

            {/* Panel Status / Tombol Presensi (Validasi Lokasi Otomatis Saat Klik) */}
            {attendance ? (
              <View style={[styles.stateCard, styles.stateCardMint]}>
                <AppIcon name="check" size={22} color={COLORS.primary} />
                <Text style={styles.stateCardTitle}>Kehadiran tercatat</Text>
                <Text style={styles.stateCardDesc}>
                  Kamu sudah tercatat hadir pada pukul{" "}
                  {formatJam(attendance.waktuHadir)} WIB.
                </Text>
              </View>
            ) : permission?.status === "approved" ? (
              <View style={[styles.stateCard, styles.stateCardMint]}>
                <AppIcon name="check" size={22} color={COLORS.primary} />
                <Text style={styles.stateCardTitle}>Izin sudah disetujui</Text>
                <Text style={styles.stateCardDesc}>
                  Pengajuan izinmu untuk sesi ini telah disetujui asisten. Kamu
                  tidak perlu melakukan presensi.
                </Text>
              </View>
            ) : matchedSession.status === "open" && !isScheduleExpired ? (
              <View style={styles.openActionSection}>
                {permission?.status === "pending" && (
                  <View style={styles.pendingNote}>
                    <AppIcon name="info" size={15} color={COLORS.warningText} />
                    <Text style={styles.pendingNoteText}>
                      Izinmu masih menunggu tinjauan. Jika kamu hadir di lab,
                      lanjutkan presensi di bawah.
                    </Text>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && !isSubmitting && styles.primaryBtnPressed,
                    isSubmitting && styles.primaryBtnDisabled,
                  ]}
                  onPress={handlePresensi}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <View style={styles.submittingRow}>
                      <ActivityIndicator color={COLORS.textOnPrimary} />
                      <Text style={styles.primaryBtnText}>
                        Memvalidasi lokasi…
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>Presensi Sekarang</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={[styles.stateCard, styles.stateCardNeutral]}>
                <AppIcon
                  name={
                    matchedSession.status === "scheduled" ? "clock" : "lock"
                  }
                  size={22}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.stateCardTitle}>
                  {matchedSession.status === "scheduled"
                    ? "Sesi belum dibuka"
                    : "Sesi sudah ditutup"}
                </Text>
                <Text style={styles.stateCardDesc}>
                  {matchedSession.status === "scheduled"
                    ? "Presensi baru dapat dilakukan setelah asisten membuka sesi praktikum."
                    : "Waktu presensi untuk sesi ini telah berakhir."}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Pop-up Hasil Presensi (Berhasil / Gagal dengan Alasan) */}
      <BottomSheetModal
        visible={!!resultPopup}
        onClose={handleClosePopup}
        contentStyle={styles.popupContent}
      >
        {resultPopup && (
          <View style={styles.popupBody}>
            <View
              style={[
                styles.popupIconCircle,
                resultPopup.type === "success"
                  ? styles.popupIconSuccess
                  : styles.popupIconError,
              ]}
            >
              <AppIcon
                name={resultPopup.type === "success" ? "check" : "alert"}
                size={28}
                color={
                  resultPopup.type === "success"
                    ? COLORS.primary
                    : COLORS.dangerText
                }
                strokeWidth={2.3}
              />
            </View>

            <Text style={styles.popupTitle}>{resultPopup.title}</Text>
            <Text style={styles.popupMessage}>{resultPopup.message}</Text>

            {resultPopup.type === "success" && resultPopup.details && (
              <View style={styles.popupSummaryBox}>
                <DetailRow
                  label="Mata kuliah"
                  value={resultPopup.details.mataKuliah}
                />
                <DetailRow
                  label="Pertemuan"
                  value={resultPopup.details.pertemuan}
                />
                <DetailRow
                  label="Laboratorium"
                  value={resultPopup.details.ruang}
                />
                <DetailRow
                  label="Waktu hadir"
                  value={resultPopup.details.waktuHadir}
                  valueColor={COLORS.primary}
                />
              </View>
            )}

            {resultPopup.type === "success" && onBackToHome && (
              <Pressable
                style={({ pressed }) => [
                  styles.popupPrimaryBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={() => {
                  setResultPopup(null);
                  setKodeInput("");
                  onBackToHome();
                }}
              >
                <Text style={styles.primaryBtnText}>Kembali ke Beranda</Text>
              </Pressable>
            )}

            {resultPopup.type === "error" &&
              resultPopup.actionType &&
              resultPopup.actionType !== "none" &&
              resultPopup.actionLabel && (
                <Pressable
                  style={({ pressed }) => [
                    styles.popupPrimaryBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={() => void handlePopupAction(resultPopup.actionType)}
                >
                  <Text style={styles.primaryBtnText}>
                    {resultPopup.actionLabel}
                  </Text>
                </Pressable>
              )}
          </View>
        )}
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  codeCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  requiredMark: {
    color: COLORS.dangerText,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2.5,
    color: COLORS.primary,
    textAlign: "center",
  },
  resetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
  invalidCard: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.lg,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  invalidIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  invalidTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.dangerDark,
    marginBottom: 4,
  },
  invalidSubtitle: {
    fontSize: 12.5,
    color: COLORS.dangerDark,
    textAlign: "center",
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  sessionMetaOverline: {
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  statusPill: {
    borderRadius: RADIUS.xs,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  summaryCourse: {
    fontSize: 15.5,
    fontWeight: "700",
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  summarySub: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 3,
    marginBottom: 12,
  },
  summaryRows: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
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
  openActionSection: {
    gap: 12,
  },
  pendingNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.warningBg,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    borderRadius: RADIUS.md,
    padding: 11,
  },
  pendingNoteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.warningText,
    lineHeight: 17,
  },
  stateCard: {
    borderRadius: RADIUS.lg,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    gap: 5,
  },
  stateCardMint: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primaryBorder,
  },
  stateCardNeutral: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
  },
  stateCardTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  stateCardDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  submittingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  // Pop-up Hasil Presensi
  popupContent: {
    paddingHorizontal: 20,
  },
  popupBody: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 6,
  },
  popupIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  popupIconSuccess: {
    backgroundColor: COLORS.primarySoft,
  },
  popupIconError: {
    backgroundColor: COLORS.dangerBg,
  },
  popupTitle: {
    fontSize: 17.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  popupMessage: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 14,
  },
  popupSummaryBox: {
    width: "100%",
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 9,
    marginBottom: 16,
  },
  popupPrimaryBtn: {
    width: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});
