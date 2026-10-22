import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSession } from "../../../context/SessionContext";
import type { AttendanceWithStudent } from "../../../services/sessionService";
import type { SessionStatus } from "../../../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTanggal(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWaktu(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ─── Komponen Baris Presensi ──────────────────────────────────────────────────

function AttendanceRow({
  item,
  index,
}: {
  item: AttendanceWithStudent;
  index: number;
}) {
  return (
    <View style={styles.attendanceRow}>
      <View style={styles.attendanceIndex}>
        <Text style={styles.attendanceIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.attendanceInfo}>
        <Text style={styles.attendanceName}>{item.namaStudent}</Text>
        <Text style={styles.attendanceNim}>NIM {item.nimStudent}</Text>
      </View>
      <View style={styles.attendanceTime}>
        <Text style={styles.attendanceTimeText}>{formatWaktu(item.waktuHadir)}</Text>
        <Text style={styles.attendanceTimeLabel}>Hadir pukul</Text>
      </View>
    </View>
  );
}

// ─── Konfigurasi Status ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<SessionStatus, string> = {
  belum_dibuka: "Belum Dibuka",
  dibuka: "Sedang Berlangsung",
  ditutup: "Selesai",
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  belum_dibuka: "#f59e0b",
  dibuka: "#10b981",
  ditutup: "#9ca3af",
};

// ─── Layar Detail Sesi ────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getSession, getAttendances, getEnrolled, setSessionStatus, sessions } =
    useSession();

  // Derive session — baca dari sessions[] agar reaktif terhadap perubahan status.
  // Fallback ke getSession() untuk pertama kali sebelum sessions di-load.
  const session = useMemo(() => {
    const fromList = id ? sessions.find((s) => s.id === id) : undefined;
    return fromList ?? (id ? getSession(id) : null);
  }, [id, sessions, getSession]);

  const attendances = useMemo(
    () => (id ? getAttendances(id) : []),
    [id, getAttendances],
  );

  const enrolledCount = useMemo(
    () => (session ? getEnrolled(session.classId) : 0),
    [session, getEnrolled],
  );

  // ─── Handler Buka / Tutup ───────────────────────────────────────────────────

  function handleBukaSesi() {
    if (!session) return;
    Alert.alert(
      "Buka Sesi",
      "Praktikan akan dapat melakukan presensi setelah sesi dibuka. Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Buka Sesi",
          onPress: () => setSessionStatus(session.id, "dibuka"),
        },
      ],
    );
  }

  function handleTutupSesi() {
    if (!session) return;
    Alert.alert(
      "Tutup Sesi",
      "Sesi yang ditutup tidak dapat dibuka kembali. Lanjutkan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Tutup Sesi",
          style: "destructive",
          onPress: () => setSessionStatus(session.id, "ditutup"),
        },
      ],
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Memuat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hadirCount = attendances.length;
  const statusColor = STATUS_COLOR[session.status];

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={attendances}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <>
            {/* Tombol Kembali */}
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>‹ Kembali</Text>
            </Pressable>

            {/* Info Sesi */}
            <View style={styles.sessionCard}>
              {/* Status */}
              <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusLabel, { color: statusColor }]}>
                  {STATUS_LABEL[session.status]}
                </Text>
              </View>

              <Text style={styles.mataKuliah}>{session.practicum.mataKuliah}</Text>
              <Text style={styles.namaPraktikum}>
                {session.practicum.namaPraktikum} · Kelas {session.kelas.namaKelas}
              </Text>

              {/* Detail Grid */}
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>📅</Text>
                  <View>
                    <Text style={styles.detailLabel}>Tanggal</Text>
                    <Text style={styles.detailValue}>{formatTanggal(session.tanggal)}</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>🕐</Text>
                  <View>
                    <Text style={styles.detailLabel}>Waktu</Text>
                    <Text style={styles.detailValue}>
                      {session.jamMulai} – {session.jamSelesai}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>📍</Text>
                  <View>
                    <Text style={styles.detailLabel}>Ruang</Text>
                    <Text style={styles.detailValue}>{session.ruang}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Tombol Aksi */}
            {session.status === "belum_dibuka" && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnOpen,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={handleBukaSesi}
              >
                <Text style={styles.actionBtnIcon}>▶</Text>
                <Text style={styles.actionBtnText}>Buka Sesi Praktikum</Text>
              </Pressable>
            )}

            {session.status === "dibuka" && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnClose,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={handleTutupSesi}
              >
                <Text style={styles.actionBtnIcon}>■</Text>
                <Text style={styles.actionBtnText}>Tutup Sesi Praktikum</Text>
              </Pressable>
            )}

            {session.status === "ditutup" && (
              <View style={styles.closedBanner}>
                <Text style={styles.closedBannerText}>
                  ✓ Sesi telah ditutup
                </Text>
              </View>
            )}

            {/* Header Tabel Presensi */}
            <View style={styles.attendanceHeader}>
              <Text style={styles.attendanceSectionTitle}>Daftar Presensi</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {hadirCount}/{enrolledCount} hadir
                </Text>
              </View>
            </View>

            {hadirCount === 0 && (
              <View style={styles.emptyAttendance}>
                <Text style={styles.emptyAttendanceIcon}>👥</Text>
                <Text style={styles.emptyAttendanceText}>
                  Belum ada praktikan yang hadir
                </Text>
              </View>
            )}
          </>
        )}
        renderItem={({ item, index }) => (
          <AttendanceRow item={item} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16, color: "#6b7280" },

  listContent: { padding: 16 },

  // Tombol kembali
  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backText: { fontSize: 16, color: "#1e40af", fontWeight: "600" },

  // Kartu info sesi
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
    gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 99 },
  statusLabel: { fontSize: 12, fontWeight: "700" },

  mataKuliah: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 4 },
  namaPraktikum: { fontSize: 14, color: "#6b7280", marginBottom: 18 },

  detailGrid: { gap: 12 },
  detailItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  detailIcon: { fontSize: 16, marginTop: 1 },
  detailLabel: { fontSize: 11, color: "#9ca3af", fontWeight: "600", textTransform: "uppercase" },
  detailValue: { fontSize: 14, color: "#1f2937", fontWeight: "500", marginTop: 1 },

  // Tombol aksi
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  actionBtnOpen: { backgroundColor: "#059669" },
  actionBtnClose: { backgroundColor: "#dc2626" },
  actionBtnPressed: { opacity: 0.82 },
  actionBtnIcon: { color: "#fff", fontSize: 14, fontWeight: "700" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Banner tutup
  closedBanner: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  closedBannerText: { color: "#6b7280", fontSize: 15, fontWeight: "600" },

  // Presensi
  attendanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  attendanceSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  countBadge: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: "#1d4ed8" },

  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  attendanceIndex: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  attendanceIndexText: { fontSize: 13, fontWeight: "700", color: "#1e40af" },
  attendanceInfo: { flex: 1 },
  attendanceName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  attendanceNim: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  attendanceTime: { alignItems: "flex-end" },
  attendanceTimeText: { fontSize: 14, fontWeight: "700", color: "#059669" },
  attendanceTimeLabel: { fontSize: 11, color: "#9ca3af", marginTop: 1 },

  // Empty state
  emptyAttendance: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 8,
  },
  emptyAttendanceIcon: { fontSize: 36, marginBottom: 10 },
  emptyAttendanceText: { fontSize: 14, color: "#9ca3af", fontWeight: "500" },
});
