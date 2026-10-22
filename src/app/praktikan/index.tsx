import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import type { AttendanceWithSession } from "../../services/sessionService";
import type { SessionStatus } from "../../types";
import {
  formatTanggal,
  formatWaktuLengkap,
  tanggalRingkas,
} from "../../utils/format";

// ─── Konfigurasi Status ───────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  belum_dibuka: {
    label: "Belum Dibuka",
    bg: "#fef3c7",
    text: "#92400e",
    dot: "#f59e0b",
  },
  dibuka: {
    label: "Presensi Dibuka",
    bg: "#d1fae5",
    text: "#065f46",
    dot: "#10b981",
  },
  ditutup: {
    label: "Selesai",
    bg: "#f3f4f6",
    text: "#374151",
    dot: "#9ca3af",
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
  const cfg = STATUS_CONFIG[status];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({ pathname: "/praktikan/session/[id]", params: { id } } as any)
      }
      android_ripple={{ color: "#dbeafe" }}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
          <Text style={[styles.statusText, { color: cfg.text }]}>
            {cfg.label}
          </Text>
        </View>

        {sudahPresensi && (
          <View style={styles.presensiChip}>
            <Text style={styles.presensiChipText}>✓ Sudah presensi</Text>
          </View>
        )}
      </View>

      <Text style={styles.mataKuliah} numberOfLines={1}>
        {mataKuliah}
      </Text>
      <Text style={styles.namaPraktikum} numberOfLines={1}>
        Praktikum ke-{nomorPraktikum} · {namaPraktikum} · Kelas {namaKelas}
      </Text>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>📅</Text>
          <Text style={styles.infoText}>{formatTanggal(tanggal)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>🕐</Text>
          <Text style={styles.infoText}>
            {jamMulai} – {jamSelesai}
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>{ruang}</Text>
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
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
          Praktikum ke-{item.session.practicum.nomorPraktikum} ·{" "}
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

// ─── Layar Utama ──────────────────────────────────────────────────────────────

export default function HomePraktikan() {
  const { user, logout } = useAuth();
  const {
    studentSessions,
    myAttendances,
    refreshStudentSessions,
    refreshMyAttendances,
  } = useSession();
  const [tab, setTab] = useState<"jadwal" | "kehadiran">("jadwal");

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      refreshStudentSessions(user.id);
      refreshMyAttendances(user.id);
    }, [user, refreshStudentSessions, refreshMyAttendances]),
  );

  const attendedSessionIds = useMemo(
    () => new Set(myAttendances.map((a) => a.sessionId)),
    [myAttendances],
  );

  if (!user) return null;

  const upcoming = studentSessions.filter((s) => s.status !== "ditutup");
  const past = studentSessions.filter((s) => s.status === "ditutup");

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>Praktikan</Text>
          </View>
          <Text style={styles.greeting}>Selamat datang 👋</Text>
          <Text style={styles.name}>{user.nama}</Text>
          <Text style={styles.nim}>NIM {user.nim}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>
      </View>

      {/* Segment */}
      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentItem, tab === "jadwal" && styles.segmentActive]}
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
            Kehadiran Saya
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
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === "jadwal" && (
          <>
            {studentSessions.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>📚</Text>
                <Text style={styles.emptyTitle}>Belum ada jadwal</Text>
                <Text style={styles.emptySubtitle}>
                  Jadwal praktikum untuk kelas yang Anda ikuti akan muncul di
                  sini.
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
                <Text style={[styles.sectionTitle, styles.sectionTitlePast]}>
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
                <Text style={styles.emptyIcon}>🗂️</Text>
                <Text style={styles.emptyTitle}>Belum ada kehadiran</Text>
                <Text style={styles.emptySubtitle}>
                  Catatan presensi Anda akan tersimpan dan tampil di sini setelah
                  melakukan presensi pada sesi yang dibuka.
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

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: "#1e40af",
  },
  headerInfo: { flex: 1 },
  rolePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  rolePillText: { color: "#e0e7ff", fontSize: 11, fontWeight: "700" },
  greeting: { color: "#bfdbfe", fontSize: 13 },
  name: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 2 },
  nim: { color: "#93c5fd", fontSize: 13, marginTop: 2 },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 4,
  },
  logoutText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Segment
  segment: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 14,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  segmentTextActive: { color: "#1e40af" },
  segmentCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
    alignItems: "center",
  },
  segmentCountActive: { backgroundColor: "#dbeafe" },
  segmentCountText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  segmentCountTextActive: { color: "#1d4ed8" },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  bottomPad: { height: 24 },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e40af",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 10,
    marginLeft: 2,
  },
  sectionTitlePast: { color: "#6b7280", marginTop: 24 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    position: "relative",
  },
  cardPressed: { opacity: 0.85 },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingRight: 20,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 99 },
  statusText: { fontSize: 12, fontWeight: "600" },

  presensiChip: {
    backgroundColor: "#ecfdf5",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  presensiChipText: { fontSize: 11, fontWeight: "700", color: "#059669" },

  mataKuliah: { fontSize: 16, fontWeight: "700", color: "#111827" },
  namaPraktikum: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
    marginBottom: 12,
  },

  infoRow: { gap: 6 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoIcon: { fontSize: 13 },
  infoText: { fontSize: 13, color: "#374151", flex: 1 },

  chevron: {
    position: "absolute",
    right: 16,
    top: "50%",
    fontSize: 24,
    color: "#d1d5db",
    marginTop: -12,
  },

  // Riwayat kehadiran
  attendanceCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dateBox: {
    width: 54,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginRight: 12,
  },
  dateBoxDay: { fontSize: 11, fontWeight: "700", color: "#60a5fa" },
  dateBoxNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e40af",
    lineHeight: 24,
  },
  dateBoxMonth: { fontSize: 11, fontWeight: "600", color: "#60a5fa" },

  attendanceInfo: { flex: 1 },
  attendanceCourse: { fontSize: 15, fontWeight: "700", color: "#111827" },
  attendanceSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  attendanceTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  attendanceDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: "#10b981",
  },
  attendanceTime: { fontSize: 12, fontWeight: "700", color: "#059669" },

  // Empty
  empty: { alignItems: "center", paddingTop: 64, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
