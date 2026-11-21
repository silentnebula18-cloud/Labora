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

import { useAuth } from "../context/AuthContext";
import { useSession } from "../context/SessionContext";
import { describeFirestoreError } from "../services/classService";
import {
  validateStudentLabProximity,
  type LocationValidationResult,
} from "../services/locationService";
import { subscribeStudentSessionPermission } from "../services/permissionService";
import {
  isScheduleExpired as checkScheduleExpired,
  subscribeStudentSessionAttendance,
  type SessionWithMeta,
} from "../services/sessionService";
import type { Attendance, PermissionRecord, SessionStatus } from "../types";
import { formatJam, formatTanggal, formatWaktuLengkap } from "../utils/format";
import AppIcon from "./AppIcon";

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Terjadwal (Belum Dibuka)",
  open: "Presensi Dibuka",
  closed: "Selesai (Ditutup)",
};

const STATUS_STYLE: Record<
  SessionStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  scheduled: {
    bg: "#f8fafc",
    border: "#cbd5e1",
    text: "#334155",
    dot: "#64748b",
  },
  open: {
    bg: "#e6f4ea",
    border: "#b7dfc2",
    text: "#0f5132",
    dot: "#15803d",
  },
  closed: {
    bg: "#f1f5f9",
    border: "#cbd5e1",
    text: "#475569",
    dot: "#94a3b8",
  },
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function PraktikanPresensiView() {
  const { user } = useAuth();
  const { studentSessions, myAttendances, markAttendance } = useSession();

  const [kodeInput, setKodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const submittingRef = useRef(false);

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Pemetaan O(1) kodePresensi -> SessionWithMeta (tanpa mencari satu per satu saat input diketik)
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

  const [locationState, setLocationState] = useState<{
    sessionId: string;
    loading: boolean;
    result: LocationValidationResult | null;
  } | null>(null);

  const matchedSessionId = matchedSession?.id ?? null;
  const matchedSessionRuang = matchedSession?.ruang ?? "";
  const isOpenForAttendance = Boolean(
    matchedSession &&
      matchedSession.status === "open" &&
      !isScheduleExpired &&
      !attendance &&
      permission?.status !== "approved",
  );

  useEffect(() => {
    if (!isOpenForAttendance || !matchedSessionId || !matchedSessionRuang) {
      return;
    }

    let cancelled = false;
    void validateStudentLabProximity(matchedSessionRuang).then((res) => {
      if (!cancelled) {
        setLocationState({
          sessionId: matchedSessionId,
          loading: false,
          result: res,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpenForAttendance, matchedSessionId, matchedSessionRuang]);

  const currentLocationCheck = useMemo(() => {
    if (!matchedSessionId) return { loading: false, result: null };
    if (!locationState || locationState.sessionId !== matchedSessionId) {
      return { loading: true, result: null };
    }
    return {
      loading: locationState.loading,
      result: locationState.result,
    };
  }, [locationState, matchedSessionId]);

  async function handleRefreshLocation() {
    if (!matchedSessionId || !matchedSessionRuang) return;
    setLocationState({
      sessionId: matchedSessionId,
      loading: true,
      result: null,
    });
    const res = await validateStudentLabProximity(matchedSessionRuang);
    setLocationState({
      sessionId: matchedSessionId,
      loading: false,
      result: res,
    });
  }

  async function handlePresensi() {
    if (!matchedSession || !user || submittingRef.current) return;

    if (permission?.status === "approved") {
      setFeedback({
        type: "error",
        message: "Izin sudah disetujui",
      });
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const result = await markAttendance(matchedSession.id, user.id, {
        nama: user.nama,
        nim: user.nim,
      });

      if (result.ok) {
        const distanceNote =
          typeof result.attendance.jarakMeter === "number"
            ? ` (Jarak: ${result.attendance.jarakMeter} m)`
            : "";
        setFeedback({
          type: "success",
          message: `Presensi tercatat pada ${formatWaktuLengkap(
            result.attendance.waktuHadir,
          )}${distanceNote}`,
        });
      } else {
        setFeedback({
          type: "error",
          message: result.message,
        });
        void handleRefreshLocation();
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: describeFirestoreError(error),
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const statusTheme = matchedSession
    ? (STATUS_STYLE[matchedSession.status] ?? STATUS_STYLE.scheduled)
    : STATUS_STYLE.scheduled;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Kartu Input Kode Presensi */}
        <View style={styles.codeCard}>
          <View style={styles.codeCardHeader}>
            <View style={styles.codeIconCircle}>
              <AppIcon name="check" size={20} color="#2563eb" />
            </View>
            <View style={styles.codeHeaderTextWrap}>
              <Text style={styles.codeTitle}>
                Kode Presensi Sesi <Text style={styles.requiredMark}>*</Text>
              </Text>
              <Text style={styles.codeSubtitle}>
                Masukkan kode sesi dari asisten (contoh: A114829)
              </Text>
            </View>
          </View>

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
                setFeedback(null);
              }}
              placeholder="A114829"
              placeholderTextColor="#94a3b8"
              selectionColor="#2563eb"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
            {kodeInput.length > 0 && (
              <Pressable
                style={styles.resetBtn}
                onPress={() => {
                  setKodeInput("");
                  setFeedback(null);
                }}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Feedback Banner */}
        {feedback && (
          <View
            style={[
              styles.feedbackBanner,
              feedback.type === "success"
                ? styles.feedbackSuccess
                : styles.feedbackError,
            ]}
          >
            <AppIcon
              name={feedback.type === "success" ? "check" : "alert"}
              size={16}
              color={feedback.type === "success" ? "#0f5132" : "#991b1b"}
            />
            <Text
              style={[
                styles.feedbackText,
                {
                  color: feedback.type === "success" ? "#0f5132" : "#991b1b",
                },
              ]}
            >
              {feedback.message}
            </Text>
          </View>
        )}

        {/* Kondisi Ketika Kode Belum Lengkap / Tidak Valid / Cocok */}
        {normalizedCode.length === 0 ? (
          <View style={styles.infoStateCard}>
            <View style={styles.infoStateIcon}>
              <AppIcon name="search" size={24} color="#64748b" />
            </View>
            <Text style={styles.infoStateTitle}>Masukkan Kode Presensi</Text>
            <Text style={styles.infoStateSubtitle}>
              Informasi sesi dan tombol presensi akan tampil otomatis setelah
              Anda memasukkan kode sesi yang valid.
            </Text>
          </View>
        ) : !matchedSession ? (
          <View style={styles.invalidCard}>
            <View style={styles.invalidIcon}>
              <AppIcon name="alert" size={24} color="#dc2626" />
            </View>
            <Text style={styles.invalidTitle}>
              {normalizedCode.length < 7
                ? "Lengkapi Kode Presensi"
                : "Kode Presensi Tidak Valid"}
            </Text>
            <Text style={styles.invalidSubtitle}>
              {normalizedCode.length < 7
                ? "Masukkan kode sesi secara lengkap dari asisten."
                : "Kode tidak ditemukan atau Anda tidak terdaftar di kelas sesi tersebut."}
            </Text>
          </View>
        ) : (
          <>
            {/* Kartu Informasi & Status Sesi */}
            <View style={styles.sessionCard}>
              <View style={styles.sessionCardTopRow}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: statusTheme.bg,
                      borderColor: statusTheme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: statusTheme.dot },
                    ]}
                  />
                  <Text
                    style={[styles.statusLabel, { color: statusTheme.text }]}
                  >
                    {STATUS_LABEL[matchedSession.status]}
                  </Text>
                </View>

                <View style={styles.codeTag}>
                  <Text style={styles.codeTagText}>
                    Kode: {matchedSession.kodePresensi}
                  </Text>
                </View>
              </View>

              <Text style={styles.mataKuliah}>
                {matchedSession.practicum?.mataKuliah ?? "Mata Kuliah"}
              </Text>
              <Text style={styles.namaPraktikum}>
                Pertemuan {matchedSession.practicum?.nomorPraktikum ?? 1} ·{" "}
                {matchedSession.practicum?.namaPraktikum ?? "Sesi Praktikum"}
              </Text>

              <View style={styles.detailList}>
                <DetailRow
                  label="Kelas"
                  value={`Kelas ${matchedSession.kelas?.namaKelas ?? "—"}`}
                />
                <DetailRow label="Ruang" value={matchedSession.ruang} />
                <DetailRow
                  label="Tanggal"
                  value={formatTanggal(matchedSession.tanggal)}
                />
                <DetailRow
                  label="Waktu"
                  value={`${formatJam(matchedSession.jamMulai)} – ${formatJam(matchedSession.jamSelesai)} WIB`}
                />
              </View>
            </View>

            {/* Panel Aksi Presensi / Status Izin */}
            {attendance ? (
              <View style={[styles.statusActionCard, styles.cardSuccess]}>
                <View style={styles.iconCircleSuccess}>
                  <AppIcon name="check" size={22} color="#0f5132" />
                </View>
                <Text style={styles.actionCardTitle}>Presensi Tercatat</Text>
                <Text style={styles.actionCardSubSuccess}>
                  Anda sudah tercatat hadir pada pukul{" "}
                  {formatWaktuLengkap(attendance.waktuHadir)}.
                  {typeof attendance.jarakMeter === "number"
                    ? `\nJarak ke laboratorium: ${attendance.jarakMeter} m${
                        typeof attendance.radiusMeter === "number"
                          ? ` (Radius maks: ${attendance.radiusMeter} m)`
                          : ""
                      }`
                    : ""}
                </Text>
              </View>
            ) : permission?.status === "approved" ? (
              <View style={[styles.statusActionCard, styles.cardApproved]}>
                <View style={styles.iconCircleSuccess}>
                  <AppIcon name="info" size={22} color="#0f5132" />
                </View>
                <Text style={styles.actionCardTitle}>Izin Sudah Disetujui</Text>
                <Text style={styles.actionCardSubSuccess}>
                  Izin Anda untuk sesi ini sudah disetujui oleh asisten. Anda
                  tidak perlu melakukan presensi.
                </Text>
              </View>
            ) : matchedSession.status === "open" && !isScheduleExpired ? (
              <View style={styles.openActionSection}>
                {/* Kartu Status Lokasi & Jarak Laboratorium (SRS-014) */}
                <View
                  style={[
                    styles.locationCard,
                    currentLocationCheck.result?.ok
                      ? styles.locationCardOk
                      : currentLocationCheck.result &&
                          !currentLocationCheck.result.ok
                        ? styles.locationCardError
                        : styles.locationCardNeutral,
                  ]}
                >
                  <View style={styles.locationCardHeader}>
                    <View style={styles.locationHeaderLeft}>
                      <AppIcon
                        name="location"
                        size={17}
                        color={
                          currentLocationCheck.result?.ok
                            ? "#0f5132"
                            : currentLocationCheck.result
                              ? "#991b1b"
                              : "#2563eb"
                        }
                      />
                      <Text style={styles.locationCardTitle}>
                        Validasi Lokasi Laboratorium
                      </Text>
                    </View>
                    <Pressable
                      style={styles.refreshLocBtn}
                      onPress={() => void handleRefreshLocation()}
                      disabled={currentLocationCheck.loading || isSubmitting}
                    >
                      <Text style={styles.refreshLocBtnText}>
                        {currentLocationCheck.loading
                          ? "Memeriksa..."
                          : "Perbarui Lokasi"}
                      </Text>
                    </Pressable>
                  </View>

                  {currentLocationCheck.loading ? (
                    <View style={styles.locationLoadingRow}>
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text style={styles.locationStatusNeutralText}>
                        Mengambil koordinat GPS & menghitung jarak ke{" "}
                        {matchedSession.ruang}...
                      </Text>
                    </View>
                  ) : currentLocationCheck.result?.ok ? (
                    <View style={styles.locationResultBody}>
                      <Text style={styles.locationStatusOkText}>
                        Berada di dalam radius {matchedSession.ruang}
                      </Text>
                      <Text style={styles.locationDistanceText}>
                        Jarak Anda: {currentLocationCheck.result.distanceMeters}{" "}
                        m · Radius Maks:{" "}
                        {currentLocationCheck.result.labLocation.radius} m
                      </Text>
                    </View>
                  ) : currentLocationCheck.result ? (
                    <View style={styles.locationResultBody}>
                      <Text style={styles.locationStatusErrText}>
                        {currentLocationCheck.result.message}
                      </Text>
                      {typeof currentLocationCheck.result.distanceMeters ===
                        "number" &&
                        currentLocationCheck.result.labLocation && (
                          <Text style={styles.locationDistanceErrText}>
                            Jarak Anda:{" "}
                            {currentLocationCheck.result.distanceMeters} m ·
                            Radius Maks:{" "}
                            {currentLocationCheck.result.labLocation.radius} m
                          </Text>
                        )}
                    </View>
                  ) : null}
                </View>

                {permission?.status === "pending" && (
                  <View style={styles.pendingPermNote}>
                    <AppIcon name="info" size={15} color="#854d0e" />
                    <Text style={styles.pendingPermNoteText}>
                      Pengajuan izin Anda masih menunggu pemeriksaan. Jika Anda
                      hadir di lab, silakan lanjutkan presensi di bawah.
                    </Text>
                  </View>
                )}

                <Pressable
                  style={({ pressed }) => [
                    styles.presensiBtn,
                    pressed && styles.presensiBtnPressed,
                    isSubmitting && styles.presensiBtnDisabled,
                  ]}
                  onPress={handlePresensi}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <AppIcon name="check" size={18} color="#ffffff" />
                      <Text style={styles.presensiBtnText}>
                        Lakukan Presensi Sekarang
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={[styles.statusActionCard, styles.cardNeutral]}>
                <View style={styles.iconCircleNeutral}>
                  <AppIcon
                    name={
                      matchedSession.status === "scheduled" ? "clock" : "lock"
                    }
                    size={22}
                    color="#475569"
                  />
                </View>
                <Text style={styles.actionCardTitle}>
                  {matchedSession.status === "scheduled"
                    ? "Sesi Belum Dibuka"
                    : "Sesi Sudah Ditutup"}
                </Text>
                <Text style={styles.actionCardSubNeutral}>
                  {matchedSession.status === "scheduled"
                    ? "Presensi belum dapat dilakukan karena sesi belum dibuka oleh asisten."
                    : "Waktu presensi untuk sesi ini telah ditutup."}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  codeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  codeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  codeIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  codeHeaderTextWrap: {
    flex: 1,
  },
  codeTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  requiredMark: {
    color: "#dc2626",
    fontWeight: "800",
  },
  codeSubtitle: {
    fontSize: 12.5,
    color: "#64748b",
    marginTop: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  codeInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 4,
    color: "#0f172a",
    textAlign: "center",
  },
  resetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },

  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
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
  feedbackText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },

  infoStateCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoStateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  infoStateTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  infoStateSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
  },

  invalidCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  invalidIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  invalidTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#991b1b",
    marginBottom: 4,
  },
  invalidSubtitle: {
    fontSize: 13,
    color: "#b91c1c",
    textAlign: "center",
    lineHeight: 18,
  },

  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  sessionCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11.5, fontWeight: "700" },
  codeTag: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codeTagText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#1d4ed8",
    letterSpacing: 0.5,
  },
  mataKuliah: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  namaPraktikum: {
    fontSize: 13.5,
    color: "#475569",
    marginBottom: 14,
  },
  detailList: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontSize: 11.5,
    color: "#64748b",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 13.5,
    color: "#0f172a",
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },

  statusActionCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  cardSuccess: {
    backgroundColor: "#e6f4ea",
    borderColor: "#b7dfc2",
  },
  cardApproved: {
    backgroundColor: "#e6f4ea",
    borderColor: "#b7dfc2",
  },
  cardNeutral: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  iconCircleSuccess: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#d1e7dd",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconCircleNeutral: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  actionCardSubSuccess: {
    fontSize: 13,
    color: "#0f5132",
    textAlign: "center",
    lineHeight: 19,
  },
  actionCardSubNeutral: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
  },

  openActionSection: {
    gap: 12,
  },
  locationCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 8,
  },
  locationCardNeutral: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  locationCardOk: {
    backgroundColor: "#e6f4ea",
    borderColor: "#b7dfc2",
  },
  locationCardError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  locationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  locationHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  locationCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  refreshLocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  refreshLocBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563eb",
  },
  locationLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  locationStatusNeutralText: {
    flex: 1,
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },
  locationResultBody: {
    gap: 2,
  },
  locationStatusOkText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f5132",
  },
  locationDistanceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803d",
  },
  locationStatusErrText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#991b1b",
  },
  locationDistanceErrText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b91c1c",
  },
  pendingPermNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef9c3",
    borderWidth: 1,
    borderColor: "#fde047",
    borderRadius: 12,
    padding: 12,
  },
  pendingPermNoteText: {
    flex: 1,
    fontSize: 12.5,
    color: "#854d0e",
    lineHeight: 18,
  },
  presensiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 15,
  },
  presensiBtnPressed: {
    backgroundColor: "#1d4ed8",
  },
  presensiBtnDisabled: {
    opacity: 0.6,
  },
  presensiBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});
