import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon, { type AppIconName } from "../components/AppIcon";
import BrandMark from "../components/BrandMark";
import { COLORS, RADIUS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

const ROLE_TITLE: Record<Role, string> = {
  praktikan: "Praktikan",
  asisten: "Asisten",
  aslab: "Aslab",
};

const ROLE_ICON: Record<Role, AppIconName> = {
  praktikan: "book",
  asisten: "users",
  aslab: "flask",
};

const ROLE_DESCRIPTION: Record<Role, string> = {
  praktikan: "Ikuti sesi, catat kehadiran, dan pantau jadwal praktikum.",
  asisten: "Kelola kelas, pantau presensi, dan tinjau pengajuan izin.",
  aslab: "Kelola laboratorium, konfigurasi denda, dan distribusi praktikan.",
};

export default function PilihPeranScreen() {
  const { user, selectRole, logout } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>(
    user?.roles[0] ?? "praktikan",
  );

  if (!user) return null;

  const effectiveSelected: Role = user.roles.includes(selectedRole)
    ? selectedRole
    : (user.roles[0] ?? "praktikan");

  const buttonLabel = `Lanjutkan sebagai ${ROLE_TITLE[effectiveSelected]}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandWrap}>
          <BrandMark />
        </View>

        <Text style={styles.title}>Masuk Sebagai Apa?</Text>
        <Text style={styles.subtitle}>
          Pilih peran sesuai aktivitasmu{"\n"}di laboratorium.
        </Text>

        <View style={styles.cardsList}>
          {user.roles.map((role) => {
            const isSelected = effectiveSelected === role;
            return (
              <Pressable
                key={role}
                style={({ pressed }) => [
                  styles.card,
                  isSelected && styles.cardSelected,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => setSelectedRole(role)}
              >
                <View
                  style={[
                    styles.roleIconBox,
                    isSelected && styles.roleIconBoxSelected,
                  ]}
                >
                  <AppIcon
                    name={ROLE_ICON[role]}
                    size={22}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.cardContent}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {ROLE_TITLE[role]}
                  </Text>
                  <Text
                    style={styles.cardDesc}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {ROLE_DESCRIPTION[role]}
                  </Text>
                </View>

                <AppIcon
                  name={isSelected ? "check" : "chevron-right"}
                  size={18}
                  color={isSelected ? COLORS.primary : COLORS.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
          onPress={() => selectRole(effectiveSelected)}
        >
          <Text style={styles.primaryBtnText}>{buttonLabel}</Text>
        </Pressable>

        <Text style={styles.noteText}>
          Peran dapat diganti melalui halaman Profil.
        </Text>

        <Pressable onPress={logout} style={styles.logout} hitSlop={8}>
          <Text style={styles.logoutText}>
            Masuk sebagai {user.nama} · Keluar
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  brandWrap: {
    marginBottom: 32,
  },
  title: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginTop: 6,
    marginBottom: 22,
  },
  cardsList: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 15,
    backgroundColor: COLORS.background,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: COLORS.primarySurface,
  },
  cardPressed: {
    opacity: 0.92,
  },
  roleIconBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconBoxSelected: {
    backgroundColor: COLORS.background,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  primaryBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
  noteText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 14,
  },
  logout: {
    marginTop: 22,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  logoutText: {
    color: COLORS.primary,
    fontSize: 12.5,
    fontWeight: "600",
  },
});
