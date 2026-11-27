import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS } from "../constants/theme";
import type { SessionStatus } from "../types";
import { formatJam, formatTanggal } from "../utils/format";
import AppIcon from "./AppIcon";
import BottomSheetModal from "./BottomSheetModal";

export type ConfirmationType = "buka" | "tutup" | "info";

export interface SessionData {
  mataKuliah: string;
  namaPraktikum: string;
  namaKelas: string;
  ruang: string;
  tanggal: Date;
  jamMulai: Date;
  jamSelesai: Date;
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

export default function ConfirmationBottomSheet({
  visible,
  type,
  sessionData,
  onConfirm,
  onClose,
}: ConfirmationBottomSheetProps) {
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setIsScrollAtTop(true);
    }
  }

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
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      canDragBody={isScrollAtTop}
      footer={
        isInfo ? undefined : (
          <View style={styles.footer}>
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
                  {isBuka
                    ? sessionData.status === "closed"
                      ? "Buka Kembali"
                      : "Buka Sesi"
                    : "Ya, Tutup Sesi"}
                </Text>
              </Pressable>
            </View>
          </View>
        )
      }
    >
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={(e) => {
          const atTop = e.nativeEvent.contentOffset.y <= 2;
          setIsScrollAtTop((prev) => (prev === atTop ? prev : atTop));
        }}
        scrollEventThrottle={16}
      >
        {/* Header */}
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
              size={20}
              color={
                isBuka
                  ? COLORS.primary
                  : isTutup
                    ? COLORS.dangerText
                    : COLORS.primary
              }
            />
          </View>

          <Text style={styles.title}>
            {isBuka
              ? sessionData.status === "closed"
                ? "Buka Kembali Sesi Praktikum"
                : "Buka Sesi Praktikum"
              : isTutup
                ? "Tutup Sesi Praktikum"
                : "Rincian Sesi Praktikum"}
          </Text>

          <Text style={styles.subtitle}>
            {isBuka
              ? sessionData.status === "closed"
                ? "Sesi akan diaktifkan kembali selama rentang jam jadwal masih berlangsung."
                : "Praktikan dapat melakukan presensi dengan kode sesi setelah sesi dibuka."
              : isTutup
                ? "Tinjau ringkasan kehadiran sebelum menutup sesi praktikum."
                : "Informasi jadwal dan ringkasan kehadiran sesi praktikum."}
          </Text>
        </View>

        {/* Informasi Sesi */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mata kuliah</Text>
            <Text
              style={styles.infoValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {sessionData.mataKuliah}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Pertemuan</Text>
            <Text
              style={styles.infoValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {sessionData.namaPraktikum}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kelas & ruang</Text>
            <Text
              style={styles.infoValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Kelas {sessionData.namaKelas} · {sessionData.ruang}
            </Text>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Jadwal</Text>
            <Text
              style={styles.infoValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {formatTanggal(sessionData.tanggal)} ·{" "}
              {formatJam(sessionData.jamMulai)}–
              {formatJam(sessionData.jamSelesai)} WIB
            </Text>
          </View>
        </View>

        {/* Ringkasan Presensi */}
        {(isTutup || isInfo) && (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                  {sessionData.hadirCount}
                </Text>
                <Text style={styles.statLabel}>Hadir</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{belumHadirCount}</Text>
                <Text style={styles.statLabel}>Belum</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
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
                Tingkat kehadiran: {attendanceRate}%
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  scrollArea: {
    maxHeight: 480,
  },
  scrollContent: {
    paddingHorizontal: 22,
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
    backgroundColor: COLORS.primarySoft,
  },
  iconCircleTutup: {
    backgroundColor: COLORS.dangerBg,
  },
  iconCircleInfo: {
    backgroundColor: COLORS.primarySoft,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    minWidth: 0,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },
  statsCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    gap: 2,
  },
  statNumber: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  rateBarContainer: {
    gap: 6,
  },
  rateBarBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  rateBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  rateText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  bukaBtn: {
    flex: 1.5,
    backgroundColor: COLORS.primary,
  },
  tutupBtn: {
    flex: 1.5,
    backgroundColor: COLORS.dangerText,
  },
  actionBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
