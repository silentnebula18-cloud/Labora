import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
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
import { useAuth } from "../../context/AuthContext";
import { useSession } from "../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeAssistantClasses,
} from "../../services/classService";
import type { ScheduleInput } from "../../services/sessionService";
import type { ClassRecord, SessionStatus } from "../../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTanggal(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

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
    label: "Sesi Dibuka",
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

// ─── Komponen Kartu Sesi ──────────────────────────────────────────────────────

interface SessionCardProps {
  id: string;
  mataKuliah: string;
  nomorPraktikum: number;
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
  nomorPraktikum,
  namaPraktikum,
  namaKelas,
  tanggal,
  jamMulai,
  jamSelesai,
  ruang,
  status,
}: SessionCardProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({ pathname: "/asisten/session/[id]", params: { id } } as any)
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

        <View style={styles.classBadge}>
          <Text style={styles.classBadgeText}>Kelas {namaKelas}</Text>
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

// ─── Layar Utama Asisten ──────────────────────────────────────────────────────

export default function HomeAsisten() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    sessions,
    sessionsLoading,
    sessionsError,
    createSchedule,
  } = useSession();

  const [activeTab, setActiveTab] = useState<BottomNavTab>("beranda");
  const [classes, setClasses] = useState<ClassRecord[]>([]);

  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeAssistantClasses(user.id, (items) => {
      setClasses(items);
    });
    return unsubscribe;
  }, [user]);

  if (!user) return null;

  const upcoming = sessions.filter((s) => s.status !== "closed");
  const past = sessions.filter((s) => s.status === "closed");

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

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar style="light" />
      {activeTab === "beranda" ? (
        <>
          {/* Header Beranda */}
          <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
            <View style={styles.headerTopRow}>
              <Text style={styles.greeting}>Selamat datang,</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>ASISTEN PRAKTIKUM</Text>
              </View>
            </View>
            <Text style={styles.name}>{user.nama}</Text>
            <Text style={styles.nim}>NIM {user.nim}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Menu Aksi Utama (Gaya Super-App Ringkas) */}
            <View style={styles.quickActionsGrid}>
              <Pressable
                style={({ pressed }) => [
                  styles.quickActionTile,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => router.push("/asisten/kelas" as any)}
                android_ripple={{ color: "#e2e8f0" }}
              >
                <View style={styles.quickActionIconBox}>
                  <AppIcon name="class" size={20} color="#2563eb" />
                </View>
                <Text style={styles.quickActionTitle}>Kelola Kelas</Text>
                <Text style={styles.quickActionSub}>
                  {classes.length} kelas aktif
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.quickActionTile,
                  styles.quickActionTilePrimary,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  setFormError(null);
                  setFormVisible(true);
                }}
                android_ripple={{ color: "#1d4ed8" }}
              >
                <View style={styles.quickActionIconBoxPrimary}>
                  <AppIcon name="plus" size={20} color="#ffffff" />
                </View>
                <Text style={styles.quickActionTitlePrimary}>
                  Tambah Jadwal
                </Text>
                <Text style={styles.quickActionSubPrimary}>
                  Buat jadwal & sesi
                </Text>
              </Pressable>
            </View>

            {sessionsLoading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#2563eb" />
                <Text style={styles.loadingText}>Memuat jadwal & sesi…</Text>
              </View>
            )}

            {sessionsError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{sessionsError}</Text>
              </View>
            )}

            {!sessionsLoading && !sessionsError && sessions.length === 0 && (
              <View style={styles.empty}>
                <View style={styles.emptyIconCircle}>
                  <AppIcon name="clipboard" size={28} color="#475569" />
                </View>
                <Text style={styles.emptyTitle}>Belum ada jadwal</Text>
                <Text style={styles.emptySubtitle}>
                  Pilih menu Tambah Jadwal di atas untuk menjadwalkan sesi
                  praktikum baru.
                </Text>
              </View>
            )}

            {/* Sesi Aktif / Mendatang */}
            {upcoming.length > 0 && (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    Jadwal Aktif & Mendatang
                  </Text>
                  <Text style={styles.sectionCount}>{upcoming.length}</Text>
                </View>
                {upcoming.map((s) => (
                  <SessionCard
                    key={s.id}
                    id={s.id}
                    mataKuliah={s.practicum.mataKuliah}
                    nomorPraktikum={s.practicum.nomorPraktikum}
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

            {/* Riwayat Sesi */}
            {past.length > 0 && (
              <>
                <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                  <Text style={[styles.sectionTitle, styles.sectionTitlePast]}>
                    Riwayat Sesi Ditutup
                  </Text>
                  <Text style={styles.sectionCount}>{past.length}</Text>
                </View>
                {past.map((s) => (
                  <SessionCard
                    key={s.id}
                    id={s.id}
                    mataKuliah={s.practicum.mataKuliah}
                    nomorPraktikum={s.practicum.nomorPraktikum}
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
      <BottomNavBar activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modal Tambah Jadwal */}
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

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  bottomPad: { height: 24 },

  // Quick Actions Grid
  quickActionsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quickActionTilePrimary: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  quickActionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickActionIconBoxPrimary: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  quickActionSub: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
  },
  quickActionTitlePrimary: {
    fontSize: 14,
    fontWeight: "800",
    color: "#ffffff",
  },
  quickActionSubPrimary: {
    fontSize: 11.5,
    color: "#dbeafe",
    marginTop: 2,
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: { fontSize: 13, color: "#64748b" },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  errorBoxText: { color: "#991b1b", fontSize: 13 },

  // Section Header
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#2563eb",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionTitlePast: { color: "#64748b" },
  sectionCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },

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
