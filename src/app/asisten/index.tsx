import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import AppIcon from "../../components/AppIcon";
import BottomNavBar, {
  type BottomNavTab,
} from "../../components/BottomNavBar";
import ProfileView from "../../components/ProfileView";
import ScheduleFormModal from "../../components/ScheduleFormModal";
import { COLORS, getDisplayName, RADIUS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { useSession } from "../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeAssistantClasses,
  subscribeClassMembers,
} from "../../services/classService";
import { subscribeAssistantPermissions } from "../../services/permissionService";
import {
  subscribeSessionAttendances,
  type AttendanceWithStudent,
  type ScheduleInput,
} from "../../services/sessionService";
import type { ClassRecord, PermissionRecord } from "../../types";
import { formatJam, formatTanggal } from "../../utils/format";
import IzinAsistenListScreen from "./izin";
import KelolaKelasScreen from "./kelas";

function formatJamTitik(date: Date): string {
  return formatJam(date).replace(":", ".");
}

export default function HomeAsisten() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { unreadCount, openNotificationModal } = useNotification();
  const {
    sessions,
    sessionsLoading,
    sessionsError,
    createSchedule,
    getEnrolled,
  } = useSession();

  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<BottomNavTab>("beranda");
  const [prevParamTab, setPrevParamTab] = useState(params.tab);
  if (params.tab !== prevParamTab) {
    setPrevParamTab(params.tab);
    if (
      params.tab === "beranda" ||
      params.tab === "kelas" ||
      params.tab === "izin" ||
      params.tab === "profil"
    ) {
      setActiveTab(params.tab);
    }
  }

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);

  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeAssistantClasses(
      user.id,
      (items) => {
        setClasses(items);
        if (items.length === 0) {
          setPermissions([]);
        }
      },
      () => {
        setClasses([]);
        setPermissions([]);
      },
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (classes.length === 0) return;
    const classIds = classes.map((c) => c.id);
    const unsubscribe = subscribeAssistantPermissions(
      classIds,
      (items) => {
        setPermissions(items);
      },
      () => {
        setPermissions([]);
      },
    );
    return unsubscribe;
  }, [classes]);

  const pendingPermissionsCount = useMemo(
    () => permissions.filter((p) => p.status === "pending").length,
    [permissions],
  );

  // Pilih Sesi Aktif (open) atau sesi mendatang terdekat untuk Hero Card
  const featuredSession = useMemo(() => {
    const openSess = sessions.find((s) => s.status === "open");
    if (openSess) return openSess;

    const scheduledList = [...sessions]
      .filter((s) => s.status === "scheduled")
      .sort((a, b) => a.jamMulai.getTime() - b.jamMulai.getTime());
    return scheduledList[0] ?? null;
  }, [sessions]);

  const nextAgendaSessions = useMemo(() => {
    return [...sessions]
      .filter((s) => s.status !== "closed" && s.id !== featuredSession?.id)
      .sort((a, b) => a.jamMulai.getTime() - b.jamMulai.getTime());
  }, [sessions, featuredSession]);

  const featuredSessionId = featuredSession?.id ?? "";
  const featuredClassId = featuredSession?.classId ?? "";

  const [featuredAttendances, setFeaturedAttendances] = useState<
    AttendanceWithStudent[]
  >([]);
  const [featuredMemberCount, setFeaturedMemberCount] = useState<number | null>(
    null,
  );

  // Langganan real-time daftar hadir sesi utama (Hero Card) dari Firestore
  useEffect(() => {
    if (!featuredSessionId) {
      return;
    }
    const unsubscribe = subscribeSessionAttendances(
      featuredSessionId,
      (items) => {
        // Catatan izin bukan kehadiran fisik (SRS 020).
        setFeaturedAttendances(
          items.filter((item) => item.attendanceStatus !== "izin"),
        );
      },
      () => {
        setFeaturedAttendances([]);
      },
    );
    return unsubscribe;
  }, [featuredSessionId]);

  // Langganan real-time jumlah anggota kelas sesi utama dari Firestore
  useEffect(() => {
    if (!featuredClassId) {
      return;
    }
    const unsubscribe = subscribeClassMembers(
      featuredClassId,
      (items) => {
        setFeaturedMemberCount(items.length);
      },
      () => {
        setFeaturedMemberCount(null);
      },
    );
    return unsubscribe;
  }, [featuredClassId]);

  if (!user) return null;

  async function handleCreateSchedule(values: ScheduleInput) {
    const targetClass = classes.find((c) => c.id === values.classId);
    if (!targetClass) {
      setFormError("Kelas yang dipilih tidak ditemukan.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createSchedule(targetClass, values);
      setFormVisible(false);
    } catch (error) {
      setFormError(describeFirestoreError(error));
    } finally {
      setSubmitting(false);
    }
  }

  const featuredClass = featuredSession
    ? classes.find((c) => c.id === featuredSession.classId)
    : undefined;
  const featuredHadir = featuredSession ? featuredAttendances.length : 0;
  const featuredEnrolled = featuredSession
    ? featuredMemberCount !== null && featuredMemberCount > 0
      ? featuredMemberCount
      : featuredClass?.memberIds?.length ?? getEnrolled(featuredSession.classId)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar style="dark" />

      {activeTab === "beranda" ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 14, 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Bersih: Hi, <Nama Lengkap Max 3 Kata> */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextWrap}>
              <Text
                style={styles.headerTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Hi, {getDisplayName(user.nama, 3)}
              </Text>
            </View>

            <Pressable
              style={styles.bellBtn}
              onPress={openNotificationModal}
              accessibilityLabel="Notifikasi"
              hitSlop={8}
            >
              <AppIcon name="bell" size={22} color={COLORS.textPrimary} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {sessionsLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>Memuat sesi praktikum…</Text>
            </View>
          )}

          {sessionsError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{sessionsError}</Text>
            </View>
          )}

          {/* Hero Section: 1) Sesi Sedang Berlangsung / Akan Datang */}
          {featuredSession ? (
            <View style={styles.featuredCard}>
              <View style={styles.featuredTopRow}>
                <Text style={styles.featuredOverline}>
                  {featuredSession.status === "open"
                    ? "SESI AKTIF"
                    : "SESI TERDEKAT"}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor:
                        featuredSession.status === "open"
                          ? COLORS.successBg
                          : COLORS.neutralBadgeBg,
                      borderColor:
                        featuredSession.status === "open"
                          ? COLORS.primaryBorder
                          : COLORS.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      {
                        color:
                          featuredSession.status === "open"
                            ? COLORS.successText
                            : COLORS.neutralBadgeText,
                      },
                    ]}
                  >
                    {featuredSession.status === "open"
                      ? "Sedang berlangsung"
                      : "Akan datang"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <Text
                style={styles.featuredCourse}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {featuredSession.practicum?.mataKuliah ?? "Mata Kuliah"}
              </Text>
              <Text
                style={styles.featuredSub}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Kelas {featuredSession.kelas?.namaKelas ?? "—"} · Pertemuan{" "}
                {String(
                  featuredSession.practicum?.nomorPraktikum ?? 1,
                ).padStart(2, "0")}
              </Text>

              <View style={styles.featuredStatsRow}>
                <View>
                  <Text style={styles.codeLabel}>Kode sesi</Text>
                  <Text style={styles.codeValue}>
                    {featuredSession.kodePresensi || "—"}
                  </Text>
                </View>

                <View style={styles.countRightBox}>
                  <Text style={styles.countBigText}>
                    {featuredHadir} / {featuredEnrolled}
                  </Text>
                  <Text style={styles.countSubLabel}>praktikan hadir</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/asisten/session/[id]",
                    params: { id: featuredSession.id },
                  } as any)
                }
              >
                <Text style={styles.primaryBtnText}>Pantau presensi</Text>
              </Pressable>
            </View>
          ) : (
            !sessionsLoading && (
              <View style={styles.featuredCard}>
                <Text style={styles.featuredOverline}>SESI PRAKTIKUM</Text>
                <View style={styles.cardDivider} />
                <Text style={styles.featuredCourse}>
                  Tidak ada sesi terjadwal
                </Text>
                <Text style={[styles.featuredSub, { marginBottom: 16 }]}>
                  Jadwalkan sesi pertemuan baru untuk kelas yang kamu ampu.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={() => {
                    setFormError(null);
                    setFormVisible(true);
                  }}
                >
                  <Text style={styles.primaryBtnText}>+ Buat sesi baru</Text>
                </Pressable>
              </View>
            )
          )}

          {/* Hero Section: 2) Aksi Cepat (Seragam dengan Praktikan: 3 Tombol Bulat Hijau) */}
          <Text style={styles.labShortcutsTitle}>Aksi Cepat</Text>
          <View style={styles.labShortcutsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.labShortcutItem,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                setFormError(null);
                setFormVisible(true);
              }}
            >
              <View style={styles.labShortcutCircle}>
                <AppIcon
                  name="plus"
                  size={24}
                  color={COLORS.textOnPrimary}
                  strokeWidth={2.2}
                />
              </View>
              <Text
                style={styles.labShortcutLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Buat Sesi
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.labShortcutItem,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/asisten/laboratorium" as any)}
            >
              <View style={styles.labShortcutCircle}>
                <AppIcon
                  name="laptop-minimal"
                  size={22}
                  color={COLORS.textOnPrimary}
                  strokeWidth={2.05}
                />
              </View>
              <Text
                style={styles.labShortcutLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Kelola Lab
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.labShortcutItem,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push("/asisten/peta" as any)}
            >
              <View style={styles.labShortcutCircle}>
                <AppIcon
                  name="location"
                  size={22}
                  color={COLORS.textOnPrimary}
                  strokeWidth={2.05}
                />
              </View>
              <Text
                style={styles.labShortcutLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Peta Lab
              </Text>
            </Pressable>
          </View>

          {/* Agenda Berikutnya */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Agenda Berikutnya</Text>
          </View>

          {nextAgendaSessions.length === 0 ? (
            <View style={styles.agendaEmptyCard}>
              <Text style={styles.agendaEmptyText}>
                Tidak ada agenda tambahan yang dijadwalkan.
              </Text>
            </View>
          ) : (
            nextAgendaSessions.slice(0, 4).map((s) => {
              const openSess = () =>
                router.push({
                  pathname: "/asisten/session/[id]",
                  params: { id: s.id },
                } as any);
              const noStr = String(
                s.practicum?.nomorPraktikum ?? 1,
              ).padStart(2, "0");

              return (
                <Pressable
                  key={s.id}
                  style={({ pressed }) => [
                    styles.agendaCard,
                    pressed && styles.pressed,
                  ]}
                  onPress={openSess}
                >
                  <View style={styles.agendaHeaderRow}>
                    <View style={styles.agendaHeaderLeft}>
                      <View style={styles.agendaIconBox}>
                        <AppIcon
                          name="calendar"
                          size={15}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={styles.agendaHeaderTitle}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          Kelas {s.kelas?.namaKelas ?? "—"} · Pertemuan {noStr}
                        </Text>
                        <Text
                          style={styles.agendaHeaderDate}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {formatTanggal(s.tanggal)}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor:
                            s.status === "open"
                              ? COLORS.successBg
                              : COLORS.neutralBadgeBg,
                          borderColor:
                            s.status === "open"
                              ? COLORS.primaryBorder
                              : COLORS.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color:
                              s.status === "open"
                                ? COLORS.successText
                                : COLORS.neutralBadgeText,
                          },
                        ]}
                      >
                        {s.status === "open" ? "Berlangsung" : "Akan datang"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <Text
                    style={styles.agendaTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {s.practicum?.mataKuliah ?? "Mata Kuliah"}
                  </Text>
                  <Text
                    style={styles.agendaMetaText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formatJamTitik(s.jamMulai)}–{formatJamTitik(s.jamSelesai)}{" "}
                    WIB
                  </Text>

                  <View style={styles.agendaFooterRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.agendaFooterLabel}>Laboratorium</Text>
                      <Text
                        style={styles.agendaFooterValue}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {s.ruang}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.detailCtaBtn,
                        pressed && styles.primaryBtnPressed,
                      ]}
                      onPress={openSess}
                    >
                      <Text style={styles.detailCtaBtnText}>Lihat detail</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}

          {/* Banner Pengajuan Izin */}
          <Pressable
            style={({ pressed }) => [
              styles.permissionBanner,
              pressed && styles.pressed,
            ]}
            onPress={() => setActiveTab("izin")}
          >
            <AppIcon name="file-text" size={20} color={COLORS.primary} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={styles.permissionBannerTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {pendingPermissionsCount > 0
                  ? `${pendingPermissionsCount} izin menunggu ditinjau`
                  : "Tinjau pengajuan izin"}
              </Text>
              <Text
                style={styles.permissionBannerSub}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Bantu praktikan mendapat kepastian.
              </Text>
            </View>
            <AppIcon name="chevron-right" size={16} color={COLORS.primary} />
          </Pressable>
        </ScrollView>
      ) : activeTab === "kelas" ? (
        <KelolaKelasScreen embedded />
      ) : activeTab === "izin" ? (
        <IzinAsistenListScreen embedded />
      ) : (
        <ProfileView />
      )}

      <BottomNavBar
        role="asisten"
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {formVisible && (
        <ScheduleFormModal
          visible
          mode="create"
          classes={classes}
          submitting={submitting}
          error={formError}
          onSubmit={handleCreateSchedule}
          onClose={() => {
            if (!submitting) setFormVisible(false);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceSubtle },
  scroll: { flex: 1, backgroundColor: COLORS.surfaceSubtle },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  pressed: { opacity: 0.88 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  headerTextWrap: { flex: 1, minWidth: 0 },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.dangerText,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 9.5,
    fontWeight: "700",
  },

  featuredCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  featuredTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  featuredOverline: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  statusPill: {
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  featuredCourse: {
    fontSize: 15.5,
    fontWeight: "700",
    lineHeight: 22,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  featuredSub: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  featuredStatsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.8,
  },
  countRightBox: {
    alignItems: "flex-end",
  },
  countBigText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  countSubLabel: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 13.5,
    fontWeight: "700",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  agendaCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  agendaHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  agendaHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  agendaIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  agendaHeaderTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  agendaHeaderDate: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 10,
  },
  agendaTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  agendaMetaText: {
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  agendaFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  agendaFooterLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  agendaFooterValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  detailCtaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCtaBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  agendaEmptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  agendaEmptyText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },

  permissionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginTop: 4,
    marginBottom: 12,
  },
  permissionBannerTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  permissionBannerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  labShortcutsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 2,
    marginBottom: 14,
  },
  labShortcutsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    gap: 12,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  labShortcutItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },
  labShortcutCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  labShortcutLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 22,
    gap: 8,
  },
  loadingText: { fontSize: 12.5, color: COLORS.textSecondary },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 11,
    marginBottom: 12,
  },
  errorText: { fontSize: 12.5, color: COLORS.dangerDark },
});
