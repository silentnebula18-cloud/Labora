import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { user, activeRole, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (!activeRole) return <Redirect href="/pilih-peran" />;

  const homeHref =
    activeRole === "asisten"
      ? "/asisten"
      : activeRole === "aslab"
        ? "/aslab"
        : "/praktikan";

  return <Redirect href={homeHref as any} />;
}
