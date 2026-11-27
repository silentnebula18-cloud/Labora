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
import PraktikanPresensiView from "../../components/PraktikanPresensiView";
import ProfileView from "../../components/ProfileView";
import { COLORS, getDisplayName, RADIUS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { useSession } from "../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeStudentClasses,
} from "../../services/classService";
import { isScheduleExpired } from "../../services/sessionService";
import type { ClassRecord, SessionStatus } from "../../types";
import {
  formatJam,
  formatTanggal,
  formatTanggalHari,
} from "../../utils/format";
import PraktikanPetaScreen from "./peta";

function formatJamTitik(date: Date): string {
  return formatJam(date);
}

function formatHariTanggalPendek(date: Date): string {
  return formatTanggalHari(date);
}

function SessionListCard({
  id,
  mataKuliah,
  nomorPraktikum,
  namaKelas,
  tanggal,
  jamMulai,
  jamSelesai,
  ruang,
  status,
  sudahPresensi,
}: {
  id: string;
  mataKuliah: string;
  nomorPraktikum: number;
  namaKelas: string;
  tanggal: Date;
  jamMulai: Date;
  jamSelesai: Date;
  ruang: string;
  status: SessionStatus;
  sudahPresensi: boolean;
}) {
  const badge = sudahPresensi
    ? {
        label: "Hadir",
        bg: COLORS.successBg,
        border: COLORS.primaryBorder,
        text: COLORS.successText,
      }
    : status === "open"
      ? {
          label: "Sedang berlangsung",
          bg: COLORS.successBg,
          border: COLORS.primaryBorder,
          text: COLORS.successText,
        }
      : status === "scheduled"
        ? {
            label: "Akan datang",
            bg: COLORS.neutralBadgeBg,
            border: COLORS.border,
            text: COLORS.neutralBadgeText,
          }
        : {
            label: "Selesai",
            bg: COLORS.neutralBadgeBg,
            border: COLORS.border,
            text: COLORS.neutralBadgeText,
          };

  const nomorStr = String(nomorPraktikum).padStart(2, "0");

  const openDetail = () =>
    router.push({
      pathname: "/praktikan/session/[id]",
      params: { id },
    } as any);

  return (
    <Pressable
      style={({ pressed }) => [styles.sessionCard, pressed && styles.pressed]}
      onPress={openDetail}
    >
      {/* Header Kartu (Gaya Tokopedia) */}
      <View style={styles.sessionTopRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardSmallIcon}>
            <AppIcon name="calendar" size={16} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={styles.sessionOverline}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Kelas {namaKelas} · Pertemuan {nomorStr}
            </Text>
            <Text
              style={styles.sessionDateSub}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {formatTanggal(tanggal)}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.badgePill,
            { backgroundColor: badge.bg, borderColor: badge.border },
          ]}
        >
          <Text
            style={[styles.badgePillText, { color: badge.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {badge.label}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      {/* Konten Utama */}
      <Text
        style={styles.sessionCourse}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {mataKuliah}
      </Text>
      <Text
        style={styles.metaText}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {formatJamTitik(jamMulai)}–{formatJamTitik(jamSelesai)} WIB
      </Text>

      {/* Footer Kartu + Tombol Lihat Detail */}
      <View style={styles.cardFooterRow}>
        <View style={styles.cardFooterLeft}>
          <Text style={styles.cardFooterLabel}>Laboratorium</Text>
          <Text
            style={styles.cardFooterValue}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {ruang}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.detailCtaBtn,
            pressed && styles.detailCtaBtnPressed,
          ]}
          onPress={openDetail}
        >
          <Text style={styles.detailCtaBtnText}>Lihat detail</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function HomePraktikan() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { unreadCount, openNotificationModal } = useNotification();
  const {
    studentSessions,
    sessionsLoading,
    sessionsError,
    myAttendances,
  } = useSession();

  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeNavTab, setActiveNavTab] = useState<BottomNavTab>("beranda");
  const [prevParamTab, setPrevParamTab] = useState(params.tab);
  if (params.tab !== prevParamTab) {
    setPrevParamTab(params.tab);
    if (
      params.tab === "beranda" ||
      params.tab === "presensi" ||
      params.tab === "peta" ||
      params.tab === "profil"
    ) {
      setActiveNavTab(params.tab);
    }
  }

  const [subTab, setSubTab] = useState<"jadwal" | "kelas">("jadwal");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const [classList, setClassList] = useState<ClassRecord[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeStudentClasses(
      user.id,
      (items) => {
        setClassList(items);
        setClassesError(null);
        setClassesLoading(false);
      },
      (error) => {
        setClassesError(describeFirestoreError(error));
        setClassesLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const attendedSessionIds = useMemo(
    () => new Set(myAttendances.map((a) => a.sessionId)),
    [myAttendances],
  );

  // Pilih kelas/sesi mendatang yang paling dekat dari hari ini untuk Hero Section
  const nearestUpcomingSession = useMemo(() => {
    const candidates = studentSessions.filter(
      (s) =>
        s.status !== "closed" &&
        !isScheduleExpired(s.tanggal, s.jamSelesai, currentTime),
    );

    if (candidates.length === 0) return null;

    const sorted = [...candidates].sort((a, b) => {
      // Prioritaskan sesi yang sedang dibuka saat ini
      if (a.status === "open" && b.status !== "open") return -1;
      if (a.status !== "open" && b.status === "open") return 1;
      return a.jamMulai.getTime() - b.jamMulai.getTime();
    });

    return sorted[0] ?? null;
  }, [studentSessions, currentTime]);

  if (!user) return null;

  const upcomingSessions = [...studentSessions]
    .filter(
      (s) =>
        s.status !== "closed" &&
        !isScheduleExpired(s.tanggal, s.jamSelesai, currentTime),
    )
    .sort((a, b) => a.jamMulai.getTime() - b.jamMulai.getTime());

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar style="dark" />

      {activeNavTab === "beranda" ? (
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
                {subTab === "kelas"
                  ? "Kelas Saya"
                  : `Hi, ${getDisplayName(user.nama, 3)}`}
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

          {subTab === "jadwal" && (
            <>
              {/* Hero Card: Gaya Seragam dengan Asisten (Tanpa Kode Sesi & Jumlah Praktikan Hadir) */}
              {nearestUpcomingSession ? (
                <View style={styles.featuredCard}>
                  <View style={styles.featuredTopRow}>
                    <Text
                      style={styles.featuredOverline}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {nearestUpcomingSession.status === "open"
                        ? "SESI AKTIF"
                        : "SESI TERDEKAT"}
                    </Text>
                    <View
                      style={[
                        styles.badgePill,
                        {
                          backgroundColor:
                            nearestUpcomingSession.status === "open"
                              ? COLORS.successBg
                              : COLORS.neutralBadgeBg,
                          borderColor:
                            nearestUpcomingSession.status === "open"
                              ? COLORS.primaryBorder
                              : COLORS.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgePillText,
                          {
                            color:
                              nearestUpcomingSession.status === "open"
                                ? COLORS.successText
                                : COLORS.neutralBadgeText,
                          },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {nearestUpcomingSession.status === "open"
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
                    {nearestUpcomingSession.practicum?.mataKuliah ??
                      "Praktikum"}
                  </Text>
                  <Text
                    style={styles.featuredSub}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Kelas {nearestUpcomingSession.kelas?.namaKelas ?? "—"} ·
                    Pertemuan{" "}
                    {String(
                      nearestUpcomingSession.practicum?.nomorPraktikum ?? 1,
                    ).padStart(2, "0")}
                  </Text>

                  <View style={styles.featuredMetaRow}>
                    <AppIcon
                      name="clock"
                      size={14}
                      color={COLORS.textSecondary}
                    />
                    <Text
                      style={styles.featuredMetaText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatHariTanggalPendek(nearestUpcomingSession.tanggal)}{" "}
                      · {formatJamTitik(nearestUpcomingSession.jamMulai)}–
                      {formatJamTitik(nearestUpcomingSession.jamSelesai)} ·{" "}
                      {nearestUpcomingSession.ruang}
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.featuredPrimaryBtn,
                      pressed && styles.detailCtaBtnPressed,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/praktikan/session/[id]",
                        params: { id: nearestUpcomingSession.id },
                      } as any)
                    }
                  >
                    <Text style={styles.featuredPrimaryBtnText}>
                      Lihat detail sesi
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.featuredCard}>
                  <Text style={styles.featuredOverline}>SESI PRAKTIKUM</Text>
                  <View style={styles.cardDivider} />
                  <Text style={styles.featuredCourse}>
                    Tidak ada sesi terjadwal
                  </Text>
                  <Text style={styles.featuredSub}>
                    Jadwal praktikum berikutnya akan otomatis tampil di sini.
                  </Text>
                </View>
              )}

              {/* Aksi Cepat (Tombol Bulat Hijau Proporsional) */}
              <Text style={styles.quickActionsTitle}>Aksi Cepat</Text>
              <View style={styles.quickActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.quickActionItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setActiveNavTab("presensi")}
                >
                  <View style={styles.quickActionCircle}>
                    <AppIcon
                      name="user-round-check"
                      size={23}
                      color={COLORS.textOnPrimary}
                      strokeWidth={2.05}
                    />
                  </View>
                  <Text
                    style={styles.quickActionLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Presensi
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.quickActionItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push("/praktikan/izin" as any)}
                >
                  <View style={styles.quickActionCircle}>
                    <AppIcon
                      name="file-text"
                      size={22}
                      color={COLORS.textOnPrimary}
                      strokeWidth={2.05}
                    />
                  </View>
                  <Text
                    style={styles.quickActionLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Izin
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.quickActionItem,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setActiveNavTab("peta")}
                >
                  <View style={styles.quickActionCircle}>
                    <AppIcon
                      name="location"
                      size={22}
                      color={COLORS.textOnPrimary}
                      strokeWidth={2.05}
                    />
                  </View>
                  <Text
                    style={styles.quickActionLabel}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Peta Lab
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Segmented Control: Jadwal | Kelas Saya */}
          <View style={styles.segmentedTrack}>
            <Pressable
              style={[
                styles.segmentBtn,
                subTab === "jadwal" && styles.segmentBtnActive,
              ]}
              onPress={() => setSubTab("jadwal")}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  subTab === "jadwal" && styles.segmentBtnTextActive,
                ]}
              >
                Jadwal
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.segmentBtn,
                subTab === "kelas" && styles.segmentBtnActive,
              ]}
              onPress={() => setSubTab("kelas")}
            >
              <Text
                style={[
                  styles.segmentBtnText,
                  subTab === "kelas" && styles.segmentBtnTextActive,
                ]}
              >
                Kelas Saya
              </Text>
            </Pressable>
          </View>

          {subTab === "jadwal" ? (
            <>
              {sessionsLoading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.loadingText}>Memuat jadwal…</Text>
                </View>
              )}

              {sessionsError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{sessionsError}</Text>
                </View>
              )}

              {!sessionsLoading &&
                !sessionsError &&
                upcomingSessions.length === 0 && (
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyIconCircle}>
                      <AppIcon
                        name="calendar"
                        size={22}
                        color={COLORS.primary}
                      />
                    </View>
                    <Text style={styles.emptyTitle}>
                      Tidak ada sesi terjadwal
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      Jadwal praktikum yang akan datang akan tampil di sini.
                    </Text>
                  </View>
                )}

              {upcomingSessions.length > 0 && (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Jadwal Mendatang</Text>
                    <Text style={styles.sectionRightMeta}>
                      {formatHariTanggalPendek(new Date())}
                    </Text>
                  </View>
                  {upcomingSessions.map((s) => (
                    <SessionListCard
                      key={s.id}
                      id={s.id}
                      mataKuliah={s.practicum?.mataKuliah ?? "Mata Kuliah"}
                      nomorPraktikum={s.practicum?.nomorPraktikum ?? 1}
                      namaKelas={s.kelas?.namaKelas ?? "—"}
                      tanggal={s.tanggal}
                      jamMulai={s.jamMulai}
                      jamSelesai={s.jamSelesai}
                      ruang={s.ruang}
                      status={s.status}
                      sudahPresensi={attendedSessionIds.has(s.id)}
                    />
                  ))}
                </>
              )}
            </>
          ) : (
            /* Tab Kelas Saya (Sesuai `docs/ui/praktikan/kelas-saya.png`) */
            <>
              <View style={styles.kelasSummaryRow}>
                <Text style={styles.kelasSummaryText}>
                  Kelas praktikum terdaftar
                </Text>
                <View style={styles.kelasCountPill}>
                  <Text style={styles.kelasCountPillText}>
                    {classList.length} kelas
                  </Text>
                </View>
              </View>

              {classesLoading && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color={COLORS.primary} />
                  <Text style={styles.loadingText}>Memuat kelas…</Text>
                </View>
              )}

              {classesError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{classesError}</Text>
                </View>
              )}

              {!classesLoading && !classesError && classList.length === 0 && (
                <View style={styles.emptyCard}>
                  <View style={styles.emptyIconCircle}>
                    <AppIcon name="book" size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>Belum terdaftar di kelas</Text>
                  <Text style={styles.emptySubtitle}>
                    Asisten akan menambahkan NIM kamu ke kelas praktikum yang
                    diikuti.
                  </Text>
                </View>
              )}

              {!classesLoading &&
                classList.map((kelas) => {
                  const classSessions = studentSessions.filter(
                    (s) => s.classId === kelas.id,
                  );
                  const attendedCount = classSessions.filter((s) =>
                    attendedSessionIds.has(s.id),
                  ).length;
                  const attendancePct =
                    classSessions.length > 0
                      ? Math.round((attendedCount / classSessions.length) * 100)
                      : 0;
                  const nextClassSess =
                    classSessions.find((s) => s.status !== "closed") ??
                    classSessions[0];

                  const openClassHistory = () => {
                    router.push({
                      pathname: "/praktikan/kelas/[id]",
                      params: {
                        id: kelas.id,
                        mataKuliah: kelas.mataKuliah,
                        kodeKelas: kelas.kodeKelas,
                      },
                    } as any);
                  };

                  return (
                    <Pressable
                      key={kelas.id}
                      style={({ pressed }) => [
                        styles.myClassCard,
                        pressed && styles.pressed,
                      ]}
                      onPress={openClassHistory}
                    >
                      <View style={styles.sessionTopRow}>
                        <View style={styles.cardHeaderLeft}>
                          <View style={styles.cardSmallIcon}>
                            <AppIcon
                              name="book"
                              size={16}
                              color={COLORS.primary}
                            />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text
                              style={styles.sessionOverline}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              Kelas {kelas.kodeKelas}
                            </Text>
                            <Text
                              style={styles.sessionDateSub}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {classSessions.length} sesi terjadwal
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.badgePill,
                            {
                              backgroundColor: COLORS.successBg,
                              borderColor: COLORS.primaryBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgePillText,
                              { color: COLORS.successText },
                            ]}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            Terdaftar
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardDivider} />

                      <Text
                        style={styles.myClassCourse}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {kelas.mataKuliah}
                      </Text>

                      <Text
                        style={styles.myClassScheduleText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {nextClassSess
                          ? `${formatHariTanggalPendek(nextClassSess.tanggal)} · ${formatJamTitik(nextClassSess.jamMulai)}–${formatJamTitik(nextClassSess.jamSelesai)} · ${nextClassSess.ruang}`
                          : "Belum ada sesi terjadwal"}
                      </Text>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${Math.min(100, attendancePct)}%` },
                          ]}
                        />
                      </View>

                      <View style={styles.cardFooterRow}>
                        <View style={styles.cardFooterLeft}>
                          <Text style={styles.cardFooterLabel}>Kehadiran</Text>
                          <Text
                            style={styles.cardFooterValue}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {classSessions.length > 0
                              ? `${attendancePct}% (${attendedCount}/${classSessions.length})`
                              : "Belum ada sesi"}
                          </Text>
                        </View>

                        <Pressable
                          style={({ pressed }) => [
                            styles.detailCtaBtn,
                            pressed && styles.detailCtaBtnPressed,
                          ]}
                          onPress={openClassHistory}
                        >
                          <Text style={styles.detailCtaBtnText}>
                            Lihat riwayat
                          </Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}
            </>
          )}
        </ScrollView>
      ) : activeNavTab === "presensi" ? (
        <PraktikanPresensiView
          onBackToHome={() => setActiveNavTab("beranda")}
        />
      ) : activeNavTab === "peta" ? (
        <PraktikanPetaScreen embedded />
      ) : (
        <ProfileView />
      )}

      <BottomNavBar
        role="praktikan"
        activeTab={activeNavTab}
        onChangeTab={setActiveNavTab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  pressed: {
    opacity: 0.9,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
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

  // Hero Card (Padding & jarak antar baris seragam dengan kartu jadwal di bawahnya)
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
    flex: 1,
    minWidth: 0,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.4,
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
    fontWeight: "400",
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  featuredMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 16,
  },
  featuredMetaText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  featuredPrimaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredPrimaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 13.5,
    fontWeight: "700",
  },

  // Quick Actions (Tombol Bulat Hijau Semua + Ikon Proporsional)
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 2,
    marginBottom: 14,
  },
  quickActionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    gap: 12,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  quickActionItem: {
    flex: 1,
    alignItems: "center",
    gap: 7,
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  // Segmented Control
  segmentedTrack: {
    flexDirection: "row",
    backgroundColor: COLORS.segmentedTrack,
    borderRadius: RADIUS.md,
    padding: 3,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: COLORS.background,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  segmentBtnTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  // Section Headers
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
  sectionRightMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Session Card (Tokopedia Crisp Card)
  sessionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  sessionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  cardSmallIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionOverline: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sessionDateSub: {
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
  badgePill: {
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  sessionCourse: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  cardFooterLeft: {
    flex: 1,
    minWidth: 0,
  },
  cardFooterLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  cardFooterValue: {
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
  detailCtaBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  detailCtaBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },

  // Kelas Saya Tab
  kelasSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  kelasSummaryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  kelasCountPill: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  kelasCountPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  myClassCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  myClassCourse: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  myClassScheduleText: {
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.segmentedTrack,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.primary,
  },

  // Loading / Empty / Error
  loadingBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12.5,
    color: COLORS.dangerDark,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: 26,
    paddingHorizontal: 20,
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
