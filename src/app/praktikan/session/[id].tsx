import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { describeFirestoreError } from "../../../services/classService";
import { getExistingPermission } from "../../../services/permissionService";
import {
  isScheduleExpired as checkScheduleExpired,
  subscribeStudentSessionAttendance,
} from "../../../services/sessionService";
import type { Attendance, PermissionRecord, SessionStatus } from "../../../types";
import { formatTanggal, formatWaktuLengkap } from "../../../utils/format";

// ─── Konfigurasi Status ───────────────────────────────────────────────────────

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

function formatTimestamp(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

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

// ─── Layar Detail Sesi Praktikan ──────────────────────────────────────────────

export default function SessionDetailPraktikan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    studentSessions,
    myAttendances,
    getSession,
    markAttendance,
  } = useSession();

  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AttendanceFeedback | null>(null);
  const submittingRef = useRef(false);
  const lastSuccessSessionRef = useRef<string | null>(null);

  const session = useMemo(() => {
    const fromList = id
      ? studentSessions.find((s) => s.id === id || s.scheduleId === id)
      : undefined;
    return fromList ?? (id ? getSession(id) : null);
  }, [id, studentSessions, getSession]);

  const [realtimeAttendance, setRealtimeAttendance] = useState<Attendance | null>(null);
  const [permission, setPermission] = useState<PermissionRecord | null>(null);

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const isScheduleExpired = useMemo(() => {
    return checkScheduleExpired(
      session?.tanggal,
      session?.jamSelesai,
      currentTime,
    );
  }, [session, currentTime]);

  // Pantau presensi sesi ini secara langsung dari Firestore (SRS 007 & 008)
  useEffect(() => {
    if (!id || !user) return;
    const unsubscribe = subscribeStudentSessionAttendance(
      id,
      user.id,
      (att) => {
        setRealtimeAttendance(att);
      },
    );
    return unsubscribe;
  }, [id, user]);

  // Cek apakah ada pengajuan izin untuk sesi ini
  useEffect(() => {
    if (!id || !user) return;
    getExistingPermission(user.id, id)
      .then((rec) => setPermission(rec))
      .catch(() => undefined);
  }, [id, user]);

  const attendance = useMemo(() => {
    if (realtimeAttendance) return realtimeAttendance;
    if (!id) return null;
    return myAttendances.find((a) => a.sessionId === id) ?? null;
  }, [id, realtimeAttendance, myAttendances]);

  async function lakukanPresensi() {
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
      const result = await markAttendance(session.id, user.id, {
        nama: user.nama,
        nim: user.nim,
      });
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
    } catch (err) {
      setFeedback({
        status: "error",
        message: describeFirestoreError(err),
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  function tutupFeedback() {
    setFeedback(null);
  }

  function bukaKonfirmasiPresensi() {
    if (
      !session ||
      !user ||
      attendance ||
      session.status !== "open" ||
      isScheduleExpired
    ) {
      return;
    }
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
          <View style={styles.notFoundIconCircle}>
            <AppIcon name="search" size={26} color="#475569" />
          </View>
          <Text style={styles.notFoundTitle}>Sesi tidak ditemukan</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusTheme = STATUS_STYLE[session.status] ?? STATUS_STYLE.scheduled;

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
        <Text style={styles.topBarTitle}>Detail Sesi</Text>
        <View style={{ width: 68 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Sesi */}
        <View style={styles.sessionCard}>
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
              style={[styles.statusDot, { backgroundColor: statusTheme.dot }]}
            />
            <Text style={[styles.statusLabel, { color: statusTheme.text }]}>
              {STATUS_LABEL[session.status]}
            </Text>
          </View>

          <Text style={styles.mataKuliah}>{session.practicum.mataKuliah}</Text>
          <Text style={styles.namaPraktikum}>
            Pertemuan {session.practicum.nomorPraktikum} ·{" "}
            {session.practicum.namaPraktikum}
          </Text>

          <View style={styles.detailList}>
            <DetailRow label="Kelas" value={session.kelas.namaKelas} />
            <DetailRow label="Ruang" value={session.ruang} />
            <DetailRow label="Tanggal" value={formatTanggal(session.tanggal)} />
            <DetailRow
              label="Waktu"
              value={`${session.jamMulai} – ${session.jamSelesai} WIB`}
            />
            {session.openedAt && (
              <DetailRow
                label="Dibuka Pada"
                value={formatTimestamp(session.openedAt)}
              />
            )}
            {session.closedAt && (
              <DetailRow
                label="Ditutup Pada"
                value={`${formatTimestamp(session.closedAt)}${
                  session.closedBy === "system"
                    ? " (Otomatis oleh Sistem)"
                    : ""
                }`}
              />
            )}
          </View>
        </View>

        {/* Panel Presensi */}
        {attendance ? (
          <View style={[styles.presenceCard, styles.presenceSuccess]}>
            <View style={styles.presenceIconCircleSuccess}>
              <AppIcon name="check" size={22} color="#0f5132" />
            </View>
            <Text style={styles.presenceTitle}>Presensi Tercatat</Text>
            <Text style={styles.presenceSuccessText}>
              Anda tercatat hadir pada{" "}
              {formatWaktuLengkap(attendance.waktuHadir)}.
            </Text>
            <Text style={styles.presenceNote}>
              Presensi berhasil disimpan ke Cloud Firestore.
            </Text>
            {permission && (
              <View style={styles.permissionOverriddenBanner}>
                <AppIcon name="info" size={13} color="#0f5132" />
                <Text style={styles.permissionOverriddenText}>
                  Pengajuan izin Anda sebelumnya tercatat dan digantikan oleh kehadiran fisik ini.
                </Text>
              </View>
            )}
          </View>
        ) : permission?.status === "approved" ? (
          <View style={[styles.presenceCard, styles.presenceApproved]}>
            <View style={styles.presenceIconCircleSuccess}>
              <AppIcon name="check" size={22} color="#0f5132" />
            </View>
            <Text style={styles.presenceTitle}>Izin Telah Disetujui</Text>
            <Text style={styles.presenceSuccessText}>
              Pengajuan izin ketidakhadiran Anda untuk sesi ini telah disetujui oleh asisten. Anda tidak perlu melakukan presensi.
            </Text>
          </View>
        ) : session.status === "open" && !isScheduleExpired ? (
          <>
            {permission?.status === "pending" && (
              <View style={styles.pendingPermissionAlert}>
                <AppIcon name="info" size={15} color="#854d0e" />
                <Text style={styles.pendingPermissionAlertText}>
                  Pengajuan izin Anda sedang menunggu pemeriksaan. Jika Anda hadir langsung di lab, silakan lakukan presensi di bawah.
                </Text>
              </View>
            )}

            <View style={[styles.presenceCard, styles.presenceOpen]}>
              <View style={styles.presenceIconCircleOpen}>
                <AppIcon name="unlock" size={20} color="#2563eb" />
              </View>
              <Text style={styles.presenceTitle}>Sesi Sedang Dibuka</Text>
              <Text style={styles.presenceOpenText}>
                Asisten telah membuka sesi ini. Silakan konfirmasi kehadiran
                Anda sebelum sesi ditutup.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.actionBtnPressed,
                isSubmitting && styles.actionBtnDisabled,
              ]}
              onPress={bukaKonfirmasiPresensi}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <AppIcon name="check" size={16} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Lakukan Presensi</Text>
                </>
              )}
            </Pressable>
          </>
        ) : session.status === "scheduled" ? (
          <View style={[styles.presenceCard, styles.presencePending]}>
            <View style={styles.presenceIconCircleNeutral}>
              <AppIcon name="clock" size={20} color="#475569" />
            </View>
            <Text style={styles.presenceTitle}>Sesi Belum Dibuka</Text>
            <Text style={styles.presencePendingText}>
              Tombol presensi akan aktif secara otomatis setelah asisten membuka
              sesi ini.
            </Text>
          </View>
        ) : (
          <View style={[styles.presenceCard, styles.presenceClosed]}>
            <View style={styles.presenceIconCircleNeutral}>
              <AppIcon name="lock" size={20} color="#475569" />
            </View>
            <Text style={styles.presenceTitle}>
              {session.closedBy === "system" || isScheduleExpired
                ? "Waktu Sesi Telah Berakhir"
                : "Sesi Telah Ditutup"}
            </Text>
            <Text style={styles.presenceClosedText}>
              {session.closedBy === "system" || isScheduleExpired
                ? `Sesi praktikum telah ditutup otomatis karena melewati jam selesai (${session.jamSelesai} WIB). Presensi mandiri tidak dapat dilakukan.`
                : "Sesi ini sudah ditutup dan tidak dapat digunakan untuk presensi."}
            </Text>
          </View>
        )}

        {!attendance && permission?.status !== "approved" && (
          <Pressable
            style={({ pressed }) => [
              styles.izinSecondaryBtn,
              pressed && styles.izinSecondaryBtnPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/praktikan/izin",
                params: { sessionId: session.id },
              } as any)
            }
          >
            <AppIcon name="clipboard" size={16} color="#2563eb" />
            <Text style={styles.izinSecondaryBtnText}>
              {permission
                ? "Lihat Status Pengajuan Izin"
                : "Ajukan Izin Ketidakhadiran"}
            </Text>
          </Pressable>
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
              <AppIcon name="check" size={22} color="#2563eb" />
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
                value={`Pertemuan ${session.practicum.nomorPraktikum} · ${session.practicum.namaPraktikum}`}
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
              <AppIcon
                name={feedback?.status === "error" ? "alert" : "check"}
                size={22}
                color={feedback?.status === "error" ? "#991b1b" : "#2563eb"}
              />
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
                Pertemuan {session.practicum.nomorPraktikum} ·{" "}
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
              <Text style={styles.modalConfirmText}>Selesai</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  content: { padding: 16 },

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
  backText: { fontSize: 14.5, color: "#2563eb", fontWeight: "700" },
  topBarTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0f172a",
  },

  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    marginBottom: 14,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11.5, fontWeight: "700" },

  mataKuliah: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  namaPraktikum: { fontSize: 13.5, color: "#475569", marginBottom: 16 },

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

  presenceCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  presenceIconCircleSuccess: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#d1e7dd",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  presenceIconCircleOpen: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  presenceIconCircleNeutral: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  presenceTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  presenceNote: { fontSize: 12, color: "#64748b", marginTop: 10 },

  presenceSuccess: {
    backgroundColor: "#e6f4ea",
    borderWidth: 1,
    borderColor: "#b7dfc2",
  },
  presenceApproved: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  presenceSuccessText: {
    fontSize: 13.5,
    color: "#0f5132",
    fontWeight: "600",
    textAlign: "center",
  },
  permissionOverriddenBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#d1fae5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  permissionOverriddenText: {
    fontSize: 11.5,
    color: "#065f46",
    flex: 1,
    lineHeight: 16,
  },
  pendingPermissionAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef9c3",
    borderColor: "#fde047",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  pendingPermissionAlertText: {
    fontSize: 12,
    color: "#854d0e",
    flex: 1,
    lineHeight: 17,
  },

  presenceOpen: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  presenceOpenText: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
  },

  presencePending: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  presencePendingText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
  },

  presenceClosed: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  presenceClosedText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 16,
  },
  actionBtnPressed: { opacity: 0.85 },
  actionBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  izinSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 16,
  },
  izinSecondaryBtnPressed: { opacity: 0.8 },
  izinSecondaryBtnText: { color: "#2563eb", fontSize: 14, fontWeight: "700" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 4,
  },
  modalInfo: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 10,
    marginTop: 14,
  },
  modalNote: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 12,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  modalConfirmBtn: {
    flex: 1.4,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  modalBtnPressed: { opacity: 0.85 },
  modalBtnDisabled: { opacity: 0.6 },

  feedbackSession: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    gap: 2,
    alignItems: "center",
  },
  feedbackSessionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
  },
  feedbackSessionText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
  feedbackMessage: {
    fontSize: 13.5,
    color: "#334155",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 18,
  },
  feedbackIconError: { backgroundColor: "#fef2f2" },
  modalResultBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
  },

  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  notFoundIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  notFoundTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 18,
  },
  backButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: { color: "#fff", fontWeight: "700" },

  bottomPad: { height: 24 },
});
