import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import AppIcon from "../../components/AppIcon";
import { COLORS, RADIUS, getDisplayName } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

/**
 * Titik masuk peran Aslab (SRS 019). Modul pengelolaan laboratorium, denda,
 * dan distribusi praktikan dikembangkan terpisah oleh Programmer 2.
 */
export default function AslabHomeScreen() {
  const { user, changeRole, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const canSwitchRole = (user?.roles.length ?? 0) > 1;

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top + 14, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Seragam dengan Beranda Praktikan & Asisten */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Hi, {getDisplayName(user?.nama, 3)}
            </Text>
          </View>

          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Aslab</Text>
          </View>
        </View>

        {/* Kartu Modul Aslab (Gaya Seragam Kartu Utama) */}
        <View style={styles.featuredCard}>
          <View style={styles.featuredTopRow}>
            <Text style={styles.featuredOverline}>MODUL ASLAB</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Peran aktif</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.moduleRow}>
            <View style={styles.iconCircle}>
              <AppIcon name="flask" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.moduleTextWrap}>
              <Text style={styles.cardTitle}>Dashboard Laboratorium</Text>
              <Text style={styles.cardDesc}>
                Pengelolaan laboratorium, konfigurasi denda, dan distribusi
                praktikan sedang disiapkan.
              </Text>
            </View>
          </View>
        </View>

        {/* Aksi Akun Sementara di Halaman Utama */}
        <View style={styles.actions}>
          {canSwitchRole && (
            <Pressable
              style={({ pressed }) => [
                styles.switchBtn,
                pressed && styles.pressed,
              ]}
              onPress={changeRole}
            >
              <AppIcon name="switch" size={16} color={COLORS.primary} />
              <Text style={styles.switchBtnText}>Ganti Peran</Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && styles.pressed,
            ]}
            onPress={logout}
          >
            <AppIcon name="logout" size={16} color={COLORS.dangerText} />
            <Text style={styles.logoutBtnText}>Keluar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  pressed: {
    opacity: 0.88,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  roleBadge: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  featuredCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  featuredTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  featuredOverline: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.4,
  },
  statusPill: {
    backgroundColor: COLORS.successBg,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.successText,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 12,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  actions: {
    marginTop: 14,
    gap: 10,
  },
  switchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.card,
  },
  switchBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerBg,
  },
  logoutBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.dangerText,
  },
});
