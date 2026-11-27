import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../constants/theme";
import AppIcon, { type AppIconName } from "./AppIcon";

export type BottomNavTab =
  | "beranda"
  | "presensi"
  | "peta"
  | "kelas"
  | "izin"
  | "profil";

interface BottomNavBarProps {
  role?: "praktikan" | "asisten";
  activeTab: BottomNavTab;
  onChangeTab?: (tab: BottomNavTab) => void;
  showPresensiTab?: boolean;
}

interface TabDef {
  key: BottomNavTab;
  label: string;
  icon: AppIconName;
}

const PRAKTIKAN_TABS: TabDef[] = [
  { key: "beranda", label: "Beranda", icon: "home" },
  { key: "presensi", label: "Presensi", icon: "user-round-check" },
  { key: "peta", label: "Peta", icon: "location" },
  { key: "profil", label: "Profil", icon: "user" },
];

const ASISTEN_TABS: TabDef[] = [
  { key: "beranda", label: "Beranda", icon: "home" },
  { key: "kelas", label: "Kelas", icon: "book" },
  { key: "izin", label: "Izin", icon: "file-text" },
  { key: "profil", label: "Profil", icon: "user" },
];

/**
 * Navigasi bawah 4-tab bersih sesuai seluruh layar di `docs/ui`.
 * Mendukung pergantian state langsung di Beranda maupun navigasi otomatis dari halaman dalam.
 */
export default function BottomNavBar({
  role,
  activeTab,
  onChangeTab,
  showPresensiTab = false,
}: BottomNavBarProps) {
  const effectiveRole: "praktikan" | "asisten" =
    role ?? (showPresensiTab ? "praktikan" : "asisten");

  const tabs =
    effectiveRole === "praktikan" ? PRAKTIKAN_TABS : ASISTEN_TABS;

  function handlePress(tab: BottomNavTab) {
    if (onChangeTab) {
      onChangeTab(tab);
      return;
    }

    if (effectiveRole === "praktikan") {
      router.replace({
        pathname: "/praktikan",
        params: tab === "beranda" ? {} : { tab },
      } as any);
    } else {
      router.replace({
        pathname: "/asisten",
        params: tab === "beranda" ? {} : { tab },
      } as any);
    }
  }

  return (
    <View style={styles.container}>
      {tabs.map((item) => {
        const isActive = activeTab === item.key;
        return (
          <Pressable
            key={item.key}
            style={styles.tabItem}
            onPress={() => handlePress(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <AppIcon
              name={item.icon}
              size={21}
              color={isActive ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                isActive && styles.tabLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
