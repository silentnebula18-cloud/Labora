import { router } from "expo-router";
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
import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeStudentClasses,
} from "../../services/classService";
import type { AttendanceWithSession } from "../../services/sessionService";
import type { ClassRecord, SessionStatus } from "../../types";
import {
  formatTanggal,
  formatWaktuLengkap,
  tanggalRingkas,
} from "../../utils/format";

// ─── Konfigurasi Status ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  scheduled: {
    label: "Terjadwal",
    bg: "#f8fafc",
    border: "#cbd5e1",
    text: "#334155",
    dot: "#64748b",
  },
  open: {
    label: "Presensi Dibuka",
    bg: "#e6f4ea",
    border: "#b7dfc2",
    text: "#0f5132",
    dot: "#15803d",
  },
  closed: {
    label: "Selesai",
    bg: "#f1f5f9",
    border: "#cbd5e1",
    text: "#475569",
    dot: "#94a3b8",
  },
};

// ─── Kartu Jadwal ─────────────────────────────────────────────────────────────

interface SessionCardProps {
  id: string;
  mataKuliah: string;
  namaPraktikum: string;
  nomorPraktikum: number;
  namaKelas: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  ruang: string;
  status: SessionStatus;
  sudahPresensi: boolean;
}

function SessionCard({
  id,
  mataKuliah,
  namaPraktikum,
  nomorPraktikum,
  namaKelas,
  tanggal,
  jamMulai,
  jamSelesai,
  ruang,
  status,
  sudahPresensi,
}: SessionCardProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({ pathname: "/praktikan/session/[id]", params: { id } } as any)
      }
      android_ripple={{ color: "#e2e8f0" }}
    >
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: cfg.bg, borderColor: cfg.border },
          ]}
        >
          <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
          <Text style={[styles.statusText, { color: cfg.text }]}>
            {cfg.label}
          </Text>
        </View>

        <View style={styles.topRightBadges}>
          {sudahPresensi && (
            <View style={styles.presensiChip}>
              <AppIcon name="check" size={11} color="#0f5132" />
              <Text style={styles.presensiChipText}>Hadir</Text>
            </View>
          )}
          <View style={styles.classBadge}>
            <Text style={styles.classBadgeText}>Kelas {namaKelas}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.mataKuliah} numberOfLines={1}>
        {mataKuliah}
      </Text>
      <Text style={styles.namaPraktikum} numberOfLines={1}>
        Pertemuan {nomorPraktikum} · {namaPraktikum}
      </Text>

      <View style={styles.cardDivider} />

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <AppIcon name="calendar" size={14} color="#64748b" />
          <Text style={styles.infoText}>{formatTanggal(tanggal)}</Text>
        </View>
        <View style={styles.infoBottomInline}>
          <View style={styles.infoItemInline}>
            <AppIcon name="clock" size={14} color="#64748b" />
            <Text style={styles.infoText}>
              {jamMulai} – {jamSelesai}
            </Text>
          </View>
          <View style={styles.infoItemInline}>
            <AppIcon name="location" size={14} color="#64748b" />
            <Text style={styles.infoText} numberOfLines={1}>
              {ruang}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Kartu Riwayat Kehadiran ──────────────────────────────────────────────────

