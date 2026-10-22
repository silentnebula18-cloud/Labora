import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ROLE_LABEL } from "../constants/roles";
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
        <Text style={styles.note}>
          Halaman beranda {ROLE_LABEL[activeRole].toLowerCase()} (placeholder
          sprint 1).
        </Text>

        <Pressable style={styles.button} onPress={logout}>
          <Text style={styles.buttonText}>Keluar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#dbeafe",
    color: "#1d4ed8",
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
    overflow: "hidden",
  },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 16, color: "#6b7280", marginTop: 4 },
  note: { marginTop: 24, color: "#374151" },
  button: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 32,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
