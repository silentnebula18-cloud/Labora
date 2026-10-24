import { router } from "expo-router";
import { useEffect } from "react";
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
import type { SessionStatus } from "../../types";

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
    label: "Sedang Berlangsung",
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

// ─── Komponen Kartu Sesi ──────────────────────────────────────────────────────

interface SessionCardProps {
  id: string;
  mataKuliah: string;
  namaPraktikum: string;
  namaKelas: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  ruang: string;
  status: SessionStatus;
}

function SessionCard({
  id,
  mataKuliah,
  namaPraktikum,
  namaKelas,
  tanggal,
  jamMulai,
  jamSelesai,
  ruang,
  status,
}: SessionCardProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({ pathname: "/asisten/session/[id]", params: { id } } as any)
      }
      android_ripple={{ color: "#e0e7ff" }}
    >
      {/* Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
        <View style={[styles.statusDot, { backgroundColor: cfg.dot }]} />
        <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
      </View>

      {/* Mata Kuliah & Praktikum */}
      <Text style={styles.mataKuliah} numberOfLines={1}>
        {mataKuliah}
      </Text>
      <Text style={styles.namaPraktikum} numberOfLines={1}>
        {namaPraktikum} · Kelas {namaKelas}
      </Text>

      {/* Info */}
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

      {/* Panah kanan */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

// ─── Layar Utama ──────────────────────────────────────────────────────────────

export default function HomeAsisten() {
  const { user, logout } = useAuth();
  const { sessions, refreshSessions } = useSession();

  useEffect(() => {
    if (user) refreshSessions(user.id);
  }, [user, refreshSessions]);

  if (!user) return null;

  const upcoming = sessions.filter((s) => s.status !== "ditutup");
  const past = sessions.filter((s) => s.status === "ditutup");

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Selamat datang 👋</Text>
          <Text style={styles.name}>{user.nama}</Text>
          <Text style={styles.nim}>NIM {user.nim}</Text>
        </View>
        <Pressable onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sessions.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Belum ada jadwal</Text>
            <Text style={styles.emptySubtitle}>
              Jadwal praktikum yang Anda asistensi akan muncul di sini.
            </Text>
          </View>
        )}

        {/* Sesi Aktif / Mendatang */}
        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Jadwal Mendatang</Text>
            {upcoming.map((s) => (
              <SessionCard
                key={s.id}
                id={s.id}
                mataKuliah={s.practicum.mataKuliah}
                namaPraktikum={s.practicum.namaPraktikum}
                namaKelas={s.kelas.namaKelas}
                tanggal={s.tanggal}
                jamMulai={s.jamMulai}
                jamSelesai={s.jamSelesai}
                ruang={s.ruang}
                status={s.status}
              />
            ))}
          </>
        )}

        {/* Riwayat */}
        {past.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.sectionTitlePast]}>
              Riwayat
            </Text>
            {past.map((s) => (
              <SessionCard
                key={s.id}
                id={s.id}
                mataKuliah={s.practicum.mataKuliah}
                namaPraktikum={s.practicum.namaPraktikum}
                namaKelas={s.kelas.namaKelas}
                tanggal={s.tanggal}
                jamMulai={s.jamMulai}
                jamSelesai={s.jamSelesai}
                ruang={s.ruang}
                status={s.status}
              />
            ))}
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

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
    gap: 5,
  },
  statusDot: { width: 7, height: 7, borderRadius: 99 },
  statusText: { fontSize: 12, fontWeight: "600" },

  mataKuliah: { fontSize: 16, fontWeight: "700", color: "#111827" },
  namaPraktikum: { fontSize: 13, color: "#6b7280", marginTop: 2, marginBottom: 12 },

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

  // Empty
  empty: { alignItems: "center", paddingTop: 64, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 20 },
});
