import { Pressable, StyleSheet, Text, View } from "react-native";

import AppIcon from "./AppIcon";

export type BottomNavTab = "beranda" | "presensi" | "profil";

interface BottomNavBarProps {
  activeTab: BottomNavTab;
  onChangeTab: (tab: BottomNavTab) => void;
  showPresensiTab?: boolean;
}

export default function BottomNavBar({
  activeTab,
  onChangeTab,
  showPresensiTab = false,
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
            color={activeTab === "beranda" ? "#41337A" : "#6EA4BF"}
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

      {showPresensiTab && (
        <Pressable
          style={styles.tabItem}
          onPress={() => onChangeTab("presensi")}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === "presensi" }}
        >
          <View
            style={[
              styles.pill,
              activeTab === "presensi" && styles.pillActive,
            ]}
          >
            <AppIcon
              name="check"
              size={20}
              color={activeTab === "presensi" ? "#41337A" : "#6EA4BF"}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === "presensi" && styles.tabLabelActive,
            ]}
          >
            Presensi
          </Text>
        </Pressable>
      )}

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
            color={activeTab === "profil" ? "#41337A" : "#6EA4BF"}
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
    borderTopColor: "#C2EFEB",
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
    backgroundColor: "#C2EFEB",
  },
  tabLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#6EA4BF",

  },
  tabLabelActive: {
    color: "#41337A",
    fontWeight: "800",

  },
});
