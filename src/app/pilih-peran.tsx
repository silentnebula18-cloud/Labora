import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ROLE_LABEL } from "../constants/roles";
import { useAuth } from "../context/AuthContext";

export default function PilihPeranScreen() {
  const { user, selectRole, logout } = useAuth();

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Halo, {user.nama}</Text>
        <Text style={styles.subtitle}>Masuk sebagai apa?</Text>

        {user.roles.map((role) => (
          <Pressable
            key={role}
            style={styles.card}
            onPress={() => selectRole(role)}
          >
            <Text style={styles.cardTitle}>{ROLE_LABEL[role]}</Text>
            <Text style={styles.cardDesc}>
              {role === "asisten"
                ? "Kelola sesi praktikum"
                : "Lihat jadwal dan presensi praktikum"}
            </Text>
          </Pressable>
        ))}

        <Pressable onPress={logout} style={styles.logout}>
          <Text style={styles.logoutText}>Bukan Anda? Keluar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 26, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 16, color: "#6b7280", marginBottom: 24 },
  card: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: "600", color: "#111827" },
  cardDesc: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  logout: { alignSelf: "center", marginTop: 16, padding: 8 },
  logoutText: { color: "#2563eb", fontWeight: "600" },
});
