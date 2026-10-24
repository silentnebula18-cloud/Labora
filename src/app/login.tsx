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

import { useAuth } from "../context/AuthContext";

interface FieldErrors {
  nim?: string;
  password?: string;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const passwordRef = useRef<any>(null);

  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState(false); 
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;

    const nextErrors: FieldErrors = {};
    if (!nim.trim()) nextErrors.nim = "NIM wajib diisi";
    if (!password) nextErrors.password = "Kata sandi wajib diisi";

    setFormError(null);
    setCredentialError(false);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const result = await login(nim, password);

    // Jika berhasil, navigator otomatis pindah halaman.
    if (!result.ok) {
      setLoading(false);
      setFormError(result.message);
      setCredentialError(result.code === "KREDENSIAL_SALAH");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
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

          <Text style={styles.label}>NIM</Text>
          <TextInput
            style={[
              styles.input,
              (errors.nim || credentialError) && styles.inputError,
            ]}
            value={nim}
            onChangeText={(t) => {
              setNim(t);
              setErrors((e) => ({ ...e, nim: undefined }));
              setFormError(null);
              setCredentialError(false);
            }}
            placeholder="Masukkan NIM"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!loading}
          />
          {errors.nim && <Text style={styles.errorText}>{errors.nim}</Text>}

          <Text style={styles.label}>Kata sandi</Text>
          <View
            style={[
              styles.passwordRow,
              (errors.password || credentialError) && styles.inputError,
            ]}
          >
            <TextInput
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
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              editable={!loading}
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Text style={styles.toggle}>
                {showPassword ? "Sembunyikan" : "Tampilkan"}
              </Text>
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
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 32, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 16, color: "#6b7280", marginBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: { borderColor: "#dc2626" },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  toggle: { color: "#2563eb", fontWeight: "600", fontSize: 13 },
  errorText: { color: "#dc2626", fontSize: 13, marginTop: 4 },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorBoxText: { color: "#b91c1c" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
