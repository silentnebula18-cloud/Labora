import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ROLE_LABEL } from "../constants/roles";
import { useAuth } from "../context/AuthContext";
import AppIcon from "./AppIcon";

export default function ProfileView() {
  const { user, activeRole, logout, changeRole } = useAuth();

  if (!user || !activeRole) return null;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Bagian Atas: Icon User di Tengah Atas */}
      <View style={styles.topProfileSection}>
        <View style={styles.avatarOuterRing}>
          <View style={styles.avatarCircle}>
            <AppIcon name="user" size={44} color="#ffffff" />
          </View>
        </View>

        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{ROLE_LABEL[activeRole]}</Text>
        </View>
      </View>

      {/* Bagian Bawah Icon User: Informasi Identitas User (Nama, NIM, Email) */}
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

      {/* Bagian Bawah: Tombol Ganti Peran & Tombol Logout */}
      <View style={styles.bottomActionsSection}>
        {user.roles.length > 1 && (
          <Pressable
            style={({ pressed }) => [
              styles.switchRoleBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={changeRole}
          >
            <AppIcon name="switch" size={16} color="#2563eb" />
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
          <AppIcon name="logout" size={16} color="#b91c1c" />
          <Text style={styles.logoutBtnText}>Keluar dari Akun</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    justifyContent: "space-between",
  },

  // Bagian Icon User di Tengah Atas
  topProfileSection: {
    alignItems: "center",
    marginBottom: 22,
  },
  avatarOuterRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadge: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  roleBadgeText: {
    color: "#2563eb",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Kartu Identitas di Bawah Icon User
  identityCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoItem: {
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 8,
  },

  // Bagian Bawah: Tombol Ganti Peran & Logout
  bottomActionsSection: {
    marginTop: "auto",
    gap: 10,
    paddingTop: 8,
  },
  switchRoleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingVertical: 14,
  },
  switchRoleText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#2563eb",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    paddingVertical: 14,
  },
  logoutBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#b91c1c",
  },
  btnPressed: {
    opacity: 0.8,
  },
});
