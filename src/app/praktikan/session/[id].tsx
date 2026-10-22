import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import type { SessionStatus } from "../../../types";
import { formatTanggal, formatWaktuLengkap } from "../../../utils/format";

// ─── Konfigurasi Status ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<SessionStatus, string> = {
  belum_dibuka: "Belum Dibuka",
  dibuka: "Presensi Dibuka",
  ditutup: "Selesai",
};

const STATUS_COLOR: Record<SessionStatus, string> = {
  belum_dibuka: "#f59e0b",
  dibuka: "#10b981",
  ditutup: "#9ca3af",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Layar Detail Sesi ────────────────────────────────────────────────────────

export default function SessionDetailPraktikan() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    studentSessions,
    myAttendances,
    getSession,
    markAttendance,
    refreshStudentSessions,
    refreshMyAttendances,
  } = useSession();

  // Pastikan data segar walau layar dibuka langsung lewat deep link.
  useEffect(() => {
    if (!user) return;
    refreshStudentSessions(user.id);
    refreshMyAttendances(user.id);
  }, [user, refreshStudentSessions, refreshMyAttendances]);

  const session = useMemo(() => {
    const fromList = id ? studentSessions.find((s) => s.id === id) : undefined;
    return fromList ?? (id ? getSession(id) : null);
  }, [id, studentSessions, getSession]);

  const attendance = useMemo(() => {
    if (!id) return null;
    return myAttendances.find((a) => a.sessionId === id) ?? null;
  }, [id, myAttendances]);

  function lakukanPresensi() {
    if (!session || !user) return;

    const result = markAttendance(session.id, user.id);
    if (result.ok) {
      Alert.alert(
        "Presensi Berhasil",
        `Kehadiran Anda tercatat pada ${formatWaktuLengkap(
          result.attendance.waktuHadir,
        )}.`,
      );
    } else {
      Alert.alert("Presensi Gagal", result.message);
    }
  }

  function konfirmasiPresensi() {
    if (!session) return;

    Alert.alert(
      "Konfirmasi Presensi",
      `Catat kehadiran Anda untuk ${session.practicum.namaPraktikum} · Kelas ${session.kelas.namaKelas}?`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Hadir", onPress: lakukanPresensi },
      ],
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={styles.notFoundTitle}>Sesi tidak ditemukan</Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLOR[session.status];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>

        {/* Info Sesi */}
        <View style={styles.sessionCard}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusColor + "22" },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusLabel, { color: statusColor }]}>
              {STATUS_LABEL[session.status]}
            </Text>
          </View>

          <Text style={styles.mataKuliah}>{session.practicum.mataKuliah}</Text>
          <Text style={styles.namaPraktikum}>
            Praktikum ke-{session.practicum.nomorPraktikum} ·{" "}
            {session.practicum.namaPraktikum}
          </Text>

          <View style={styles.detailList}>
            <DetailRow label="Kelas" value={session.kelas.namaKelas} />
            <DetailRow label="Ruang" value={session.ruang} />
            <DetailRow label="Tanggal" value={formatTanggal(session.tanggal)} />
            <DetailRow
              label="Waktu"
              value={`${session.jamMulai} – ${session.jamSelesai}`}
            />
          </View>
        </View>

        {/* Panel Presensi */}
        {attendance ? (
          <View style={[styles.presenceCard, styles.presenceSuccess]}>
            <Text style={styles.presenceIcon}>✅</Text>
            <Text style={styles.presenceTitle}>Presensi Berhasil</Text>
            <Text style={styles.presenceSuccessText}>
              Anda tercatat hadir pada{" "}
              {formatWaktuLengkap(attendance.waktuHadir)}.
            </Text>
            <Text style={styles.presenceNote}>
              Presensi hanya dapat dilakukan satu kali untuk setiap sesi.
            </Text>
          </View>
        ) : session.status === "dibuka" ? (
          <>
            <View style={[styles.presenceCard, styles.presenceOpen]}>
              <Text style={styles.presenceIcon}>🖐️</Text>
              <Text style={styles.presenceTitle}>Sesi sedang dibuka</Text>
              <Text style={styles.presenceOpenText}>
                Asisten telah membuka sesi ini. Lakukan presensi sebelum sesi
                ditutup.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.actionBtnPressed,
              ]}
              onPress={konfirmasiPresensi}
            >
              <Text style={styles.actionBtnIcon}>✓</Text>
              <Text style={styles.actionBtnText}>Lakukan Presensi</Text>
            </Pressable>
          </>
        ) : session.status === "belum_dibuka" ? (
          <View style={[styles.presenceCard, styles.presencePending]}>
            <Text style={styles.presenceIcon}>⏳</Text>
            <Text style={styles.presenceTitle}>Sesi belum dibuka</Text>
            <Text style={styles.presencePendingText}>
              Tombol presensi akan aktif setelah asisten membuka sesi ini.
            </Text>
          </View>
        ) : (
          <View style={[styles.presenceCard, styles.presenceClosed]}>
            <Text style={styles.presenceIcon}>🔒</Text>
            <Text style={styles.presenceTitle}>Sesi telah ditutup</Text>
            <Text style={styles.presenceClosedText}>
              Anda tidak tercatat hadir pada sesi ini.
            </Text>
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16 },

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

  mataKuliah: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  namaPraktikum: { fontSize: 14, color: "#6b7280", marginBottom: 16 },

  detailList: { gap: 10 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },

  // Panel presensi
  presenceCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 14,
  },
  presenceIcon: { fontSize: 32, marginBottom: 8 },
  presenceTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  presenceNote: { fontSize: 12, color: "#6b7280", marginTop: 10 },

  presenceSuccess: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  presenceSuccessText: {
    fontSize: 14,
    color: "#047857",
    fontWeight: "600",
    textAlign: "center",
  },

  presenceOpen: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  presenceOpenText: {
    fontSize: 13,
    color: "#1d4ed8",
    textAlign: "center",
    lineHeight: 19,
  },

  presencePending: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  presencePendingText: {
    fontSize: 13,
    color: "#92400e",
    textAlign: "center",
    lineHeight: 19,
  },

  presenceClosed: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  presenceClosedText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  actionBtnPressed: { opacity: 0.82 },
  actionBtnIcon: { color: "#fff", fontSize: 16, fontWeight: "700" },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Not found
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  notFoundIcon: { fontSize: 48, marginBottom: 12 },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: { color: "#fff", fontWeight: "700" },

  bottomPad: { height: 24 },
});
