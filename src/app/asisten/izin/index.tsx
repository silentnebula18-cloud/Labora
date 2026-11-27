import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
import BottomNavBar from "../../../components/BottomNavBar";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeAssistantClasses,
} from "../../../services/classService";
import { subscribeAssistantPermissions } from "../../../services/permissionService";
import type {
  ClassRecord,
  PermissionRecord,
  PermissionStatus,
} from "../../../types";
import { formatJam, formatTanggal } from "../../../utils/format";

interface IzinAsistenListScreenProps {
  embedded?: boolean;
}

const AI_SENTIMENT_PILL: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  positif: {
    label: "AI · Sentimen: Positif",
    bg: COLORS.successBg,
    text: COLORS.successText,
  },
  netral: {
    label: "AI · Sentimen: Netral",
    bg: COLORS.primarySoft,
    text: COLORS.primary,
  },
  negatif: {
    label: "AI · Sentimen: Negatif",
    bg: COLORS.dangerBg,
    text: COLORS.dangerText,
  },
};

function formatWaktuPengajuan(date: Date | null): string {
  if (!date) return "";
  return `${formatJam(date)} WIB`;
}

export default function IzinAsistenListScreen({
  embedded = false,
}: IzinAsistenListScreenProps) {
  const { sessionId: initialSessionId } = useLocalSearchParams<{
    sessionId?: string;
  }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { sessions } = useSession();

  const [filterSessionId, setFilterSessionId] = useState<string>(
    typeof initialSessionId === "string" ? initialSessionId : "",
  );
  const [prevParamSessionId, setPrevParamSessionId] =
    useState(initialSessionId);
  if (initialSessionId !== prevParamSessionId) {
    setPrevParamSessionId(initialSessionId);
    setFilterSessionId(
      typeof initialSessionId === "string" ? initialSessionId : "",
    );
  }

  const [activeFilter, setActiveFilter] =
    useState<PermissionStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classesLoaded, setClassesLoaded] = useState(false);

  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeAssistantClasses(
      user.id,
      (items) => {
        setClasses(items);
        setClassesLoaded(true);
        if (items.length === 0) {
          setPermissions([]);
          setPermissionsLoading(false);
        }
      },
      (error) => {
        setPermissionsError(describeFirestoreError(error));
        setClassesLoaded(true);
        setPermissionsLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!classesLoaded || classes.length === 0) return;

    const classIds = classes.map((c) => c.id);
    const unsubscribe = subscribeAssistantPermissions(
      classIds,
      (records) => {
        setPermissions(records);
        setPermissionsError(null);
        setPermissionsLoading(false);
      },
      (error) => {
        setPermissionsError(describeFirestoreError(error));
        setPermissionsLoading(false);
      },
    );

    return unsubscribe;
  }, [classes, classesLoaded]);

  const classMap = useMemo(() => {
    const map = new Map<string, ClassRecord>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const sessionMap = useMemo(() => {
    const map = new Map<
      string,
      {
        tanggal: Date;
        jamMulai: Date;
        jamSelesai: Date;
        ruang: string;
        namaKelas: string;
        mataKuliah: string;
        nomorPraktikum: number;
        namaPraktikum: string;
      }
    >();
    sessions.forEach((s) => {
      const info = {
        tanggal: s.tanggal,
        jamMulai: s.jamMulai,
        jamSelesai: s.jamSelesai,
        ruang: s.ruang,
        namaKelas: s.kelas?.namaKelas ?? "—",
        mataKuliah: s.practicum?.mataKuliah ?? "Mata Kuliah",
        nomorPraktikum: s.practicum?.nomorPraktikum ?? 1,
        namaPraktikum: s.practicum?.namaPraktikum ?? "Sesi Praktikum",
      };
      map.set(s.id, info);
      if (s.scheduleId) {
        map.set(s.scheduleId, info);
      }
    });
    return map;
  }, [sessions]);

  const scopedPermissions = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return permissions.filter((item) => {
      if (filterSessionId && item.sessionId !== filterSessionId) {
        return false;
      }
      if (!keyword) return true;

      const namaMatch = item.nama.toLowerCase().includes(keyword);
      const nimMatch = item.nim.toLowerCase().includes(keyword);
      return namaMatch || nimMatch;
    });
  }, [permissions, filterSessionId, searchQuery]);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    scopedPermissions.forEach((p) => {
      if (p.status === "pending") pending += 1;
      else if (p.status === "approved") approved += 1;
      else if (p.status === "rejected") rejected += 1;
    });
    return { pending, approved, rejected };
  }, [scopedPermissions]);

  const filteredPermissions = useMemo(() => {
    return scopedPermissions.filter((p) => p.status === activeFilter);
  }, [scopedPermissions, activeFilter]);

  const filteredSessionMeta = filterSessionId
    ? sessionMap.get(filterSessionId)
    : undefined;

  const body = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: embedded ? Math.max(insets.top + 14, 24) : 14 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {!embedded && (
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <AppIcon name="chevron-left" size={18} color={COLORS.textPrimary} />
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
      )}

      <Text style={styles.title}>Pengajuan Izin</Text>
      <Text style={styles.subtitle}>Tinjau izin dari praktikan.</Text>

      {/* Search Bar Nama / NIM */}
      <View style={styles.searchBar}>
        <AppIcon name="search" size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Cari nama atau NIM praktikan"
          placeholderTextColor={COLORS.textMuted}
          selectionColor={COLORS.primary}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
            <Text style={styles.clearSearchText}>Reset</Text>
          </Pressable>
        )}
      </View>

      {/* Segmented Status Filter */}
      <View style={styles.segmentedTrack}>
        {(
          [
            { key: "pending", label: `Menunggu (${counts.pending})` },
            { key: "approved", label: `Disetujui (${counts.approved})` },
            { key: "rejected", label: `Ditolak (${counts.rejected})` },
          ] as const
        ).map((tab) => {
          const active = activeFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filteredSessionMeta && (
        <View style={styles.sessionFilterBanner}>
          <Text style={styles.sessionFilterText} numberOfLines={1}>
            Filter sesi: {filteredSessionMeta.mataKuliah} · Kelas{" "}
            {filteredSessionMeta.namaKelas}
          </Text>
          <Pressable onPress={() => setFilterSessionId("")}>
            <Text style={styles.clearSearchText}>Semua</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionCaption}>Terbaru</Text>

      {permissionsLoading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Memuat pengajuan izin…</Text>
        </View>
      )}

      {permissionsError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{permissionsError}</Text>
        </View>
      )}

      {!permissionsLoading &&
        !permissionsError &&
        filteredPermissions.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="file-text" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>Tidak ada pengajuan izin</Text>
            <Text style={styles.emptySubtitle}>
              Belum ada pengajuan izin pada kategori yang dipilih.
            </Text>
          </View>
        )}

      {!permissionsLoading &&
        filteredPermissions.map((item) => {
          const sInfo = sessionMap.get(item.sessionId);
          const cInfo = classMap.get(item.classId);
          const kodeKelas = cInfo?.kodeKelas || sInfo?.namaKelas || "—";
          const scheduleLine = sInfo
            ? `${formatTanggal(sInfo.tanggal)} · ${formatJam(sInfo.jamMulai).replace(":", ".")}–${formatJam(sInfo.jamSelesai).replace(":", ".")}`
            : `Pertemuan ${item.nomorPraktikum} · ${item.namaPraktikum}`;

          const openIzinDetail = () =>
            router.push(`/asisten/izin/${item.id}` as any);

          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.permCard,
                pressed && styles.pressed,
              ]}
              onPress={openIzinDetail}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.cardIconBox}>
                    <AppIcon
                      name="file-text"
                      size={15}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={styles.studentName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.nama}
                    </Text>
                    <Text
                      style={styles.timeCaption}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatWaktuPengajuan(item.createdAt)}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusTag,
                    item.status === "approved"
                      ? styles.statusTagSuccess
                      : item.status === "rejected"
                        ? styles.statusTagDanger
                        : styles.statusTagPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTagText,
                      {
                        color:
                          item.status === "approved"
                            ? COLORS.successText
                            : item.status === "rejected"
                              ? COLORS.dangerText
                              : COLORS.neutralBadgeText,
                      },
                    ]}
                  >
                    {item.status === "approved"
                      ? "Disetujui"
                      : item.status === "rejected"
                        ? "Ditolak"
                        : "Menunggu"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <Text
                style={styles.courseTitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.mataKuliah} · Kelas {kodeKelas}
              </Text>

              <Text
                style={styles.reasonPreview}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.alasan}
              </Text>

              {item.aiCategory && AI_SENTIMENT_PILL[item.aiCategory] && (
                <View style={styles.aiBadgeRow}>
                  <AppIcon name="sparkles" size={13} color={COLORS.primary} />
                  <View
                    style={[
                      styles.aiBadgePill,
                      {
                        backgroundColor: AI_SENTIMENT_PILL[item.aiCategory].bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.aiBadgeText,
                        { color: AI_SENTIMENT_PILL[item.aiCategory].text },
                      ]}
                    >
                      {AI_SENTIMENT_PILL[item.aiCategory].label}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.cardBottomRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.footerLabel}>Jadwal sesi</Text>
                  <Text
                    style={styles.scheduleLine}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {scheduleLine}
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.detailCtaBtn,
                    pressed && styles.detailCtaBtnPressed,
                  ]}
                  onPress={openIzinDetail}
                >
                  <Text style={styles.detailCtaBtnText}>Lihat detail</Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
    </ScrollView>
  );

  if (embedded) {
    return <View style={styles.safe}>{body}</View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      {body}
      <BottomNavBar role="asisten" activeTab="izin" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surfaceSubtle },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  pressed: { opacity: 0.88 },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary },

  title: {
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: "400",
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    minHeight: 42,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13.5,
    color: COLORS.textPrimary,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  segmentedTrack: {
    flexDirection: "row",
    backgroundColor: COLORS.segmentedTrack,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: COLORS.background,
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  sessionFilterBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  sessionFilterText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  sectionCaption: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 10,
  },

  permCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  cardIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  studentName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  timeCaption: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  statusTag: {
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTagSuccess: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.primaryBorder,
  },
  statusTagDanger: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
  },
  statusTagPending: {
    backgroundColor: COLORS.neutralBadgeBg,
    borderColor: COLORS.border,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 10,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  reasonPreview: {
    fontSize: 12.5,
    fontWeight: "400",
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  aiBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  aiBadgePill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  scheduleLine: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  detailCtaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCtaBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  detailCtaBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: { fontSize: 12.5, color: COLORS.textSecondary },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { fontSize: 12.5, color: COLORS.dangerDark },
  emptyCard: {
    backgroundColor: COLORS.surfaceSubtle,
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
