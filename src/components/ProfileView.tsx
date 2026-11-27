import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ROLE_LABEL } from "../constants/roles";
import { COLORS, RADIUS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import AppIcon from "./AppIcon";

export default function ProfileView() {
  const { user, activeRole, logout, changeRole } = useAuth();
  const insets = useSafeAreaInsets();

  if (!user || !activeRole) return null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top + 22, 30) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Bagian Atas: Icon User Proporsional */}
      <View style={styles.topProfileSection}>
        <View style={styles.avatarOuterRing}>
          <View style={styles.avatarCircle}>
            <AppIcon
              name="user"
              size={44}
              color={COLORS.textOnPrimary}
              strokeWidth={1.9}
            />
          </View>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{ROLE_LABEL[activeRole]}</Text>
        </View>
      </View>

      {/* Kartu Identitas Lebih Lega & Naik ke Atas Agar Nyaman Dibaca */}
      <View style={styles.identityCard}>
        <Text style={styles.sectionHeaderTitle}>IDENTITAS PENGGUNA</Text>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Nama Lengkap</Text>
          <Text style={styles.infoValue}>{user.nama || "—"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>NIM</Text>
          <Text style={styles.infoValue}>{user.nim || "—"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Alamat Email</Text>
          <Text style={styles.infoValue}>{user.email || "—"}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Hak Akses Terdaftar</Text>
          <Text style={styles.infoValue}>
            {user.roles.map((r) => ROLE_LABEL[r]).join(" · ")}
          </Text>
        </View>
      </View>

      {/* Bagian Bawah: Tombol Ganti Peran & Logout */}
      <View style={styles.bottomActionsSection}>
        {user.roles.length > 1 && (
          <Pressable
            style={({ pressed }) => [
              styles.switchRoleBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={changeRole}
          >
            <AppIcon name="switch" size={16} color={COLORS.primary} />
            <Text style={styles.switchRoleText}>Ganti Peran Aktif</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.btnPressed,
          ]}
          onPress={logout}
        >
          <AppIcon name="logout" size={16} color={COLORS.dangerText} />
          <Text style={styles.logoutBtnText}>Keluar dari Akun</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    width: "100%",
    backgroundColor: COLORS.surfaceSubtle,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },

  // Bagian Icon User di Atas (Lebih Ringkas agar Kartu Identitas Naik ke Atas)
  topProfileSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarOuterRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Kartu Identitas Lebih Besar & Nyaman Dibaca
  identityCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  infoItem: {
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 10,
  },

  // Tombol Ganti Peran & Logout
  bottomActionsSection: {
    marginTop: "auto",
    paddingTop: 18,
    gap: 10,
  },
  switchRoleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
  },
  switchRoleText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
  },
  logoutBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: COLORS.dangerText,
  },
  btnPressed: {
    opacity: 0.8,
  },
});
