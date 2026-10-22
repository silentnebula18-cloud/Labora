import { Stack } from "expo-router";

import { AuthProvider, useAuth } from "../context/AuthContext";

function RootNavigator() {
  const { user, activeRole } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={!!user && !activeRole}>
        <Stack.Screen name="pilih-peran" />
      </Stack.Protected>

      <Stack.Protected guard={activeRole === "praktikan"}>
        <Stack.Screen name="praktikan/index" />
      </Stack.Protected>

      <Stack.Protected guard={activeRole === "asisten"}>
        <Stack.Screen name="asisten/index" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
