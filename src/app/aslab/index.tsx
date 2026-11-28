import { StatusBar } from "expo-status-bar";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../components/AppIcon";
import BrandMark from "../../components/BrandMark";
import { COLORS, RADIUS, getDisplayName, getGreetingByHour } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

/**
 * Titik masuk peran Aslab (SRS 019). Modul pengelolaan laboratorium, denda,
 * dan distribusi praktikan dikembangkan terpisah oleh Programmer 2.
 */
export default function AslabHomeScreen() {
  const { user } = useAuth();

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

        <Text style={styles.greeting}>
          {getGreetingByHour()}, {getDisplayName(user?.nama)}
        </Text>
        <Text style={styles.subtitle}>Peran Aslab aktif</Text>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <AppIcon name="flask" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.cardTitle}>Modul Aslab</Text>
          <Text style={styles.cardDesc}>
            Pengelolaan laboratorium, konfigurasi denda, dan distribusi
            praktikan sedang disiapkan.
          </Text>
        </View>
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
  brandWrap: { marginBottom: 24 },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.background,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
