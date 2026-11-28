import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import BottomNavBar from "../../../components/BottomNavBar";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import { describeFirestoreError } from "../../../services/classService";
import { subscribeStudentSessionPermission } from "../../../services/permissionService";
import { subscribeStudentSessionAttendance } from "../../../services/sessionService";
import type { Attendance, PermissionRecord, SessionStatus } from "../../../types";
import {
  formatJam,
  formatTanggal,
  formatTanggalWaktu,
  formatWaktuLengkap,
} from "../../../utils/format";

const STATUS_CONFIG: Record<
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

function formatTimestamp(date: Date | null | undefined): string {
  return formatTanggalWaktu(date);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={styles.detailValue}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
    </View>
  );
}

export default function SessionDetailPraktikan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { studentSessions, myAttendances, getSession } = useSession();

  const session = useMemo(() => {
    const fromList = id
      ? studentSessions.find((s) => s.id === id || s.scheduleId === id)
      : undefined;
    return fromList ?? (id ? getSession(id) : null);
  }, [id, studentSessions, getSession]);

  const [realtimeAttendance, setRealtimeAttendance] =
    useState<Attendance | null>(null);
  const [permission, setPermission] = useState<PermissionRecord | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);

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
        <StatusBar style="dark" />
        <View style={styles.notFound}>
          <View style={styles.notFoundIconCircle}>
            <AppIcon name="search" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.notFoundTitle}>Sesi tidak ditemukan</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const badge = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.scheduled;

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
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Detail Sesi
          </Text>
        </Pressable>
        <Text
          style={styles.headerSubtitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {session.practicum.mataKuliah} · Kelas {session.kelas.namaKelas}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {listenerError && (
          <View style={styles.errorBanner}>
            <AppIcon name="alert" size={16} color={COLORS.dangerText} />
            <Text style={styles.errorBannerText}>{listenerError}</Text>
          </View>
        )}

        {/* Kartu Informasi Sesi */}
        <View style={styles.sessionCard}>
          <View style={styles.cardTopRow}>
            <Text style={styles.overline}>
              PERTEMUAN{" "}
              {String(session.practicum.nomorPraktikum).padStart(2, "0")}
            </Text>
            <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statusPillText, { color: badge.text }]}>
                {badge.label}
              </Text>
            </View>
          </View>

          <Text
            style={styles.topicTitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {session.practicum.namaPraktikum}
          </Text>

          <View style={styles.detailList}>
            <DetailRow label="Kelas" value={`Kelas ${session.kelas.namaKelas}`} />
            <DetailRow label="Laboratorium" value={session.ruang} />
            <DetailRow label="Tanggal" value={formatTanggal(session.tanggal)} />
            <DetailRow
              label="Waktu"
              value={`${formatJam(session.jamMulai)}–${formatJam(session.jamSelesai)} WIB`}
            />
            {session.openedAt && (
              <DetailRow
                label="Dibuka pada"
                value={formatTimestamp(session.openedAt)}
              />
            )}
            {session.closedAt && (
              <DetailRow
                label="Ditutup pada"
                value={`${formatTimestamp(session.closedAt)}${
                  session.closedBy === "system" ? " (Otomatis)" : ""
                }`}
              />
            )}
          </View>
        </View>

        {/* Status Kehadiran / Izin Praktikan */}
        {attendance && attendance.attendanceStatus !== "izin" ? (
          <View style={[styles.statusCard, styles.statusCardMint]}>
            <View style={styles.iconCircleMint}>
              <AppIcon name="check" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.statusTitle}>Kehadiran tercatat</Text>
            <Text style={styles.statusDesc}>
              Hadir pada pukul {formatWaktuLengkap(attendance.waktuHadir)} WIB
              {typeof attendance.jarakMeter === "number"
                ? ` · Jarak ${attendance.jarakMeter} m dari lab`
                : ""}
              .
            </Text>
          </View>
        ) : attendance?.attendanceStatus === "izin" ||
          permission?.status === "approved" ? (
          <View style={[styles.statusCard, styles.statusCardMint]}>
            <View style={styles.iconCircleMint}>
              <AppIcon name="check" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.statusTitle}>Izin disetujui</Text>
            <Text style={styles.statusDesc}>
              Pengajuan izin ketidakhadiranmu pada sesi ini telah disetujui oleh
              asisten.
            </Text>
          </View>
        ) : permission?.status === "pending" ? (
          <View style={[styles.statusCard, styles.statusCardNeutral]}>
            <View style={styles.iconCircleNeutral}>
              <AppIcon name="clock" size={20} color={COLORS.warningText} />
            </View>
            <Text style={styles.statusTitle}>Izin menunggu tinjauan</Text>
            <Text style={styles.statusDesc}>
              Pengajuan izinmu sedang diperiksa asisten. Jika tetap hadir di
              lab, lakukan presensi melalui menu Presensi.
            </Text>
          </View>
        ) : permission?.status === "rejected" ? (
          <View style={[styles.statusCard, styles.statusCardDanger]}>
            <View style={styles.iconCircleDanger}>
              <AppIcon name="alert" size={20} color={COLORS.dangerText} />
            </View>
            <Text style={styles.statusTitle}>Izin ditolak & belum hadir</Text>
            <Text style={styles.statusDesc}>
              Pengajuan izinmu ditolak. Jika sesi masih berlangsung, segera
              lakukan presensi di menu Presensi.
            </Text>
          </View>
        ) : (
          <View style={[styles.statusCard, styles.statusCardNeutral]}>
            <View style={styles.iconCircleNeutral}>
              <AppIcon name="info" size={20} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.statusTitle}>Belum tercatat hadir</Text>
            <Text style={styles.statusDesc}>
              {session.status === "open"
                ? "Sesi sedang dibuka. Gunakan menu Presensi untuk memasukkan kode sesi."
                : "Kamu belum tercatat melakukan presensi pada sesi ini."}
            </Text>
          </View>
        )}

        {/* Tombol Aksi Kontekstual */}
        {!attendance && session.status === "open" && permission?.status !== "approved" && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={() =>
              router.replace({
                pathname: "/praktikan",
                params: { tab: "presensi" },
              } as any)
            }
          >
            <Text style={styles.primaryBtnText}>Buka Halaman Presensi</Text>
          </Pressable>
        )}

        {!attendance && !permission && session.status !== "closed" && (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryCardBtn,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/praktikan/izin",
                params: { sessionId: session.id },
              } as any)
            }
          >
            <AppIcon name="file-text" size={18} color={COLORS.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={styles.secondaryCardTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Berhalangan mengikuti sesi ini?
              </Text>
              <Text
                style={styles.secondaryCardSub}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Ajukan izin ketidakhadiran kepada asisten
              </Text>
            </View>
            <AppIcon
              name="chevron-right"
              size={16}
              color={COLORS.textSecondary}
            />
          </Pressable>
        )}
      </ScrollView>

      <BottomNavBar role="praktikan" activeTab="beranda" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  pressed: {
    opacity: 0.88,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 2,
    marginLeft: 28,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.dangerDark,
  },
  sessionCard: {
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
    marginBottom: 6,
  },
  overline: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
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
  topicTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  detailList: {
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
  statusCard: {
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    gap: 5,
  },
  statusCardMint: {
    backgroundColor: COLORS.primarySurface,
    borderColor: COLORS.primaryBorder,
  },
  statusCardNeutral: {
    backgroundColor: COLORS.surfaceSubtle,
    borderColor: COLORS.border,
  },
  statusCardDanger: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
  },
  iconCircleMint: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconCircleNeutral: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconCircleDanger: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statusDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primarySoft,
  },
  secondaryCardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  secondaryCardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  notFoundIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
});
