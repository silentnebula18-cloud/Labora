import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ROLE_LABEL } from "../constants/roles";
import { COLORS, RADIUS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

export default function HomePlaceholder() {
  const { user, activeRole, logout } = useAuth();

  if (!user || !activeRole) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.badge}>{ROLE_LABEL[activeRole]}</Text>
        <Text style={styles.title}>Halo, {user.nama}</Text>
        <Text style={styles.subtitle}>NIM: {user.nim}</Text>

        <Pressable style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>Keluar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primarySoft,
    color: COLORS.primary,
    fontSize: 11.5,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    marginBottom: 10,
    overflow: "hidden",
  },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: { color: COLORS.textOnPrimary, fontSize: 14, fontWeight: "700" },
});
