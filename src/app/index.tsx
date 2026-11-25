import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

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
          backgroundColor: "#ECFEE8",
        }}
      >
        <ActivityIndicator size="large" color="#41337A" />
      </View>
    );
  }

  if (!user) return <Redirect href="/login" />;
  if (!activeRole) return <Redirect href="/pilih-peran" />;

  return (
    <Redirect href={activeRole === "asisten" ? "/asisten" : "/praktikan"} />
  );
}
