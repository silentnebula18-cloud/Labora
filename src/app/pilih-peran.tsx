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
  safe: { flex: 1, backgroundColor: "#ECFEE8" },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#331E36",
  },
  subtitle: {
    fontSize: 15.5,
    color: "#41337A",
    marginBottom: 24,
    marginTop: 4,
  },
  card: {
    borderWidth: 1.5,
    borderColor: "#6EA4BF",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#331E36",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#331E36",
  },
  cardDesc: {
    fontSize: 13.5,
    color: "#41337A",
    marginTop: 4,
  },
  logout: { alignSelf: "center", marginTop: 18, padding: 10 },
  logoutText: {
    color: "#41337A",
    fontWeight: "600",
    fontSize: 14,
    paddingHorizontal: 6,
  },
});
