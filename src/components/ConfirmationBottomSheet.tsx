import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SessionStatus } from "../types";

export type ConfirmationType = "buka" | "tutup" | "info";

export interface SessionData {
  mataKuliah: string;
  namaPraktikum: string;
  namaKelas: string;
  ruang: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  status: SessionStatus;
  enrolledCount: number;
  hadirCount: number;
  asistenNama?: string;
}

export interface ConfirmationBottomSheetProps {
  visible: boolean;
  type: ConfirmationType | null;
  sessionData: SessionData | null;
  onConfirm: () => void;
  onClose: () => void;
}

function formatTanggal(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ConfirmationBottomSheet({
  visible,
  type,
  sessionData,
  onConfirm,
  onClose,
}: ConfirmationBottomSheetProps) {
  const insets = useSafeAreaInsets();

  if (!visible || !type || !sessionData) {
    return null;
  }

  const isBuka = type === "buka";
  const isTutup = type === "tutup";
  const isInfo = type === "info";

  const belumHadirCount = Math.max(
    0,
    sessionData.enrolledCount - sessionData.hadirCount,
  );
  const attendanceRate =
    sessionData.enrolledCount > 0
      ? Math.round(
          (sessionData.hadirCount / sessionData.enrolledCount) * 100,
        )
      : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop untuk klik dismiss */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Tutup modal"
          accessibilityRole="button"
        />

        {/* Sheet Card */}
        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Handle bar drag indicator */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header dengan Icon & Judul */}
            <View style={styles.header}>
              <View
                style={[
                  styles.iconCircle,
                  isBuka && styles.iconCircleBuka,
                  isTutup && styles.iconCircleTutup,
                  isInfo && styles.iconCircleInfo,
                ]}
              >
                <Text style={styles.iconText}>
                  {isBuka ? "▶" : isTutup ? "⏹" : "ℹ"}
                </Text>
              </View>

              <Text style={styles.title}>
                {isBuka
                  ? "Buka Sesi Praktikum"
                  : isTutup
                    ? "Tutup Sesi Praktikum"
                    : "Informasi Pendukung Sesi"}
              </Text>

              <Text style={styles.subtitle}>
                {isBuka
                  ? "Praktikan akan dapat melakukan presensi kehadiran secara mandiri setelah sesi dibuka."
                  : isTutup
                    ? "Tinjau ringkasan kehadiran di bawah ini. Sesi yang telah ditutup tidak dapat dibuka kembali."
                    : "Rincian operasional, jadwal, dan panduan pelaksanaan sesi praktikum."}
              </Text>
            </View>

            {/* Kotak Informasi Pendukung */}
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>INFORMASI SESI</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mata Kuliah</Text>
                <Text style={styles.infoValue}>
                  {sessionData.mataKuliah}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Praktikum</Text>
                <Text style={styles.infoValue}>
                  {sessionData.namaPraktikum}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Kelas & Ruang</Text>
                <Text style={styles.infoValue}>
                  Kelas {sessionData.namaKelas} · {sessionData.ruang}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Jadwal</Text>
                <Text style={styles.infoValue}>
                  {formatTanggal(sessionData.tanggal)}
                </Text>
              </View>

              <View style={styles.infoDivider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Waktu</Text>
                <Text style={styles.infoValue}>
                  {sessionData.jamMulai} – {sessionData.jamSelesai} WIB
                </Text>
              </View>
            </View>

            {/* Ringkasan Presensi (Tampil saat Tutup atau Info) */}
            {(isTutup || isInfo) && (
              <View style={styles.statsCard}>
                <Text style={styles.infoCardTitle}>
                  RINGKASAN PRESENSI SAAT INI
                </Text>
                <View style={styles.statsRow}>
                  <View style={[styles.statBox, styles.statBoxHadir]}>
                    <Text style={styles.statNumberHadir}>
                      {sessionData.hadirCount}
                    </Text>
                    <Text style={styles.statLabel}>Hadir</Text>
                  </View>

                  <View style={[styles.statBox, styles.statBoxBelum]}>
                    <Text style={styles.statNumberBelum}>
                      {belumHadirCount}
                    </Text>
                    <Text style={styles.statLabel}>Belum Hadir</Text>
                  </View>

                  <View style={[styles.statBox, styles.statBoxTotal]}>
                    <Text style={styles.statNumberTotal}>
                      {sessionData.enrolledCount}
                    </Text>
                    <Text style={styles.statLabel}>Total Terdaftar</Text>
                  </View>
                </View>

                <View style={styles.rateBarContainer}>
                  <View style={styles.rateBarBackground}>
                    <View
                      style={[
                        styles.rateBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, attendanceRate))}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.rateText}>
                    Tingkat Kehadiran: {attendanceRate}%
                  </Text>
                </View>
              </View>
            )}

            {/* Banner Catatan / Konsekuensi Aksi */}
            {isBuka && (
              <View style={styles.noticeBoxBuka}>
                <Text style={styles.noticeIcon}>💡</Text>
                <Text style={styles.noticeText}>
                  <Text style={styles.noticeBold}>Catatan: </Text>
                  Setelah sesi dibuka, waktu presensi mulai dihitung. Pastikan
                  asisten telah siap di ruang laboratorium.
                </Text>
              </View>
            )}

            {isTutup && (
              <View style={styles.noticeBoxTutup}>
                <Text style={styles.noticeIcon}>⚠️</Text>
                <Text style={styles.noticeText}>
                  <Text style={styles.noticeBold}>Perhatian: </Text>
                  Sesi yang ditutup bersifat final dan tidak dapat dibuka kembali.
                  Mahasiswa yang belum presensi akan tercatat tidak hadir.
                </Text>
              </View>
            )}

            {isInfo && (
              <View style={styles.noticeBoxInfo}>
                <Text style={styles.noticeIcon}>📌</Text>
                <Text style={styles.noticeText}>
                  <Text style={styles.noticeBold}>Panduan: </Text>
                  Gunakan tombol Buka Sesi saat praktikum dimulai dan Tutup Sesi
                  setelah praktikum selesai dilaksanakan.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Tombol Aksi Bawah */}
          <View style={styles.footer}>
            {isInfo ? (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryBtn,
                  pressed && styles.buttonPressed,
                ]}
                onPress={onClose}
              >
                <Text style={styles.primaryBtnText}>Tutup Informasi</Text>
              </Pressable>
            ) : (
              <View style={styles.buttonGroup}>
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.cancelBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelBtnText}>Batal</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    isBuka ? styles.bukaBtn : styles.tutupBtn,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={onConfirm}
                >
                  <Text style={styles.actionBtnText}>
                    {isBuka ? "Buka Sesi Sekarang" : "Ya, Tutup Sesi"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "88%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#cbd5e1",
  },
  scrollArea: {
    maxHeight: 500,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 12,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 18,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconCircleBuka: {
    backgroundColor: "#d1fae5",
    borderWidth: 1.5,
    borderColor: "#10b981",
  },
  iconCircleTutup: {
    backgroundColor: "#fee2e2",
    borderWidth: 1.5,
    borderColor: "#ef4444",
  },
  iconCircleInfo: {
    backgroundColor: "#dbeafe",
    borderWidth: 1.5,
    borderColor: "#3b82f6",
  },
  iconText: {
    fontSize: 22,
    fontWeight: "700",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  infoCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: "#1e293b",
    fontWeight: "700",
    textAlign: "right",
    flex: 1.5,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },

  // Stats Card
  statsCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  statBoxHadir: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  statBoxBelum: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  statBoxTotal: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  statNumberHadir: {
    fontSize: 18,
    fontWeight: "800",
    color: "#059669",
  },
  statNumberBelum: {
    fontSize: 18,
    fontWeight: "800",
    color: "#dc2626",
  },
  statNumberTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#334155",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 2,
    textAlign: "center",
  },
  rateBarContainer: {
    gap: 6,
  },
  rateBarBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  rateBarFill: {
    height: "100%",
    backgroundColor: "#059669",
    borderRadius: 3,
  },
  rateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "right",
  },

  // Notice Boxes
  noticeBoxBuka: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  noticeBoxTutup: {
    flexDirection: "row",
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#fecdd3",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  noticeBoxInfo: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 14,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  noticeIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 12.5,
    color: "#334155",
    lineHeight: 18,
  },
  noticeBold: {
    fontWeight: "700",
    color: "#0f172a",
  },

  // Footer & Buttons
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },
  bukaBtn: {
    flex: 1.7,
    backgroundColor: "#059669",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  tutupBtn: {
    flex: 1.7,
    backgroundColor: "#dc2626",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  primaryBtn: {
    backgroundColor: "#1e40af",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
