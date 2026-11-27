import { router } from "expo-router";
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
import ClassFormModal from "../../../components/ClassFormModal";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import {
  createClass,
  describeFirestoreError,
  subscribeAssistantClasses,
  subscribeClassMembers,
  type ClassInput,
} from "../../../services/classService";
import type { ClassRecord } from "../../../types";
import { formatJam, formatTanggal, formatTanggalHari } from "../../../utils/format";

interface KelolaKelasScreenProps {
  embedded?: boolean;
}

function formatDibuat(date: Date | null): string {
  return formatTanggal(date);
}

function formatHariJam(tanggal: Date, jamMulai: Date, jamSelesai: Date): string {
  return `${formatTanggalHari(tanggal)} · ${formatJam(jamMulai)}–${formatJam(jamSelesai)}`;
}

export default function KelolaKelasScreen({
  embedded = false,
}: KelolaKelasScreenProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { sessions } = useSession();

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeAssistantClasses(
      user.id,
      (items) => {
        setClasses(items);
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        setLoadError(describeFirestoreError(error));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (classes.length === 0) return;

    const unsubscribers = classes.map((kelas) =>
      subscribeClassMembers(
        kelas.id,
        (members) => {
          setMemberCounts((prev) => {
            if (prev[kelas.id] === members.length) return prev;
            return { ...prev, [kelas.id]: members.length };
          });
        },
        () => undefined,
      ),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [classes]);

  const filteredClasses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.mataKuliah.toLowerCase().includes(q) ||
        c.kodeKelas.toLowerCase().includes(q),
    );
  }, [classes, searchQuery]);

  async function handleCreate(values: ClassInput) {
    if (!user) return;

    setSubmitting(true);
    setFormError(null);

    try {
      await createClass(user.id, values);
      setFormVisible(false);
    } catch (error) {
      setFormError(describeFirestoreError(error));
    } finally {
      setSubmitting(false);
    }
  }

  const body = (
    <>
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
            <AppIcon
              name="chevron-left"
              size={18}
              color={COLORS.textPrimary}
            />
            <Text style={styles.backText}>Kembali</Text>
          </Pressable>
        )}

        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Kelas Praktikum</Text>
            <Text style={styles.subtitle}>Kelola kelas yang kamu ampu.</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.addButtonCompact,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setFormError(null);
              setFormVisible(true);
            }}
          >
            <AppIcon name="plus" size={15} color={COLORS.textOnPrimary} />
            <Text style={styles.addButtonCompactText}>Kelas</Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <AppIcon name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama atau kode kelas"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Text style={styles.clearText}>Reset</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.metaFilterRow}>
          <Text style={styles.metaFilterLabel}>
            {filteredClasses.length} kelas diampu
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Memuat kelas…</Text>
          </View>
        )}

        {loadError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{loadError}</Text>
          </View>
        )}

        {!loading && !loadError && filteredClasses.length === 0 && (
          <View style={styles.empty}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="book" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? "Kelas tidak ditemukan" : "Belum ada kelas"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Coba kata kunci mata kuliah atau kode kelas lain."
                : "Tambahkan kelas praktikum pertama Anda untuk mulai mengelola sesi dan praktikan."}
            </Text>
          </View>
        )}

        {!loading &&
          filteredClasses.map((item) => {
            const classSessions = sessions.filter((s) => s.classId === item.id);
            const activeOrNext =
              classSessions.find((s) => s.status !== "closed") ??
              classSessions[0];
            const memberCount =
              typeof memberCounts[item.id] === "number"
                ? Math.max(memberCounts[item.id], item.memberIds?.length ?? 0)
                : (item.memberIds?.length ?? 0);
            const openClassDetail = () =>
              router.push(`/asisten/kelas/${item.id}` as any);

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.pressed,
                ]}
                onPress={openClassDetail}
              >
                {/* Header Kartu (Referensi UI Tokopedia) */}
                <View style={styles.cardTop}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.cardIconBox}>
                      <AppIcon name="book" size={16} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={styles.cardHeaderTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Kelas {item.kodeKelas}
                      </Text>
                      <Text
                        style={styles.cardHeaderDate}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Dibuat {formatDibuat(item.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.kodePill}>
                    <Text
                      style={styles.kodePillText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {classSessions.length} sesi
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                {/* Body Kartu */}
                <Text
                  style={styles.course}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.mataKuliah}
                </Text>

                <Text
                  style={styles.metaItemText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {activeOrNext
                    ? `${formatHariJam(
                        activeOrNext.tanggal,
                        activeOrNext.jamMulai,
                        activeOrNext.jamSelesai,
                      )} · ${activeOrNext.ruang}`
                    : "Belum ada sesi terjadwal"}
                </Text>

                {/* Footer Kartu + Tombol Lihat Detail */}
                <View style={styles.cardBottomRow}>
                  <View style={styles.footerLeft}>
                    <Text style={styles.footerLabel}>Total praktikan</Text>
                    <Text
                      style={styles.footerValue}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {memberCount} praktikan
                    </Text>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.detailBtn,
                      pressed && styles.detailBtnPressed,
                    ]}
                    onPress={openClassDetail}
                  >
                    <Text style={styles.detailBtnText}>Lihat detail</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
      </ScrollView>

      {formVisible && (
        <ClassFormModal
          visible
          mode="create"
          submitting={submitting}
          error={formError}
          onSubmit={handleCreate}
          onClose={() => {
            if (!submitting) setFormVisible(false);
          }}
        />
      )}
    </>
  );

  if (embedded) {
    return <View style={styles.safe}>{body}</View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      {body}
      <BottomNavBar role="asisten" activeTab="kelas" />
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
  backText: { fontSize: 13, color: COLORS.textPrimary, fontWeight: "600" },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  headerInfo: { flex: 1, minWidth: 0 },
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
  },
  addButtonCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },
  addButtonCompactText: {
    color: COLORS.textOnPrimary,
    fontSize: 12.5,
    fontWeight: "700",
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
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13.5,
    color: COLORS.textPrimary,
  },
  clearText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  metaFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 10,
  },
  metaFilterLabel: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 36,
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
  errorBoxText: { color: COLORS.dangerDark, fontSize: 12.5 },

  empty: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
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

  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
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
  cardHeaderTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardHeaderDate: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  kodePill: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kodePillText: { fontSize: 11, fontWeight: "600", color: COLORS.primary },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 10,
  },
  course: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  metaItemText: {
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  footerLeft: {
    flex: 1,
    minWidth: 0,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  detailBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
