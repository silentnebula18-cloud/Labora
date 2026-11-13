import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { ClassInput } from "../services/classService";

interface ClassFormModalProps {
  visible: boolean;
  mode: "create" | "edit";
  initialValues?: ClassInput;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: ClassInput) => void;
  onClose: () => void;
}

interface FieldErrors {
  mataKuliah?: string;
  kodeKelas?: string;
}

export default function ClassFormModal({
  visible,
  mode,
  initialValues,
  submitting = false,
  error,
  onSubmit,
  onClose,
}: ClassFormModalProps) {
  const [mataKuliah, setMataKuliah] = useState(
    initialValues?.mataKuliah ?? "",
  );
  const [kodeKelas, setKodeKelas] = useState(initialValues?.kodeKelas ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit() {
    if (submitting) return;

    const nextErrors: FieldErrors = {};

    if (!mataKuliah.trim()) {
      nextErrors.mataKuliah = "Nama mata kuliah wajib diisi";
    }
    if (!kodeKelas.trim()) {
      nextErrors.kodeKelas = "Kode kelas wajib diisi";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      mataKuliah: mataKuliah.trim(),
      kodeKelas: kodeKelas.trim().toUpperCase(),
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={submitting ? undefined : onClose}
          accessibilityLabel="Tutup form kelas"
        />

        <View style={styles.card} accessibilityViewIsModal>
          <Text style={styles.title}>
            {mode === "create" ? "Tambah Kelas" : "Ubah Kelas"}
          </Text>
          <Text style={styles.subtitle}>
            {mode === "create"
              ? "Buat kelas praktikum baru untuk dikelola bersama peserta."
              : "Perbarui informasi mata kuliah dan kode kelas."}
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Nama mata kuliah</Text>
          <TextInput
            style={[styles.input, errors.mataKuliah && styles.inputError]}
            value={mataKuliah}
            onChangeText={(text) => {
              setMataKuliah(text);
              setErrors((current) => ({ ...current, mataKuliah: undefined }));
            }}
            placeholder="Contoh: Pemrograman Berorientasi Objek"
            placeholderTextColor="#9ca3af"
            selectionColor="#2563eb"
            maxLength={120}
            editable={!submitting}
          />
          {errors.mataKuliah && (
            <Text style={styles.errorText}>{errors.mataKuliah}</Text>
          )}

          <Text style={styles.label}>Kode kelas</Text>
          <TextInput
            style={[styles.input, errors.kodeKelas && styles.inputError]}
            value={kodeKelas}
            onChangeText={(text) => {
              setKodeKelas(text);
              setErrors((current) => ({ ...current, kodeKelas: undefined }));
            }}
            placeholder="Contoh: C1"
            placeholderTextColor="#9ca3af"
            selectionColor="#2563eb"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
            editable={!submitting}
          />
          {errors.kodeKelas && (
            <Text style={styles.errorText}>{errors.kodeKelas}</Text>
          )}

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                styles.saveButton,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>
                  {mode === "create" ? "Tambah Kelas" : "Simpan Perubahan"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 6,
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  errorBoxText: { color: "#b91c1c", fontSize: 13 },
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
    color: "#111827",
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#dc2626" },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginTop: 4,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  saveButton: {
    flex: 1.4,
    backgroundColor: "#1e40af",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  buttonPressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.6 },
});
