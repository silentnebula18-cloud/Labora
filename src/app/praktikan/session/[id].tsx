import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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
import { subscribeStudentSessionPermission } from "../../../services/permissionService";
import { subscribeStudentSessionAttendance } from "../../../services/sessionService";
import type { Attendance, PermissionRecord, SessionStatus } from "../../../types";
import {
  formatJam,
  formatTanggal,
  formatWaktuLengkap,
} from "../../../utils/format";

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
    bg: "#ECFEE8",
    border: "#6EA4BF",
    text: "#331E36",
    dot: "#6EA4BF",
  },
  open: {
    bg: "#e6f4ea",
    border: "#b7dfc2",
    text: "#0f5132",
    dot: "#15803d",
  },
  closed: {
    bg: "#ECFEE8",
    border: "#6EA4BF",
    text: "#41337A",
    dot: "#6EA4BF",
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

// ─── Layar Detail Sesi Praktikan ──────────────────────────────────────────────

export default function SessionDetailPraktikan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    studentSessions,
    myAttendances,
    getSession,
  } = useSession();

  const session = useMemo(() => {
    const fromList = id
      ? studentSessions.find((s) => s.id === id || s.scheduleId === id)
      : undefined;
    return fromList ?? (id ? getSession(id) : null);
  }, [id, studentSessions, getSession]);

  const [realtimeAttendance, setRealtimeAttendance] = useState<Attendance | null>(null);
  const [permission, setPermission] = useState<PermissionRecord | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);

  // Pantau presensi sesi ini secara langsung dari Firestore (SRS 007 & 008)
  useEffect(() => {
    if (!id || !user) return;
    const unsubscribe = subscribeStudentSessionAttendance(
      id,
      user.id,
      (att) => {
        setRealtimeAttendance(att);
        setListenerError(null);
      },
      (err) => {
        setListenerError(describeFirestoreError(err));
      },
    );
    return unsubscribe;
  }, [id, user]);

  // Pantau pengajuan izin untuk sesi ini secara real-time (SRS 008 & 011)
  useEffect(() => {
    if (!id || !user) return;
    const unsubscribe = subscribeStudentSessionPermission(
      user.id,
      id,
      (rec) => {
        setPermission(rec);
        setListenerError(null);
      },
      (err) => {
        setListenerError(describeFirestoreError(err));
      },
    );
    return unsubscribe;
  }, [id, user]);

  const attendance = useMemo(() => {
    if (realtimeAttendance) return realtimeAttendance;
    if (!id) return null;
    return myAttendances.find((a) => a.sessionId === id) ?? null;
  }, [id, realtimeAttendance, myAttendances]);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <View style={styles.notFoundIconCircle}>
            <AppIcon name="search" size={26} color="#41337A" />
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
          <AppIcon name="chevron-left" size={18} color="#41337A" />
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Detail Sesi</Text>
        <View style={{ width: 68 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {listenerError && (
          <View style={styles.errorBanner}>
            <AppIcon name="alert" size={16} color="#dc2626" />
            <Text style={styles.errorBannerText}>{listenerError}</Text>
          </View>
        )}

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
              value={`${formatJam(session.jamMulai)} – ${formatJam(session.jamSelesai)} WIB`}
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

        {/* Kartu Riwayat / Status Kehadiran Praktikan pada Sesi Ini (SRS 013) */}
        {attendance ? (
          <View style={[styles.presenceCard, styles.presenceSuccess]}>
            <View style={styles.presenceIconCircleSuccess}>
              <AppIcon name="check" size={22} color="#0f5132" />
            </View>
            <Text style={styles.presenceTitle}>Riwayat Kehadiran: Hadir</Text>
            <Text style={styles.presenceSuccessText}>
              Anda tercatat hadir pada pukul{" "}
              {formatWaktuLengkap(attendance.waktuHadir)}.
            </Text>
            <Text style={styles.presenceNote}>
              Data kehadiran tersimpan di Cloud Firestore.
            </Text>
            {permission && (
              <View style={styles.permissionOverriddenBanner}>
                <AppIcon name="info" size={13} color="#0f5132" />
                <Text style={styles.permissionOverriddenText}>
                  Pengajuan izin Anda sebelumnya digantikan oleh kehadiran ini.
                </Text>
              </View>
            )}
          </View>
        ) : permission?.status === "approved" ? (
          <View style={[styles.presenceCard, styles.presenceApproved]}>
            <View style={styles.presenceIconCircleSuccess}>
              <AppIcon name="check" size={22} color="#0f5132" />
            </View>
            <Text style={styles.presenceTitle}>
              Riwayat Kehadiran: Izin Disetujui
            </Text>
            <Text style={styles.presenceSuccessText}>
              Pengajuan izin ketidakhadiran Anda untuk sesi ini telah disetujui
              oleh asisten.
            </Text>
          </View>
        ) : permission?.status === "pending" ? (
          <View style={[styles.presenceCard, styles.presencePending]}>
            <View style={styles.presenceIconCircleNeutral}>
              <AppIcon name="clock" size={20} color="#854d0e" />
            </View>
            <Text style={styles.presenceTitle}>
              Riwayat Kehadiran: Izin Menunggu Pemeriksaan
            </Text>
            <Text style={styles.presencePendingText}>
              Pengajuan izin Anda sedang ditinjau oleh asisten. Untuk melakukan
              presensi kehadiran, gunakan menu Presensi pada navigasi bawah.
            </Text>
          </View>
        ) : permission?.status === "rejected" ? (
          <View style={[styles.presenceCard, styles.presenceClosed]}>
            <View style={styles.presenceIconCircleNeutral}>
              <AppIcon name="alert" size={20} color="#991b1b" />
            </View>
            <Text style={styles.presenceTitle}>
              Riwayat Kehadiran: Izin Ditolak & Belum Hadir
            </Text>
            <Text style={styles.presenceClosedText}>
              Pengajuan izin Anda ditolak. Jika sesi masih dibuka, silakan
              lakukan presensi melalui menu Presensi pada navigasi bawah.
            </Text>
          </View>
        ) : (
          <View style={[styles.presenceCard, styles.presencePending]}>
            <View style={styles.presenceIconCircleNeutral}>
              <AppIcon name="clipboard" size={20} color="#41337A" />
            </View>
            <Text style={styles.presenceTitle}>
              Riwayat Kehadiran: Belum Tercatat Hadir
            </Text>
            <Text style={styles.presencePendingText}>
              Anda belum tercatat hadir pada sesi ini. Presensi hanya dapat
              dilakukan melalui menu Presensi pada navigasi bawah (navbar).
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
            <AppIcon name="clipboard" size={16} color="#41337A" />
            <Text style={styles.izinSecondaryBtnText}>
              {permission
                ? "Lihat Status Pengajuan Izin"
                : "Ajukan Izin Ketidakhadiran"}
            </Text>
          </Pressable>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#ECFEE8" },
  content: { padding: 16 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#C2EFEB",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 68,
  },
  backText: { fontSize: 14.5, color: "#41337A", fontWeight: "700", },
  topBarTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#331E36",

  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",

  },

  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#C2EFEB",
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
  statusLabel: { fontSize: 11.5, fontWeight: "700", },

  mataKuliah: {
    fontSize: 19,
    fontWeight: "800",
    color: "#331E36",
    marginBottom: 4,


  },
  namaPraktikum: { fontSize: 13.5, color: "#41337A", marginBottom: 16, },

  detailList: {
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#ECFEE8",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontSize: 11.5,
    color: "#6EA4BF",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,

  },
  detailValue: {
    fontSize: 13.5,
    color: "#331E36",
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
    backgroundColor: "#C2EFEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  presenceIconCircleNeutral: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#C2EFEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  presenceTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#331E36",
    marginBottom: 6,

  },
  presenceNote: { fontSize: 12, color: "#6EA4BF", marginTop: 10, },

  presenceSuccess: {
    backgroundColor: "#e6f4ea",
    borderWidth: 1,
    borderColor: "#b7dfc2",
  },
  presenceApproved: {
    backgroundColor: "#ECFEE8",
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
    borderColor: "#6EA4BF",
  },
  presenceOpenText: {
    fontSize: 13,
    color: "#41337A",
    textAlign: "center",
    lineHeight: 19,

  },

  presencePending: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#C2EFEB",
  },
  presencePendingText: {
    fontSize: 13,
    color: "#6EA4BF",
    textAlign: "center",
    lineHeight: 19,

  },

  presenceClosed: {
    backgroundColor: "#ECFEE8",
    borderWidth: 1,
    borderColor: "#C2EFEB",
  },
  presenceClosedText: {
    fontSize: 13,
    color: "#6EA4BF",
    textAlign: "center",
    lineHeight: 19,

  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#41337A",
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 16,
  },
  actionBtnPressed: { opacity: 0.85 },
  actionBtnDisabled: {
    backgroundColor: "#6EA4BF",
  },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", },

  izinSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#C2EFEB",
    borderWidth: 1,
    borderColor: "#6EA4BF",
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 16,
  },
  izinSecondaryBtnPressed: { opacity: 0.8 },
  izinSecondaryBtnText: { color: "#41337A", fontSize: 14, fontWeight: "700", },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(51, 30, 54, 0.55)",
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
    backgroundColor: "#C2EFEB",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#331E36",
    textAlign: "center",
    marginBottom: 6,

  },
  modalDescription: {
    fontSize: 13,
    color: "#6EA4BF",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 4,

  },
  modalInfo: {
    backgroundColor: "#ECFEE8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    padding: 14,
    gap: 10,
    marginTop: 14,
  },
  modalNote: {
    fontSize: 12,
    color: "#6EA4BF",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 12,

  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#6EA4BF",
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFEE8",
  },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: "#331E36", },
  modalConfirmBtn: {
    flex: 1.4,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#41337A",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff", },
  modalBtnPressed: { opacity: 0.85 },
  modalBtnDisabled: { opacity: 0.6 },

  feedbackSession: {
    backgroundColor: "#ECFEE8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    gap: 2,
    alignItems: "center",
  },
  feedbackSessionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#331E36",
    textAlign: "center",

  },
  feedbackSessionText: {
    fontSize: 12,
    color: "#6EA4BF",
    textAlign: "center",

  },
  feedbackMessage: {
    fontSize: 13.5,
    color: "#331E36",
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
    backgroundColor: "#41337A",
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
    backgroundColor: "#C2EFEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  notFoundTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#331E36",
    marginBottom: 18,

  },
  backButton: {
    backgroundColor: "#41337A",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: { color: "#fff", fontWeight: "700", },

  bottomPad: { height: 24 },
});
