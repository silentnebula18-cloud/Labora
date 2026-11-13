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

import type { ScheduleInput } from "../services/sessionService";
import type { ClassRecord } from "../types";

interface ScheduleFormModalProps {
  visible: boolean;
  mode: "create" | "edit";
  classes: ClassRecord[];
  initialValues?: ScheduleInput;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: ScheduleInput) => void;
  onClose: () => void;
}

interface FieldErrors {
  classId?: string;
  nomorPraktikum?: string;
  namaPraktikum?: string;
  tanggal?: string;
  jamMulai?: string;
  jamSelesai?: string;
  ruang?: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

function getTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getTomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ScheduleFormModal({
  visible,
  mode,
  classes,
  initialValues,
  submitting = false,
  error,
  onSubmit,
  onClose,
}: ScheduleFormModalProps) {
  const [classId, setClassId] = useState(
    initialValues?.classId || classes[0]?.id || "",
  );
  const [nomorPraktikum, setNomorPraktikum] = useState(
    initialValues?.nomorPraktikum ? String(initialValues.nomorPraktikum) : "1",
  );
  const [namaPraktikum, setNamaPraktikum] = useState(
    initialValues?.namaPraktikum ?? "",
  );
  const [tanggal, setTanggal] = useState(
    initialValues?.tanggal || getTodayIso(),
  );
  const [jamMulai, setJamMulai] = useState(
    initialValues?.jamMulai || "08:00",
  );
  const [jamSelesai, setJamSelesai] = useState(
    initialValues?.jamSelesai || "10:00",
  );
  const [ruang, setRuang] = useState(initialValues?.ruang ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const effectiveClassId = classId || classes[0]?.id || "";

  function handleSubmit() {
    if (submitting) return;

    const nextErrors: FieldErrors = {};
    const parsedNomor = Number(nomorPraktikum.trim());

    if (!effectiveClassId.trim()) {
      nextErrors.classId = "Pilih kelas praktikum terlebih dahulu";
    }
    if (
      !nomorPraktikum.trim() ||
      !Number.isInteger(parsedNomor) ||
      parsedNomor < 1
    ) {
      nextErrors.nomorPraktikum = "Nomor praktikum harus berupa angka bulat ≥ 1";
    }
    if (!namaPraktikum.trim()) {
      nextErrors.namaPraktikum = "Nama / topik praktikum wajib diisi";
    }
    if (!DATE_REGEX.test(tanggal.trim())) {
      nextErrors.tanggal = "Format tanggal harus YYYY-MM-DD (contoh: 2026-04-20)";
    } else {
      const parsedDate = new Date(tanggal.trim() + "T00:00:00");
      if (Number.isNaN(parsedDate.getTime())) {
        nextErrors.tanggal = "Tanggal tidak valid";
      }
    }
    if (!TIME_REGEX.test(jamMulai.trim())) {
      nextErrors.jamMulai = "Format jam mulai HH:mm (contoh: 08:00)";
    }
    if (!TIME_REGEX.test(jamSelesai.trim())) {
      nextErrors.jamSelesai = "Format jam selesai HH:mm (contoh: 10:00)";
    }
    if (
      TIME_REGEX.test(jamMulai.trim()) &&
      TIME_REGEX.test(jamSelesai.trim()) &&
      jamSelesai.trim() <= jamMulai.trim()
    ) {
      nextErrors.jamSelesai = "Jam selesai harus lebih akhir dari jam mulai";
    }
    if (!ruang.trim()) {
      nextErrors.ruang = "Ruang praktikum wajib diisi";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      classId: effectiveClassId.trim(),
      nomorPraktikum: parsedNomor,
      namaPraktikum: namaPraktikum.trim(),
      tanggal: tanggal.trim(),
      jamMulai: jamMulai.trim(),
      jamSelesai: jamSelesai.trim(),
      ruang: ruang.trim(),
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={submitting ? undefined : onClose}
          accessibilityLabel="Tutup form jadwal"
        />

        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.handleWrap}>
            <View style={styles.handleBar} />
          </View>

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>
                {mode === "create"
                  ? "Tambah Jadwal Praktikum"
                  : "Ubah Jadwal Praktikum"}
              </Text>
              <Text style={styles.subtitle}>
                {mode === "create"
                  ? "Jadwal baru otomatis membuat sesi berstatus Terjadwal."
                  : "Perbarui informasi jadwal dan sesi praktikum."}
              </Text>
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          <ScrollView
            style={styles.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Pilih Kelas */}
            <Text style={styles.label}>Kelas Praktikum</Text>
            {classes.length === 0 ? (
              <View style={styles.emptyClassBox}>
                <Text style={styles.emptyClassText}>
                  Anda belum memiliki kelas. Buat kelas terlebih dahulu di menu
                  Kelola Kelas.
                </Text>
              </View>
            ) : (
              <View style={styles.classSelectorWrap}>
                {classes.map((item) => {
                  const isSelected = item.id === effectiveClassId;
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.classChip,
                        isSelected && styles.classChipSelected,
                      ]}
                      onPress={() => {
                        setClassId(item.id);
                        setErrors((curr) => ({ ...curr, classId: undefined }));
                      }}
                      disabled={submitting}
                    >
                      <Text
                        style={[
                          styles.classChipCode,
                          isSelected && styles.classChipCodeSelected,
                        ]}
                      >
                        Kelas {item.kodeKelas}
                      </Text>
                      <Text
                        style={[
                          styles.classChipCourse,
                          isSelected && styles.classChipCourseSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.mataKuliah}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            {errors.classId && (
              <Text style={styles.errorText}>{errors.classId}</Text>
            )}

            {/* Praktikum Ke-berapa & Ruang */}
            <View style={styles.row}>
              <View style={styles.colSmall}>
                <Text style={styles.label}>Pertemuan Ke-</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.nomorPraktikum && styles.inputError,
                  ]}
                  value={nomorPraktikum}
                  onChangeText={(text) => {
                    setNomorPraktikum(text.replace(/[^0-9]/g, ""));
                    setErrors((curr) => ({
                      ...curr,
                      nomorPraktikum: undefined,
                    }));
                  }}
                  placeholder="1"
                  placeholderTextColor="#94a3b8"
                  selectionColor="#2563eb"
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!submitting}
                />
              </View>

              <View style={styles.colLarge}>
                <Text style={styles.label}>Ruang Laboratorium</Text>
                <TextInput
                  style={[styles.input, errors.ruang && styles.inputError]}
                  value={ruang}
                  onChangeText={(text) => {
                    setRuang(text);
                    setErrors((curr) => ({ ...curr, ruang: undefined }));
                  }}
                  placeholder="Contoh: Lab Terpadu A301"
                  placeholderTextColor="#94a3b8"
                  selectionColor="#2563eb"
                  maxLength={60}
                  editable={!submitting}
                />
              </View>
            </View>
            {errors.nomorPraktikum && (
              <Text style={styles.errorText}>{errors.nomorPraktikum}</Text>
            )}
            {errors.ruang && (
              <Text style={styles.errorText}>{errors.ruang}</Text>
            )}

            {/* Nama Praktikum */}
            <Text style={styles.label}>Topik / Judul Praktikum</Text>
            <TextInput
              style={[styles.input, errors.namaPraktikum && styles.inputError]}
              value={namaPraktikum}
              onChangeText={(text) => {
                setNamaPraktikum(text);
                setErrors((curr) => ({ ...curr, namaPraktikum: undefined }));
              }}
              placeholder="Contoh: Modul 1 — Arsitektur Komponen"
              placeholderTextColor="#94a3b8"
              selectionColor="#2563eb"
              maxLength={120}
              editable={!submitting}
            />
            {errors.namaPraktikum && (
              <Text style={styles.errorText}>{errors.namaPraktikum}</Text>
            )}

            {/* Tanggal (Input Manual) */}
            <View style={styles.dateHeaderRow}>
              <Text style={styles.label}>Tanggal (YYYY-MM-DD)</Text>
              <View style={styles.quickDateRow}>
                <Pressable
                  style={styles.quickDateChip}
                  onPress={() => {
                    setTanggal(getTodayIso());
                    setErrors((curr) => ({ ...curr, tanggal: undefined }));
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.quickDateText}>Hari Ini</Text>
                </Pressable>
                <Pressable
                  style={styles.quickDateChip}
                  onPress={() => {
                    setTanggal(getTomorrowIso());
                    setErrors((curr) => ({ ...curr, tanggal: undefined }));
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.quickDateText}>Besok</Text>
                </Pressable>
              </View>
            </View>
            <TextInput
              style={[styles.input, errors.tanggal && styles.inputError]}
              value={tanggal}
              onChangeText={(text) => {
                setTanggal(text);
                setErrors((curr) => ({ ...curr, tanggal: undefined }));
              }}
              placeholder="2026-04-20"
              placeholderTextColor="#94a3b8"
              selectionColor="#2563eb"
              maxLength={10}
              editable={!submitting}
            />
            {errors.tanggal && (
              <Text style={styles.errorText}>{errors.tanggal}</Text>
            )}

            {/* Jam Mulai & Jam Selesai */}
            <View style={styles.row}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>Jam Mulai (HH:mm)</Text>
                <TextInput
                  style={[styles.input, errors.jamMulai && styles.inputError]}
                  value={jamMulai}
                  onChangeText={(text) => {
                    setJamMulai(text);
                    setErrors((curr) => ({ ...curr, jamMulai: undefined }));
                  }}
                  placeholder="08:00"
                  placeholderTextColor="#94a3b8"
                  selectionColor="#2563eb"
                  maxLength={5}
                  editable={!submitting}
                />
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.label}>Jam Selesai (HH:mm)</Text>
                <TextInput
                  style={[styles.input, errors.jamSelesai && styles.inputError]}
                  value={jamSelesai}
                  onChangeText={(text) => {
                    setJamSelesai(text);
                    setErrors((curr) => ({ ...curr, jamSelesai: undefined }));
                  }}
                  placeholder="10:00"
                  placeholderTextColor="#94a3b8"
                  selectionColor="#2563eb"
                  maxLength={5}
                  editable={!submitting}
                />
              </View>
            </View>
            {errors.jamMulai && (
              <Text style={styles.errorText}>{errors.jamMulai}</Text>
            )}
            {errors.jamSelesai && (
              <Text style={styles.errorText}>{errors.jamSelesai}</Text>
            )}
          </ScrollView>

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
                (submitting || classes.length === 0) && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting || classes.length === 0}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>
                  {mode === "create" ? "Simpan Jadwal" : "Simpan Perubahan"}
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
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
  },
  headerRow: {
    marginBottom: 8,
  },
  formScroll: {
    maxHeight: 450,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
  errorBoxText: { color: "#991b1b", fontSize: 13 },

  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#334155",
    marginTop: 14,
    marginBottom: 6,
  },
  dateHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 6,
  },
  quickDateRow: {
    flexDirection: "row",
    gap: 6,
  },
  quickDateChip: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },

  classSelectorWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  classChip: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: "46%",
    flexGrow: 1,
  },
  classChipSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  classChipCode: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#334155",
  },
  classChipCodeSelected: {
    color: "#2563eb",
  },
  classChipCourse: {
    fontSize: 11.5,
    color: "#64748b",
    marginTop: 2,
  },
  classChipCourseSelected: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  emptyClassBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
  },
  emptyClassText: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 18,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },
  colSmall: {
    flex: 0.85,
  },
  colLarge: {
    flex: 1.85,
  },
  colHalf: {
    flex: 1,
  },

  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  inputError: { borderColor: "#b91c1c" },
  errorText: {
    color: "#b91c1c",
    fontSize: 12,
    marginTop: 4,
  },

  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  button: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#334155" },
  saveButton: {
    flex: 1.5,
    backgroundColor: "#2563eb",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.55 },
});