function AttendanceCard({ item }: { item: AttendanceWithSession }) {
  const tanggal = tanggalRingkas(item.session.tanggal);

  return (
    <View style={styles.attendanceCard}>
      <View style={styles.dateBox}>
        <Text style={styles.dateBoxDay}>{tanggal.hari}</Text>
        <Text style={styles.dateBoxNumber}>{tanggal.tanggal}</Text>
        <Text style={styles.dateBoxMonth}>{tanggal.bulan}</Text>
      </View>

      <View style={styles.attendanceInfo}>
        <Text style={styles.attendanceCourse} numberOfLines={1}>
          {item.session.practicum.mataKuliah}
        </Text>
        <Text style={styles.attendanceSub} numberOfLines={1}>
          Pertemuan {item.session.practicum.nomorPraktikum} ·{" "}
          {item.session.practicum.namaPraktikum}
        </Text>
        <Text style={styles.attendanceSub} numberOfLines={1}>
          Kelas {item.session.kelas.namaKelas} · {item.session.ruang}
        </Text>
        <View style={styles.attendanceTimeRow}>
          <View style={styles.attendanceDot} />
          <Text style={styles.attendanceTime}>
            Hadir pukul {formatWaktuLengkap(item.waktuHadir)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Layar Utama Praktikan ────────────────────────────────────────────────────

export default function HomePraktikan() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    studentSessions,
    sessionsLoading,
    sessionsError,
    myAttendances,
  } = useSession();

  const [activeNavTab, setActiveNavTab] = useState<BottomNavTab>("beranda");
  const [tab, setTab] = useState<"jadwal" | "kehadiran" | "kelas">("jadwal");

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
      user.kelas,
    );

    return unsubscribe;
  }, [user]);

  const attendedSessionIds = useMemo(
    () => new Set(myAttendances.map((a) => a.sessionId)),
    [myAttendances],
  );

  if (!user) return null;

  const upcoming = studentSessions.filter((s) => s.status !== "closed");
  const past = studentSessions.filter((s) => s.status === "closed");

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar style="light" />
      {activeNavTab === "beranda" ? (
        <>
          {/* Header Beranda */}
          <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
            <View style={styles.headerTopRow}>
              <Text style={styles.greeting}>Selamat datang,</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>PRAKTIKAN</Text>
              </View>
            </View>
            <Text style={styles.name}>{user.nama}</Text>
            <Text style={styles.nim}>
              NIM {user.nim}
              {user.kelas ? ` · Kelas ${user.kelas}` : ""}
            </Text>
          </View>

          {/* Segment */}
          <View style={styles.segment}>
            <Pressable
              style={[
                styles.segmentItem,
                tab === "jadwal" && styles.segmentActive,
              ]}
              onPress={() => setTab("jadwal")}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "jadwal" && styles.segmentTextActive,
                ]}
              >
                Jadwal
              </Text>
              <View
                style={[
                  styles.segmentCount,
                  tab === "jadwal" && styles.segmentCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentCountText,
                    tab === "jadwal" && styles.segmentCountTextActive,
                  ]}
                >
                  {studentSessions.length}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.segmentItem,
                tab === "kehadiran" && styles.segmentActive,
              ]}
              onPress={() => setTab("kehadiran")}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "kehadiran" && styles.segmentTextActive,
                ]}
              >
                Kehadiran
              </Text>
              <View
                style={[
                  styles.segmentCount,
                  tab === "kehadiran" && styles.segmentCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentCountText,
                    tab === "kehadiran" && styles.segmentCountTextActive,
                  ]}
                >
                  {myAttendances.length}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.segmentItem,
                tab === "kelas" && styles.segmentActive,
              ]}
              onPress={() => setTab("kelas")}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "kelas" && styles.segmentTextActive,
                ]}
              >
                Kelas
              </Text>
              <View
                style={[
                  styles.segmentCount,
                  tab === "kelas" && styles.segmentCountActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentCountText,
                    tab === "kelas" && styles.segmentCountTextActive,
                  ]}
                >
                  {classList.length}
                </Text>
              </View>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {tab === "jadwal" && (
              <>
                {sessionsLoading && (
                  <View style={styles.classLoading}>
                    <ActivityIndicator color="#2563eb" />
                    <Text style={styles.classLoadingText}>
                      Memuat jadwal & sesi…
                    </Text>
                  </View>
                )}

                {sessionsError && (
                  <View style={styles.classErrorBox}>
                    <Text style={styles.classErrorText}>{sessionsError}</Text>
                  </View>
                )}

                {!sessionsLoading &&
                  !sessionsError &&
                  studentSessions.length === 0 && (
                    <View style={styles.empty}>
                      <View style={styles.emptyIconCircle}>
                        <AppIcon name="calendar" size={26} color="#475569" />
                      </View>
                      <Text style={styles.emptyTitle}>Belum ada jadwal</Text>
                      <Text style={styles.emptySubtitle}>
                        Jadwal praktikum untuk kelas yang Anda ikuti akan muncul
                        di sini.
                      </Text>
                    </View>
                  )}

                {upcoming.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Jadwal Mendatang</Text>
                    {upcoming.map((s) => (
                      <SessionCard
                        key={s.id}
                        id={s.id}
                        mataKuliah={s.practicum.mataKuliah}
                        namaPraktikum={s.practicum.namaPraktikum}
                        nomorPraktikum={s.practicum.nomorPraktikum}
                        namaKelas={s.kelas.namaKelas}
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

                {past.length > 0 && (
                  <>
                    <Text
                      style={[styles.sectionTitle, styles.sectionTitlePast]}
                    >
                      Riwayat Sesi
                    </Text>
                    {past.map((s) => (
                      <SessionCard
                        key={s.id}
                        id={s.id}
                        mataKuliah={s.practicum.mataKuliah}
                        namaPraktikum={s.practicum.namaPraktikum}
                        nomorPraktikum={s.practicum.nomorPraktikum}
                        namaKelas={s.kelas.namaKelas}
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
            )}

            {tab === "kehadiran" && (
              <>
                {myAttendances.length === 0 ? (
                  <View style={styles.empty}>
                    <View style={styles.emptyIconCircle}>
                      <AppIcon name="clipboard" size={26} color="#475569" />
                    </View>
                    <Text style={styles.emptyTitle}>Belum ada kehadiran</Text>
                    <Text style={styles.emptySubtitle}>
                      Catatan presensi Anda akan tersimpan dan tampil di sini
                      setelah melakukan presensi pada sesi yang dibuka.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Catatan Kehadiran</Text>
                    {myAttendances.map((item) => (
                      <AttendanceCard key={item.id} item={item} />
                    ))}
                  </>
                )}
              </>
            )}

            {tab === "kelas" && (
              <>
                {classesLoading ? (
                  <View style={styles.classLoading}>
                    <ActivityIndicator color="#2563eb" />
                    <Text style={styles.classLoadingText}>Memuat kelas…</Text>
                  </View>
                ) : classesError ? (
                  <View style={styles.classErrorBox}>
                    <Text style={styles.classErrorText}>{classesError}</Text>
                  </View>
                ) : classList.length === 0 ? (
                  <View style={styles.empty}>
                    <View style={styles.emptyIconCircle}>
                      <AppIcon name="class" size={26} color="#475569" />
                    </View>
                    <Text style={styles.emptyTitle}>Belum ada kelas</Text>
                    <Text style={styles.emptySubtitle}>
                      Kelas praktikum yang Anda ikuti akan muncul di sini
                      setelah ditambahkan oleh asisten.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>Kelas Saya</Text>
                    {classList.map((item) => (
                      <View key={item.id} style={styles.classCard}>
                        <View style={styles.classIconBox}>
                          <AppIcon name="class" size={20} color="#2563eb" />
                        </View>
                        <View style={styles.classInfo}>
                          <Text style={styles.classCourse} numberOfLines={2}>
                            {item.mataKuliah}
                          </Text>
                          <Text style={styles.classMeta}>
                            Kelas {item.kodeKelas}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}

            <View style={styles.bottomPad} />
          </ScrollView>
        </>
      ) : (
        <>
          <View
            style={[styles.profileHeader, { paddingTop: insets.top + 15 }]}
          >
            <Text style={styles.profileHeaderTitle}>Profil Pengguna</Text>
          </View>
          <ProfileView />
        </>
      )}

      {/* Bottom Navbar 2 Menu */}
      <BottomNavBar activeTab={activeNavTab} onChangeTab={setActiveNavTab} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: "#2563eb",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  greeting: {
    color: "#dbeafe",
    fontSize: 13,
    fontWeight: "600",
  },
  rolePill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rolePillText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  name: { color: "#ffffff", fontSize: 19, fontWeight: "800" },
  nim: { color: "#dbeafe", fontSize: 12, marginTop: 2, fontWeight: "500" },

  profileHeader: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  profileHeaderTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },

  // Segment
  segment: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: "#ffffff",
  },
  segmentText: { fontSize: 12.5, fontWeight: "600", color: "#64748b" },
  segmentTextActive: { color: "#2563eb", fontWeight: "800" },
  segmentCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
    alignItems: "center",
  },
  segmentCountActive: { backgroundColor: "#eff6ff" },
  segmentCountText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  segmentCountTextActive: { color: "#2563eb" },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  bottomPad: { height: 24 },

  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionTitlePast: { color: "#64748b", marginTop: 20 },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardPressed: { opacity: 0.85 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  topRightBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11.5, fontWeight: "700" },

  presensiChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e6f4ea",
    borderWidth: 1,
    borderColor: "#b7dfc2",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  presensiChipText: { fontSize: 11, fontWeight: "700", color: "#0f5132" },

  classBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563eb",
  },

  mataKuliah: { fontSize: 15.5, fontWeight: "800", color: "#0f172a" },
  namaPraktikum: {
    fontSize: 13,
    color: "#475569",
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 10,
  },

  infoRow: { gap: 6 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  infoBottomInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  infoItemInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: { fontSize: 12.5, color: "#475569", fontWeight: "500" },

  // Riwayat kehadiran
  attendanceCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dateBox: {
    width: 52,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginRight: 12,
  },
  dateBoxDay: { fontSize: 10.5, fontWeight: "700", color: "#475569" },
  dateBoxNumber: {
    fontSize: 19,
    fontWeight: "800",
    color: "#2563eb",
    lineHeight: 23,
  },
  dateBoxMonth: { fontSize: 10.5, fontWeight: "700", color: "#475569" },

  attendanceInfo: { flex: 1 },
  attendanceCourse: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  attendanceSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  attendanceTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  attendanceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#15803d",
  },
  attendanceTime: { fontSize: 12, fontWeight: "700", color: "#0f5132" },

  // Kelas & Loading
  classLoading: { paddingVertical: 40, alignItems: "center", gap: 10 },
  classLoadingText: { fontSize: 13, color: "#64748b" },
  classErrorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  classErrorText: { color: "#991b1b", fontSize: 13 },
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  classIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  classInfo: { flex: 1 },
  classCourse: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  classMeta: { fontSize: 12, color: "#64748b", marginTop: 3 },

  // Empty
  empty: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 28,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
  },
});
