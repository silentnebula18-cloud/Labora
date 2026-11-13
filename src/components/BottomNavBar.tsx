import { Pressable, StyleSheet, Text, View } from "react-native";

import AppIcon from "./AppIcon";

export type BottomNavTab = "beranda" | "profil";

interface BottomNavBarProps {
  activeTab: BottomNavTab;
  onChangeTab: (tab: BottomNavTab) => void;
}

export default function BottomNavBar({
  activeTab,
  onChangeTab,
}: BottomNavBarProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={styles.tabItem}
        onPress={() => onChangeTab("beranda")}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "beranda" }}
      >
        <View
          style={[
            styles.pill,
            activeTab === "beranda" && styles.pillActive,
          ]}
        >
          <AppIcon
            name="home"
            size={20}
            color={activeTab === "beranda" ? "#2563eb" : "#64748b"}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            activeTab === "beranda" && styles.tabLabelActive,
          ]}
        >
          Beranda
        </Text>
      </Pressable>

      <Pressable
        style={styles.tabItem}
        onPress={() => onChangeTab("profil")}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === "profil" }}
      >
        <View
          style={[
            styles.pill,
            activeTab === "profil" && styles.pillActive,
          ]}
        >
          <AppIcon
            name="user"
            size={20}
            color={activeTab === "profil" ? "#2563eb" : "#64748b"}
          />
        </View>
        <Text
          style={[
            styles.tabLabel,
            activeTab === "profil" && styles.tabLabelActive,
          ]}
        >
          Profil
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  pill: {
    paddingHorizontal: 22,
    paddingVertical: 5,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: "#eff6ff",
  },
  tabLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#64748b",
  },
  tabLabelActive: {
    color: "#2563eb",
    fontWeight: "800",
  },
});
