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
  nama?: string;
  nim?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { register } = useAuth();

  const nimRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmRef = useRef<any>(null);

  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;

    const nextErrors: FieldErrors = {};

    if (!nama.trim()) nextErrors.nama = "Nama wajib diisi";
    if (!nim.trim()) {
      nextErrors.nim = "NIM wajib diisi";
    } else if (!/^\d{14}$/.test(nim.trim())) {
      nextErrors.nim =
        "NIM harus terdiri dari 14 digit angka tanpa huruf atau karakter lain";
    }
    if (!email.trim()) {
      nextErrors.email = "Email wajib diisi";
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = "Format email tidak valid";
    }
    if (!password) {
      nextErrors.password = "Kata sandi wajib diisi";
    } else if (password.length < 6) {
      nextErrors.password = "Kata sandi minimal 6 karakter";
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Konfirmasi kata sandi wajib diisi";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Konfirmasi kata sandi tidak sama";
    }

    setFormError(null);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);

    try {
      const result = await register({
        nama: nama.trim(),
        nim: nim.trim(),
        email: email.trim(),
        password,
      });

      if (!result.ok) {
        setLoading(false);
        setFormError(result.message);
        return;
      }

      router.replace("/");
    } catch (error) {
      console.error("Register error:", error);
      setLoading(false);
      setFormError("Terjadi kesalahan saat mendaftar.");
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
          <Text style={styles.subtitle}>Buat akun untuk melanjutkan</Text>

          {formError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{formError}</Text>
            </View>
          )}

          <Text style={styles.label}>Nama lengkap</Text>
          <TextInput
            style={[styles.input, errors.nama && styles.inputError]}
            value={nama}
            onChangeText={(t) => {
              setNama(t);
              setErrors((e) => ({ ...e, nama: undefined }));
              setFormError(null);
            }}
            placeholder="Masukkan nama lengkap"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => nimRef.current?.focus()}
            editable={!loading}
          />
          {errors.nama && <Text style={styles.errorText}>{errors.nama}</Text>}

          <Text style={styles.label}>NIM</Text>
          <TextInput
            ref={nimRef}
            style={[styles.input, errors.nim && styles.inputError]}
            value={nim}
            onChangeText={(t) => {
              setNim(t);
              setErrors((e) => ({ ...e, nim: undefined }));
              setFormError(null);
            }}
            placeholder="Masukkan 14 digit NIM"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            keyboardType="number-pad"
            maxLength={14}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            editable={!loading}
          />
          {errors.nim && <Text style={styles.errorText}>{errors.nim}</Text>}

          <Text style={styles.label}>Email</Text>
          <TextInput
            ref={emailRef}
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setErrors((e) => ({ ...e, email: undefined }));
              setFormError(null);
            }}
            placeholder="Masukkan email"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}

          <Text style={styles.label}>Kata sandi</Text>
          <View
            style={[styles.passwordRow, errors.password && styles.inputError]}
          >
            <TextInput
              key={showPassword ? "reg-pass-visible" : "reg-pass-masked"}
              ref={passwordRef}
              style={styles.passwordInput}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: undefined }));
                setFormError(null);
              }}
              placeholder="Minimal 6 karakter"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              editable={!loading}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
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

          <Text style={styles.label}>Konfirmasi kata sandi</Text>
          <View
            style={[
              styles.passwordRow,
              errors.confirmPassword && styles.inputError,
            ]}
          >
            <TextInput
              key={
                showConfirmPassword ? "reg-conf-visible" : "reg-conf-masked"
              }
              ref={confirmRef}
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setErrors((e) => ({ ...e, confirmPassword: undefined }));
                setFormError(null);
              }}
              placeholder="Ulangi kata sandi"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />
            <Pressable
              onPress={() => setShowConfirmPassword((v) => !v)}
              hitSlop={8}
              style={styles.eyeButton}
              accessibilityLabel={
                showConfirmPassword
                  ? "Sembunyikan konfirmasi kata sandi"
                  : "Tampilkan konfirmasi kata sandi"
              }
            >
              <AppIcon
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={20}
                color={COLORS.textSecondary}
              />
            </Pressable>
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textOnPrimary} />
            ) : (
              <Text style={styles.buttonText}>Daftar</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun?</Text>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.footerLink}>Masuk</Text>
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
