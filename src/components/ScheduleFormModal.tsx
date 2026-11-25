import {
  DateTimePicker,
  type DateTimePickerEvent,
} from "@expo/ui/community/datetime-picker";
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
import { formatJam, formatTanggal } from "../utils/format";
import AppIcon from "./AppIcon";

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

const MIN_START_MINUTES = 7 * 60 + 40; // 07:40 (460)
const MAX_START_MINUTES = 18 * 60 + 10; // 18:10 (1090)
const MIN_END_MINUTES = 9 * 60 + 40; // 09:40 (580)
const MAX_END_MINUTES = 20 * 60 + 10; // 20:10 (1210)
const REQUIRED_DURATION_MINUTES = 120; // Tepat 2 jam (120 menit)

function buildDateWithTime(
  baseDate: Date,
  hours: number,
  minutes: number,
): Date {
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function getTodayDate(): Date {
  return buildDateWithTime(new Date(), 0, 0);
}

function getTomorrowDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return buildDateWithTime(d, 0, 0);
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
  const defaultDate = initialValues?.tanggal
    ? buildDateWithTime(initialValues.tanggal, 0, 0)
    : getTodayDate();

  const [classId, setClassId] = useState(
    initialValues?.classId || classes[0]?.id || "",
  );
  const [nomorPraktikum, setNomorPraktikum] = useState(
    initialValues?.nomorPraktikum ? String(initialValues.nomorPraktikum) : "1",
  );
  const [namaPraktikum, setNamaPraktikum] = useState(
    initialValues?.namaPraktikum ?? "",
  );
  const [tanggal, setTanggal] = useState<Date>(defaultDate);
  const [jamMulai, setJamMulai] = useState<Date>(
    initialValues?.jamMulai
      ? buildDateWithTime(
          defaultDate,
          initialValues.jamMulai.getHours(),
          initialValues.jamMulai.getMinutes(),
        )
      : buildDateWithTime(defaultDate, 7, 40),
  );
  const [jamSelesai, setJamSelesai] = useState<Date>(
    initialValues?.jamSelesai
      ? buildDateWithTime(
          defaultDate,
          initialValues.jamSelesai.getHours(),
          initialValues.jamSelesai.getMinutes(),
        )
      : buildDateWithTime(defaultDate, 9, 40),
  );
  const [ruang, setRuang] = useState(initialValues?.ruang ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const [activePicker, setActivePicker] = useState<
    "tanggal" | "jamMulai" | "jamSelesai" | null
  >(null);

  const effectiveClassId = classId || classes[0]?.id || "";

  function applySelectedDate(nextDate: Date) {
    const cleanDate = buildDateWithTime(nextDate, 0, 0);
    setTanggal(cleanDate);
    setJamMulai((prev) =>
      buildDateWithTime(cleanDate, prev.getHours(), prev.getMinutes()),
    );
    setJamSelesai((prev) =>
      buildDateWithTime(cleanDate, prev.getHours(), prev.getMinutes()),
    );
    setErrors((curr) => ({ ...curr, tanggal: undefined }));
  }

  function handleDatePickerChange(
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) {
    const currentPicker = activePicker;
    setActivePicker(null);

    if (event.type === "dismissed" || !selectedDate || !currentPicker) {
      return;
    }

    if (currentPicker === "tanggal") {
      applySelectedDate(selectedDate);
    } else if (currentPicker === "jamMulai") {
      const startTotalMinutes =
        selectedDate.getHours() * 60 + selectedDate.getMinutes();
      const endTotalMinutes = startTotalMinutes + REQUIRED_DURATION_MINUTES;

      const nextJamMulai = buildDateWithTime(
        tanggal,
        selectedDate.getHours(),
        selectedDate.getMinutes(),
      );
      const nextJamSelesai = buildDateWithTime(
        tanggal,
        Math.floor(endTotalMinutes / 60),
        endTotalMinutes % 60,
      );

      setJamMulai(nextJamMulai);
      setJamSelesai(nextJamSelesai);
      setErrors((curr) => ({
        ...curr,
        jamMulai: undefined,
        jamSelesai: undefined,
      }));
    } else if (currentPicker === "jamSelesai") {
      const endTotalMinutes =
        selectedDate.getHours() * 60 + selectedDate.getMinutes();
      const startTotalMinutes = endTotalMinutes - REQUIRED_DURATION_MINUTES;

      const nextJamSelesai = buildDateWithTime(
        tanggal,
        selectedDate.getHours(),
        selectedDate.getMinutes(),
      );
      const nextJamMulai = buildDateWithTime(
        tanggal,
        Math.floor(Math.max(0, startTotalMinutes) / 60),
        Math.max(0, startTotalMinutes) % 60,
      );

      setJamSelesai(nextJamSelesai);
      setJamMulai(nextJamMulai);
      setErrors((curr) => ({
        ...curr,
        jamMulai: undefined,
        jamSelesai: undefined,
      }));
    }
  }

  function handleSubmit() {
    if (submitting) return;

    const nextErrors: FieldErrors = {};
    const parsedNomor = Number(nomorPraktikum.trim());

    if (!effectiveClassId.trim()) {
      nextErrors.classId = "Kelas wajib dipilih";
    }
    if (
      !nomorPraktikum.trim() ||
      !Number.isInteger(parsedNomor) ||
      parsedNomor < 1
    ) {
      nextErrors.nomorPraktikum = "Nomor pertemuan tidak valid";
    }
    if (!namaPraktikum.trim()) {
      nextErrors.namaPraktikum = "Topik praktikum wajib diisi";
    }
    if (!(tanggal instanceof Date) || Number.isNaN(tanggal.getTime())) {
      nextErrors.tanggal = "Tanggal tidak valid";
    }

    const startMinutes = jamMulai.getHours() * 60 + jamMulai.getMinutes();
    const endMinutes = jamSelesai.getHours() * 60 + jamSelesai.getMinutes();
    const durationMinutes = endMinutes - startMinutes;

    if (
      startMinutes < MIN_START_MINUTES ||
      startMinutes > MAX_START_MINUTES ||
      endMinutes < MIN_END_MINUTES ||
      endMinutes > MAX_END_MINUTES ||
      endMinutes <= startMinutes ||
      durationMinutes !== REQUIRED_DURATION_MINUTES
    ) {
      nextErrors.jamSelesai =
        "Jam tidak valid, periksa kembali aturan yang berlaku";
    }

    if (!ruang.trim()) {
      nextErrors.ruang = "Ruang wajib diisi";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const normalizedTanggal = buildDateWithTime(tanggal, 0, 0);
    const normalizedJamMulai = buildDateWithTime(
      normalizedTanggal,
      jamMulai.getHours(),
      jamMulai.getMinutes(),
    );
    const normalizedJamSelesai = buildDateWithTime(
      normalizedTanggal,
      jamSelesai.getHours(),
      jamSelesai.getMinutes(),
    );

    onSubmit({
      classId: effectiveClassId.trim(),
      nomorPraktikum: parsedNomor,
      namaPraktikum: namaPraktikum.trim(),
      tanggal: normalizedTanggal,
      jamMulai: normalizedJamMulai,
      jamSelesai: normalizedJamSelesai,
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            {/* Pilih Kelas */}
            <Text style={styles.label}>
              Kelas Praktikum <Text style={styles.requiredMark}>*</Text>
            </Text>
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
                <Text style={styles.label}>
                  Pertemuan Ke- <Text style={styles.requiredMark}>*</Text>
                </Text>
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
                  placeholderTextColor="#6EA4BF"
                  selectionColor="#41337A"
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!submitting}
                />
              </View>

              <View style={styles.colLarge}>
                <Text style={styles.label}>
                  Ruang Laboratorium <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.ruang && styles.inputError]}
                  value={ruang}
                  onChangeText={(text) => {
                    setRuang(text);
                    setErrors((curr) => ({ ...curr, ruang: undefined }));
                  }}
                  placeholder="Contoh: Lab Terpadu A301"
                  placeholderTextColor="#6EA4BF"
                  selectionColor="#41337A"
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
            <Text style={styles.label}>
              Topik / Judul Praktikum <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.namaPraktikum && styles.inputError]}
              value={namaPraktikum}
              onChangeText={(text) => {
                setNamaPraktikum(text);
                setErrors((curr) => ({ ...curr, namaPraktikum: undefined }));
              }}
              placeholder="Contoh: Modul 1 — Arsitektur Komponen"
              placeholderTextColor="#6EA4BF"
              selectionColor="#41337A"
              maxLength={120}
              editable={!submitting}
            />
            {errors.namaPraktikum && (
              <Text style={styles.errorText}>{errors.namaPraktikum}</Text>
            )}

            {/* Tanggal (DateTimePicker) */}
            <View style={styles.dateHeaderRow}>
              <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>
                Tanggal Praktikum <Text style={styles.requiredMark}>*</Text>
              </Text>
              <View style={styles.quickDateRow}>
                <Pressable
                  style={styles.quickDateChip}
                  onPress={() => applySelectedDate(getTodayDate())}
                  disabled={submitting}
                >
                  <Text style={styles.quickDateText}>Hari Ini</Text>
                </Pressable>
                <Pressable
                  style={styles.quickDateChip}
                  onPress={() => applySelectedDate(getTomorrowDate())}
                  disabled={submitting}
                >
                  <Text style={styles.quickDateText}>Besok</Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              style={[
                styles.pickerButton,
                errors.tanggal && styles.inputError,
              ]}
              onPress={() => setActivePicker("tanggal")}
              disabled={submitting}
            >
              <AppIcon name="calendar" size={16} color="#41337A" />
              <Text style={styles.pickerButtonText}>
                {formatTanggal(tanggal)}
              </Text>
            </Pressable>
            {errors.tanggal && (
              <Text style={styles.errorText}>{errors.tanggal}</Text>
            )}

            {/* Jam Mulai & Jam Selesai (DateTimePicker) */}
            <View style={styles.row}>
              <View style={styles.colHalf}>
                <Text style={styles.label}>
                  Jam Mulai <Text style={styles.requiredMark}>*</Text>
                </Text>
                <Pressable
                  style={[
                    styles.pickerButton,
                    errors.jamMulai && styles.inputError,
                  ]}
                  onPress={() => setActivePicker("jamMulai")}
                  disabled={submitting}
                >
                  <AppIcon name="clock" size={16} color="#41337A" />
                  <Text style={styles.pickerButtonText}>
                    {formatJam(jamMulai)} WIB
                  </Text>
                </Pressable>
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.label}>
                  Jam Selesai <Text style={styles.requiredMark}>*</Text>
                </Text>
                <Pressable
                  style={[
                    styles.pickerButton,
                    errors.jamSelesai && styles.inputError,
                  ]}
                  onPress={() => setActivePicker("jamSelesai")}
                  disabled={submitting}
                >
                  <AppIcon name="clock" size={16} color="#41337A" />
                  <Text style={styles.pickerButtonText}>
                    {formatJam(jamSelesai)} WIB
                  </Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.timeHintText}>
              Ketentuan: Rentang waktu 07:40 – 20:10 WIB dengan durasi wajib
              tepat 2 jam (120 menit).
            </Text>
            {errors.jamMulai && (
              <Text style={styles.errorText}>{errors.jamMulai}</Text>
            )}
            {errors.jamSelesai && (
              <Text style={styles.errorText}>{errors.jamSelesai}</Text>
            )}

            {activePicker && (
              <DateTimePicker
                value={
                  activePicker === "tanggal"
                    ? tanggal
                    : activePicker === "jamMulai"
                      ? jamMulai
                      : jamSelesai
                }
                mode={activePicker === "tanggal" ? "date" : "time"}
                is24Hour
                onChange={handleDatePickerChange}
              />
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
    backgroundColor: "rgba(51, 30, 54, 0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    maxHeight: "90%",
    flexShrink: 1,
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6EA4BF",
  },
  headerRow: {
    marginBottom: 8,
  },
  formScroll: {
    flexShrink: 1,
  },
  formScrollContent: {
    paddingBottom: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#331E36",

  },
  subtitle: {
    fontSize: 13,
    color: "#6EA4BF",
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
  errorBoxText: { color: "#991b1b", fontSize: 13, },

  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#331E36",
    marginTop: 14,
    marginBottom: 6,


  },
  requiredMark: {
    color: "#dc2626",
    fontWeight: "800",

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
    backgroundColor: "#C2EFEB",
    borderWidth: 1,
    borderColor: "#6EA4BF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#41337A",

  },

  classSelectorWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  classChip: {
    borderWidth: 1,
    borderColor: "#6EA4BF",
    backgroundColor: "#ECFEE8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: "46%",
    flexGrow: 1,
  },
  classChipSelected: {
    borderColor: "#41337A",
    backgroundColor: "#C2EFEB",
  },
  classChipCode: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#331E36",

  },
  classChipCodeSelected: {
    color: "#41337A",
  },
  classChipCourse: {
    fontSize: 11.5,
    color: "#6EA4BF",
    marginTop: 2,

  },
  classChipCourseSelected: {
    color: "#41337A",
    fontWeight: "600",

  },
  emptyClassBox: {
    backgroundColor: "#ECFEE8",
    borderWidth: 1,
    borderColor: "#6EA4BF",
    borderRadius: 10,
    padding: 12,
  },
  emptyClassText: {
    fontSize: 12.5,
    color: "#41337A",
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
    borderColor: "#6EA4BF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14.5,
    color: "#331E36",
    backgroundColor: "#ECFEE8",


  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#6EA4BF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#ECFEE8",
  },
  pickerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#331E36",
    flexShrink: 1,

  },
  timeHintText: {
    fontSize: 11.5,
    color: "#6EA4BF",
    marginTop: 6,
    lineHeight: 16,

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
    backgroundColor: "#ECFEE8",
    borderWidth: 1,
    borderColor: "#6EA4BF",
  },
  cancelText: { fontSize: 14, fontWeight: "700", color: "#331E36", },
  saveButton: {
    flex: 1.5,
    backgroundColor: "#41337A",
  },
  saveText: { fontSize: 14, fontWeight: "700", color: "#fff", },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.55 },
});
