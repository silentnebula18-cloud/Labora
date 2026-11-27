import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { isClassCode } from "../constants/classes";
import { COLORS, RADIUS } from "../constants/theme";
import type { ClassInput } from "../services/classService";
import ClassCodeDropdown from "./ClassCodeDropdown";

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
      nextErrors.mataKuliah = "Mata kuliah wajib diisi";
    }
    if (!kodeKelas.trim() || !isClassCode(kodeKelas)) {
      nextErrors.kodeKelas = "Kode kelas wajib dipilih";
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={submitting ? undefined : onClose}
          accessibilityLabel="Tutup form kelas"
        />

        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>
              {mode === "create" ? "Tambah Kelas Baru" : "Ubah Informasi Kelas"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "create"
                ? "Atur nama mata kuliah dan kode kelas praktikum."
                : "Perbarui nama mata kuliah dan kode kelas."}
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            )}

            <Text style={styles.label}>
              Nama mata kuliah <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.mataKuliah && styles.inputError]}
              value={mataKuliah}
              onChangeText={(text) => {
                setMataKuliah(text);
                setErrors((current) => ({
                  ...current,
                  mataKuliah: undefined,
                }));
              }}
              placeholder="Contoh: Algoritma & Pemrograman"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              maxLength={120}
              editable={!submitting}
            />
            {errors.mataKuliah && (
              <Text style={styles.errorText}>{errors.mataKuliah}</Text>
            )}

            <Text style={styles.label}>
              Kode kelas <Text style={styles.requiredMark}>*</Text>
            </Text>
            <ClassCodeDropdown
              value={kodeKelas}
              onChange={(selected) => {
                setKodeKelas(selected);
                setErrors((current) => ({
                  ...current,
                  kodeKelas: undefined,
                }));
              }}
              placeholder="Pilih kode kelas (A1 – E2)"
              disabled={submitting}
              hasError={!!errors.kodeKelas}
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
                  pressed && !submitting && styles.saveButtonPressed,
                  submitting && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.saveText}>
                    {mode === "create" ? "Simpan Kelas" : "Simpan"}
                  </Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 22,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 22,
    maxHeight: "88%",
  },
  title: {
    fontSize: 17.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 6,
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 11,
    marginTop: 8,
  },
  errorBoxText: { color: COLORS.dangerDark, fontSize: 12.5 },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  requiredMark: {
    color: COLORS.dangerText,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  inputError: { borderColor: COLORS.dangerText },
  errorText: {
    color: COLORS.dangerText,
    fontSize: 11.5,
    marginTop: 4,
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  button: {
    flex: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cancelText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  saveText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
