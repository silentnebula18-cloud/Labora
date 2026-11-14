import { router, useLocalSearchParams } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
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
import { formatTanggal } from "../../../utils/format";

// ─── Konfigurasi Status ──────────────────────────────────────────────────────

const STATUS_PERMISSION_CONFIG: Record<
  PermissionStatus,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    icon: "clock" | "check" | "alert";
  }
> = {
  pending: {
    label: "Menunggu Pemeriksaan",
    bg: "#fef9c3",
    border: "#fde047",
    text: "#854d0e",
    icon: "clock",
  },
  approved: {
    label: "Izin Disetujui",
    bg: "#e6f4ea",
    border: "#b7dfc2",
    text: "#0f5132",
    icon: "check",
  },
  rejected: {
    label: "Izin Ditolak",
    bg: "#fef2f2",
    border: "#fecaca",
    text: "#991b1b",
    icon: "alert",
  },
};

export default function IzinAsistenListScreen() {
  const { sessionId: initialSessionId } = useLocalSearchParams<{
    sessionId?: string;
  }>();
  const { user } = useAuth();
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

  // 1. Pantau kelas yang diasistensi oleh asisten
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

  // 2. Pantau seluruh pengajuan izin dari kelas yang diasistensi asisten (SRS 011)
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
        tanggal: string;
        jamMulai: string;
        jamSelesai: string;
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

  // Filter berdasarkan sesi & pencarian Nama / NIM
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
    return {
      pending,
      approved,
      rejected,
    };
  }, [scopedPermissions]);

  const filteredPermissions = useMemo(() => {
    return scopedPermissions.filter((p) => p.status === activeFilter);
  }, [scopedPermissions, activeFilter]);

  const filteredSessionMeta = filterSessionId
    ? sessionMap.get(filterSessionId)
    : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <AppIcon name="chevron-left" size={18} color="#2563eb" />
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Pemeriksaan Izin</Text>
        <View style={{ width: 68 }} />
      </View>

      {/* Search Bar Nama & NIM */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <AppIcon name="search" size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama atau NIM praktikan…"
            placeholderTextColor="#94a3b8"
            selectionColor="#2563eb"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              style={styles.clearSearchBtn}
            >
              <Text style={styles.clearSearchText}>Reset</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Status Tabs (Menunggu, Disetujui, Ditolak) */}
      <View style={styles.filterBar}>
        {(
          [
            { key: "pending", label: "Menunggu", count: counts.pending },
            { key: "approved", label: "Disetujui", count: counts.approved },
            { key: "rejected", label: "Ditolak", count: counts.rejected },
          ] as const
        ).map((tab) => {
          const active = activeFilter === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.filterTab, active && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  active && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
              <View
                style={[
                  styles.filterCountPill,
                  active && styles.filterCountPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterCountText,
                    active && styles.filterCountTextActive,
                  ]}
                >
                  {tab.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner Filter Sesi jika dibuka dari Detail Sesi */}
        {!!filterSessionId && (
          <View style={styles.sessionFilterBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionFilterTitle}>Filter Sesi Aktif</Text>
              <Text style={styles.sessionFilterSub}>
                {filteredSessionMeta
                  ? `${filteredSessionMeta.mataKuliah} · Pertemuan ${filteredSessionMeta.nomorPraktikum} (${filteredSessionMeta.namaPraktikum})`
                  : `ID Sesi: ${filterSessionId}`}
              </Text>
            </View>
            <Pressable
              style={styles.clearFilterBtn}
              onPress={() => setFilterSessionId("")}
            >
              <Text style={styles.clearFilterBtnText}>Semua Sesi</Text>
            </Pressable>
          </View>
        )}

        {permissionsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#2563eb" />
            <Text style={styles.loadingText}>
              Memuat daftar pengajuan izin…
            </Text>
          </View>
        ) : permissionsError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{permissionsError}</Text>
          </View>
        ) : filteredPermissions.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="clipboard" size={26} color="#64748b" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery.trim()
                ? "Pengajuan Tidak Ditemukan"
                : "Belum Ada Pengajuan Izin"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? `Tidak ada pengajuan dengan nama atau NIM "${searchQuery.trim()}" pada status ini.`
                : activeFilter === "pending"
                  ? "Tidak ada pengajuan izin yang sedang menunggu pemeriksaan."
                  : activeFilter === "approved"
                    ? "Belum ada pengajuan izin yang disetujui."
                    : "Belum ada pengajuan izin yang ditolak."}
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {filteredPermissions.map((item) => {
              const statusCfg =
                STATUS_PERMISSION_CONFIG[item.status] ??
                STATUS_PERMISSION_CONFIG.pending;
              const classInfo = classMap.get(item.classId);
              const sessInfo = sessionMap.get(item.sessionId);
              const kodeKelas =
                classInfo?.kodeKelas || sessInfo?.namaKelas || "—";
              const mataKuliah =
                item.mataKuliah ||
                classInfo?.mataKuliah ||
                sessInfo?.mataKuliah ||
                "Praktikum";
              const nomorPraktikum =
                item.nomorPraktikum ?? sessInfo?.nomorPraktikum ?? 1;
              const namaPraktikum =
                item.namaPraktikum ||
                sessInfo?.namaPraktikum ||
                "Sesi Praktikum";
              const jadwalStr = sessInfo
                ? `${formatTanggal(sessInfo.tanggal)} · ${sessInfo.jamMulai} – ${sessInfo.jamSelesai} WIB`
                : "Jadwal mengikuti sesi praktikum";

              return (
                <View key={item.id} style={styles.card}>
                  {/* Baris Atas: Status & Kode Kelas */}
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: statusCfg.bg,
                          borderColor: statusCfg.border,
                        },
                      ]}
                    >
                      <AppIcon
                        name={statusCfg.icon}
                        size={12}
                        color={statusCfg.text}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: statusCfg.text },
                        ]}
                      >
                        {statusCfg.label}
                      </Text>
                    </View>

                    <View style={styles.classBadge}>
                      <Text style={styles.classBadgeText}>
                        Kelas {kodeKelas}
                      </Text>
                    </View>
                  </View>

                  {/* Ringkasan Identitas Praktikan (Nama & NIM) */}
                  <View style={styles.studentIdentityBox}>
                    <View style={styles.studentAvatar}>
                      <AppIcon name="user" size={16} color="#2563eb" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {item.nama || "Praktikan"}
                      </Text>
                      <Text style={styles.studentNim}>
                        NIM {item.nim || "—"}
                      </Text>
                    </View>
                  </View>

                  {/* Ringkasan Nama Kelas (Mata Kuliah), Sesi, dan Jadwal */}
                  <View style={styles.summaryMetaBox}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Mata Kuliah</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>
                        {mataKuliah}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Sesi</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>
                        Pertemuan {nomorPraktikum} · {namaPraktikum}
                      </Text>
                    </View>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Jadwal</Text>
                      <Text style={styles.summaryValue} numberOfLines={1}>
                        {jadwalStr}
                      </Text>
                    </View>
                  </View>

                  {/* Tombol Lihat Detail */}
                  <Pressable
                    style={({ pressed }) => [
                      styles.detailBtn,
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() =>
                      router.push({
                        pathname: "/asisten/izin/[id]",
                        params: { id: item.id },
                      } as any)
                    }
                  >
                    <Text style={styles.detailBtnText}>Lihat Detail</Text>
                    <AppIcon name="chevron-right" size={15} color="#2563eb" />
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 68,
  },
  backText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },

  searchSection: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#0f172a",
    paddingVertical: 0,
  },
  clearSearchBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },

  filterBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 9,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterTabActive: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  filterTabTextActive: {
    color: "#ffffff",
  },
  filterCountPill: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterCountPillActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  filterCountText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#334155",
  },
  filterCountTextActive: {
    color: "#ffffff",
  },

  scrollContent: {
    padding: 16,
  },

  sessionFilterBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  sessionFilterTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1e40af",
  },
  sessionFilterSub: {
    fontSize: 12,
    color: "#1e3a8a",
    marginTop: 2,
  },
  clearFilterBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearFilterBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "700",
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 44,
    gap: 10,
  },
  loadingText: { fontSize: 13, color: "#64748b" },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorText: { color: "#991b1b", fontSize: 12.5 },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 44,
    paddingHorizontal: 26,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
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

  cardList: {
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  classBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  classBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563eb",
  },

  studentIdentityBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 11,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  studentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  studentName: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0f172a",
  },
  studentNim: {
    fontSize: 12,
    color: "#475569",
    marginTop: 1,
    fontWeight: "500",
  },

  summaryMetaBox: {
    gap: 6,
    paddingVertical: 4,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  summaryLabel: {
    width: 82,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  summaryValue: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0f172a",
  },

  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingVertical: 10,
  },
  detailBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  btnPressed: { opacity: 0.85 },
});

