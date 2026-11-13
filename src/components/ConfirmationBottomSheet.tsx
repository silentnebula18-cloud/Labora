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
import AppIcon from "./AppIcon";

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
  if (Number.isNaN(d.getTime())) return iso;
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
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Tutup modal"
          accessibilityRole="button"
        />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
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
                <AppIcon
                  name={isBuka ? "play" : isTutup ? "stop" : "info"}
                  size={22}
                  color={isBuka ? "#0f5132" : isTutup ? "#991b1b" : "#2563eb"}
                />
              </View>

              <Text style={styles.title}>
                {isBuka
                  ? "Buka Sesi Praktikum"
                  : isTutup
                    ? "Tutup Sesi Praktikum"
                    : "Rincian Operasional Sesi"}
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
                <Text style={styles.infoLabel}>Tanggal</Text>
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
                    <Text style={styles.statLabel}>Terdaftar</Text>
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
                <AppIcon name="info" size={16} color="#2563eb" />
                <Text style={styles.noticeText}>
                  <Text style={styles.noticeBold}>Catatan: </Text>
                  Setelah sesi dibuka, waktu pembukaan sesi dicatat di sistem
                  dan praktikan dapat langsung melakukan presensi.
                </Text>
              </View>
            )}

            {isTutup && (
              <View style={styles.noticeBoxTutup}>
                <AppIcon name="alert" size={16} color="#991b1b" />
                <Text style={styles.noticeText}>
                  <Text style={styles.noticeBold}>Perhatian: </Text>
                  Sesi yang ditutup bersifat final dan tidak dapat digunakan
                  lagi untuk presensi.
                </Text>
              </View>
            )}

            {isInfo && (
              <View style={styles.noticeBoxInfo}>
                <AppIcon name="info" size={16} color="#2563eb" />
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
                <Text style={styles.primaryBtnText}>Tutup</Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.55)",
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
  },
  scrollArea: {
    maxHeight: 500,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconCircleBuka: {
    backgroundColor: "#e6f4ea",
    borderWidth: 1,
    borderColor: "#b7dfc2",
  },
  iconCircleTutup: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  iconCircleInfo: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },

  infoCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 12.5,
    color: "#64748b",
    fontWeight: "500",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "700",
    textAlign: "right",
    flex: 1.5,
  },
  infoDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 7,
  },

  statsCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
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
    borderRadius: 10,
    alignItems: "center",
  },
  statBoxHadir: {
    backgroundColor: "#e6f4ea",
    borderWidth: 1,
    borderColor: "#b7dfc2",
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
    fontSize: 17,
    fontWeight: "800",
    color: "#0f5132",
  },
  statNumberBelum: {
    fontSize: 17,
    fontWeight: "800",
    color: "#991b1b",
  },
  statNumberTotal: {
    fontSize: 17,
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
    backgroundColor: "#2563eb",
    borderRadius: 3,
  },
  rateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    textAlign: "right",
  },

  noticeBoxBuka: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  noticeBoxTutup: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  noticeBoxInfo: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
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

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#334155",
  },
  bukaBtn: {
    flex: 1.6,
    backgroundColor: "#2563eb",
  },
  tutupBtn: {
    flex: 1.6,
    backgroundColor: "#991b1b",
  },
  actionBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#ffffff",
  },
});
