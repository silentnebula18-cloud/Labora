import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../components/AppIcon";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginScreen() {
  const { login } = useAuth();

  const passwordRef = useRef<any>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Android kadang mengosongkan tampilan saat secureTextEntry diubah.
  function togglePasswordVisibility() {
    setShowPassword((v) => !v);
    setTimeout(() => passwordRef.current?.focus(), 50);
  }

  async function handleSubmit() {
    if (loading) return;

    const nextErrors: FieldErrors = {};
    if (!email.trim()) {
      nextErrors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Format email tidak valid";
    }
    if (!password) nextErrors.password = "Kata sandi wajib diisi";

    setFormError(null);
    setCredentialError(false);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);

    try {
      const result = await login(email, password);

      // Jika berhasil, navigator otomatis pindah halaman.
      if (!result.ok) {
        setLoading(false);
        setFormError(result.message);
        setCredentialError(result.code === "KREDENSIAL_SALAH");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      setFormError("Terjadi kesalahan saat login.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Labora</Text>
          <Text style={styles.subtitle}>Masuk untuk melanjutkan</Text>

          {formError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{formError}</Text>
            </View>
          )}

          <Text style={styles.label}>Email</Text>

          <TextInput
            style={[
              styles.input,
              (errors.email || credentialError) && styles.inputError,
            ]}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrors((e) => ({ ...e, email: undefined }));
              setFormError(null);
              setCredentialError(false);
            }}
            placeholder="Masukkan email"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
          />

          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          <Text style={styles.label}>Kata sandi</Text>

          <View
            style={[
              styles.passwordRow,
              (errors.password || credentialError) && styles.inputError,
            ]}
          >
            <TextInput
              key={showPassword ? "password-visible" : "password-masked"}
              ref={passwordRef}
              style={styles.passwordInput}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: undefined }));
                setFormError(null);
                setCredentialError(false);
              }}
              placeholder="Masukkan kata sandi"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />

            <Pressable
              onPress={togglePasswordVisibility}
              hitSlop={8}
              style={styles.eyeButton}
              accessibilityLabel={
                showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
              }
            >
              <AppIcon
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textSecondary}
              />
            </Pressable>
          </View>

          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Belum punya akun?</Text>
            <Pressable
              onPress={() => router.push("/register" as any)}
              hitSlop={8}
            >
              <Text style={styles.footerLink}>Daftar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: COLORS.surfaceSubtle },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.primary,
    marginBottom: 24,
    marginTop: 4,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15.5,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  inputError: { borderColor: COLORS.dangerText },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.background,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15.5,
    color: COLORS.textPrimary,
  },
  eyeButton: {
    paddingLeft: 8,
    paddingVertical: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: COLORS.dangerText,
    fontSize: 12.5,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorBoxText: {
    color: COLORS.dangerDark,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 22,
  },
  footerText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
});
