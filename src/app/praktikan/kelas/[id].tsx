import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
import BottomNavBar from "../../../components/BottomNavBar";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useSession } from "../../../context/SessionContext";
import { subscribeClass } from "../../../services/classService";
import type { ClassRecord } from "../../../types";
import { formatJam, formatTanggal } from "../../../utils/format";

export default function RiwayatPresensiKelasScreen() {
  const params = useLocalSearchParams<{
    id: string;
    mataKuliah?: string;
    kodeKelas?: string;
  }>();
  const classId = typeof params.id === "string" ? params.id : "";
  const paramMataKuliah =
    typeof params.mataKuliah === "string" ? params.mataKuliah : "";
  const paramKodeKelas =
    typeof params.kodeKelas === "string" ? params.kodeKelas : "";

  const { myAttendances, studentSessions } = useSession();
  const [classData, setClassData] = useState<ClassRecord | null>(null);

  useEffect(() => {
    if (!classId) return;
    return subscribeClass(
      classId,
      (item) => setClassData(item),
      () => undefined,
    );
  }, [classId]);

  const classAttendances = useMemo(() => {
    return myAttendances
      .filter((att) => att.session?.classId === classId)
      .sort((a, b) => b.waktuHadir.localeCompare(a.waktuHadir));
  }, [myAttendances, classId]);

  const fallbackSession = useMemo(
    () => studentSessions.find((s) => s.classId === classId) ?? null,
    [studentSessions, classId],
  );

  const mataKuliahTitle =
    classData?.mataKuliah ||
    paramMataKuliah ||
    fallbackSession?.practicum?.mataKuliah ||
    "Kelas Praktikum";
  const kodeKelasLabel =
    classData?.kodeKelas ||
    paramKodeKelas ||
    fallbackSession?.kelas?.namaKelas ||
    "";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backRow}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <AppIcon name="chevron-left" size={20} color={COLORS.textPrimary} />
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Riwayat Presensi
          </Text>
        </Pressable>
        <Text
          style={styles.headerSubtitle}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {mataKuliahTitle}
          {kodeKelasLabel ? ` · Kelas ${kodeKelasLabel}` : ""}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Kehadiran tercatat</Text>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>
              {classAttendances.length} sesi
            </Text>
          </View>
        </View>

        {classAttendances.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="calendar" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada riwayat presensi</Text>
            <Text style={styles.emptySubtitle}>
              Riwayat kehadiran untuk kelas ini akan muncul setelah kamu
              melakukan presensi.
            </Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {classAttendances.map((att) => {
              const nomorStr = String(
                att.session?.practicum?.nomorPraktikum ?? 1,
              ).padStart(2, "0");

              return (
                <Pressable
                  key={att.id}
                  style={({ pressed }) => [
                    styles.attHistoryRow,
                    pressed && styles.pressed,
                  ]}
                  onPress={() =>
                    router.push({
                      pathname: "/praktikan/session/[id]",
                      params: { id: att.sessionId },
                    } as any)
                  }
                >
                  <View style={styles.attCheckCircle}>
                    <AppIcon name="check" size={14} color={COLORS.primary} />
                  </View>

                  <View style={styles.attInfo}>
                    <Text
                      style={styles.attHistoryTitle}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Pertemuan {nomorStr} ·{" "}
                      {att.session?.practicum?.namaPraktikum ??
                        mataKuliahTitle}
                    </Text>
                    <Text
                      style={styles.attHistorySub}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatTanggal(att.session?.tanggal)}
                    </Text>
                  </View>

                  <View style={styles.attRight}>
                    <Text
                      style={styles.attHistoryTime}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatJam(att.waktuHadir)}
                    </Text>
                    <AppIcon
                      name="chevron-right"
                      size={15}
                      color={COLORS.textMuted}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNavBar role="praktikan" activeTab="beranda" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 3,
    marginLeft: 28,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  countPill: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countPillText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  listWrap: {
    gap: 8,
  },
  attHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 13,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  pressed: {
    opacity: 0.85,
  },
  attCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  attInfo: {
    flex: 1,
    minWidth: 0,
  },
  attHistoryTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 19,
    color: COLORS.textPrimary,
  },
  attHistorySub: {
    fontSize: 11.5,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  attRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  attHistoryTime: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 24,
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
