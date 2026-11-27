import {
  DateTimePicker,
  type DateTimePickerEvent,
} from "@expo/ui/community/datetime-picker";
import { useEffect, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, RADIUS } from "../constants/theme";
import { subscribeLaboratories } from "../services/laboratoryService";
import type { ScheduleInput } from "../services/sessionService";
import type { ClassRecord, Laboratory } from "../types";
import { formatJam, formatTanggal } from "../utils/format";
import AppIcon from "./AppIcon";
import SelectDropdown, { type DropdownOption } from "./SelectDropdown";

interface ScheduleFormModalProps {
  visible: boolean;
  mode: "create" | "edit";
  classes: ClassRecord[];
  initialValues?: Partial<ScheduleInput>;
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

const MIN_START_MINUTES = 7 * 60 + 40; // 07:40
const MAX_START_MINUTES = 18 * 60 + 10; // 18:10
const MIN_END_MINUTES = 9 * 60 + 40; // 09:40
const MAX_END_MINUTES = 20 * 60 + 10; // 20:10
const REQUIRED_DURATION_MINUTES = 120; // Tepat 2 jam

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
    mode === "edit" && initialValues?.nomorPraktikum != null
      ? String(initialValues.nomorPraktikum)
      : "",
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
  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [activePicker, setActivePicker] = useState<
    "tanggal" | "jamMulai" | "jamSelesai" | null
  >(null);

  useEffect(() => {
    const unsubscribe = subscribeLaboratories((items) => {
      const active = items.filter((lab) => lab.aktif !== false);
      setLaboratories(active);
    });
    return unsubscribe;
  }, []);

  const effectiveClassId = classId || classes[0]?.id || "";

  const classOptions: DropdownOption[] = useMemo(
    () =>
      classes.map((c) => ({
        value: c.id,
        label: `${c.mataKuliah} · ${c.kodeKelas}`,
        badge: c.kodeKelas,
      })),
    [classes],
  );

  const labOptions: DropdownOption[] = useMemo(() => {
    const baseOptions: DropdownOption[] = laboratories.map((lab) => ({
      value: lab.nama,
      label: lab.nama,
      subtitle: `Radius ${lab.radius} meter · ${lab.alamat}`,
    }));
    const trimmedRuang = ruang.trim();
    if (
      trimmedRuang &&
      !baseOptions.some(
        (opt) => opt.value.trim().toLowerCase() === trimmedRuang.toLowerCase(),
      )
    ) {
      baseOptions.unshift({
        value: trimmedRuang,
        label: trimmedRuang,
      });
    }
    return baseOptions;
  }, [laboratories, ruang]);

  const selectedLabRecord = useMemo(() => {
    const clean = ruang.trim().toLowerCase();
    if (!clean) return null;
    return (
      laboratories.find((l) => l.nama.trim().toLowerCase() === clean) ?? null
    );
  }, [laboratories, ruang]);

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

      setJamMulai(
        buildDateWithTime(
          tanggal,
          selectedDate.getHours(),
          selectedDate.getMinutes(),
        ),
      );
      setJamSelesai(
        buildDateWithTime(
          tanggal,
          Math.floor(endTotalMinutes / 60),
          endTotalMinutes % 60,
        ),
      );
      setErrors((curr) => ({
        ...curr,
        jamMulai: undefined,
        jamSelesai: undefined,
      }));
    } else if (currentPicker === "jamSelesai") {
      const endTotalMinutes =
        selectedDate.getHours() * 60 + selectedDate.getMinutes();
      const startTotalMinutes = Math.max(
        0,
        endTotalMinutes - REQUIRED_DURATION_MINUTES,
      );

      setJamSelesai(
        buildDateWithTime(
          tanggal,
          selectedDate.getHours(),
          selectedDate.getMinutes(),
        ),
      );
      setJamMulai(
        buildDateWithTime(
          tanggal,
          Math.floor(startTotalMinutes / 60),
          startTotalMinutes % 60,
        ),
      );
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
      nextErrors.nomorPraktikum = "Pertemuan tidak valid";
    }
    if (!namaPraktikum.trim()) {
      nextErrors.namaPraktikum = "Topik pertemuan wajib diisi";
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
        "Durasi wajib 2 jam pada rentang 07.40–20.10 WIB";
    }

    if (!ruang.trim()) {
      nextErrors.ruang = "Laboratorium wajib dipilih";
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
      classId: effectiveClassId,
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
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header Sesuai Layar `Buat sesi baru` */}
          <View style={styles.header}>
            <Pressable
              style={styles.backRow}
              onPress={submitting ? undefined : onClose}
              hitSlop={10}
            >
              <AppIcon
                name="chevron-left"
                size={20}
                color={COLORS.textPrimary}
              />
              <Text style={styles.headerTitle}>
                {mode === "create" ? "Buat Sesi Baru" : "Ubah Sesi Praktikum"}
              </Text>
            </Pressable>
            <Text style={styles.headerSub}>Atur waktu dan lokasi presensi.</Text>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {error && (
              <View style={styles.errorBox}>
                <AppIcon name="alert" size={16} color={COLORS.dangerText} />
                <Text style={styles.errorBoxText}>{error}</Text>
              </View>
            )}

            {/* 1. Kelas Praktikum (Dropdown) */}
            <Text style={styles.label}>
              Kelas praktikum <Text style={styles.req}>*</Text>
            </Text>
            <SelectDropdown
              value={effectiveClassId}
              options={classOptions}
              onChange={(val) => {
                setClassId(val);
                setErrors((c) => ({ ...c, classId: undefined }));
              }}
              placeholder="Pilih kelas praktikum"
              emptyText="Buat kelas terlebih dahulu di menu Kelas"
              disabled={submitting}
              hasError={!!errors.classId}
            />
            {errors.classId && (
              <Text style={styles.errorText}>{errors.classId}</Text>
            )}

            {/* 2. Topik Pertemuan */}
            <Text style={styles.label}>
              Topik pertemuan <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.namaPraktikum && styles.inputError]}
              value={namaPraktikum}
              onChangeText={(t) => {
                setNamaPraktikum(t);
                setErrors((c) => ({ ...c, namaPraktikum: undefined }));
              }}
              placeholder="Contoh: Array & Fungsi"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              maxLength={120}
              editable={!submitting}
            />
            {errors.namaPraktikum && (
              <Text style={styles.errorText}>{errors.namaPraktikum}</Text>
            )}

            {/* 3. Tanggal & Pertemuan (2 Kolom) */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1.4 }}>
                <Text style={styles.label}>
                  Tanggal <Text style={styles.req}>*</Text>
                </Text>
                <Pressable
                  style={[
                    styles.pickerField,
                    errors.tanggal && styles.inputError,
                  ]}
                  onPress={() => {
                    if (!submitting) setActivePicker("tanggal");
                  }}
                >
                  <Text style={styles.pickerText}>
                    {formatTanggal(tanggal)}
                  </Text>
                  <AppIcon
                    name="calendar"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
                {errors.tanggal && (
                  <Text style={styles.errorText}>{errors.tanggal}</Text>
                )}
              </View>

              <View style={{ flex: 0.9 }}>
                <Text style={styles.label}>
                  Pertemuan <Text style={styles.req}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.nomorPraktikum && styles.inputError,
                  ]}
                  value={nomorPraktikum}
                  onChangeText={(t) => {
                    setNomorPraktikum(t.replace(/[^\d]/g, "").slice(0, 2));
                    setErrors((c) => ({ ...c, nomorPraktikum: undefined }));
                  }}
                  placeholder="Contoh: 4"
                  placeholderTextColor={COLORS.textMuted}
                  selectionColor={COLORS.primary}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!submitting}
                />
                {errors.nomorPraktikum && (
                  <Text style={styles.errorText}>{errors.nomorPraktikum}</Text>
                )}
              </View>
            </View>

            {/* 4. Mulai & Selesai (Input Manual) */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  Mulai <Text style={styles.req}>*</Text>
                </Text>
                <Pressable
                  style={[
                    styles.pickerField,
                    errors.jamSelesai && styles.inputError,
                  ]}
                  onPress={() => {
                    if (!submitting) setActivePicker("jamMulai");
                  }}
                >
                  <Text style={styles.pickerText}>
                    {formatJam(jamMulai).replace(":", ".")}
                  </Text>
                  <AppIcon
                    name="clock"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>
                  Selesai <Text style={styles.req}>*</Text>
                </Text>
                <Pressable
                  style={[
                    styles.pickerField,
                    errors.jamSelesai && styles.inputError,
                  ]}
                  onPress={() => {
                    if (!submitting) setActivePicker("jamSelesai");
                  }}
                >
                  <Text style={styles.pickerText}>
                    {formatJam(jamSelesai).replace(":", ".")}
                  </Text>
                  <AppIcon
                    name="clock"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            {errors.jamSelesai && (
              <Text style={styles.errorText}>{errors.jamSelesai}</Text>
            )}

            {/* 5. Laboratorium (Dropdown dari Koleksi Laboratories) */}
            <Text style={styles.label}>
              Laboratorium <Text style={styles.req}>*</Text>
            </Text>
            <SelectDropdown
              value={ruang}
              options={labOptions}
              onChange={(val) => {
                setRuang(val);
                setErrors((c) => ({ ...c, ruang: undefined }));
              }}
              placeholder="Pilih laboratorium"
              emptyText="Belum ada laboratorium aktif di menu Kelola Lab"
              disabled={submitting}
              hasError={!!errors.ruang}
            />
            {errors.ruang && (
              <Text style={styles.errorText}>{errors.ruang}</Text>
            )}

            {/* Info Radius Presensi dari Lab Terpilih (Sesuai Desain) */}
            <Text style={styles.label}>Radius presensi</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>
                {selectedLabRecord
                  ? `${selectedLabRecord.radius} meter`
                  : "Mengikuti radius lokasi laboratorium"}
              </Text>
              <AppIcon name="location" size={17} color={COLORS.primary} />
            </View>

            {/* Catatan Kode Otomatis */}
            <View style={styles.noteRow}>
              <AppIcon
                name="file-text"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.noteText}>
                Kode sesi dibuat otomatis setelah sesi disimpan.
              </Text>
            </View>

            {/* Tombol Utama */}
            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && !submitting && styles.submitBtnPressed,
                submitting && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.textOnPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {mode === "create"
                    ? "Buat Sesi Praktikum"
                    : "Simpan Perubahan"}
                </Text>
              )}
            </Pressable>
          </ScrollView>

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
              display="default"
              onChange={handleDatePickerChange}
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 14,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 3,
    marginLeft: 28,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 36,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 11,
    marginBottom: 8,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.dangerDark,
    fontWeight: "500",
  },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  req: {
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
    minHeight: 46,
  },
  pickerField: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    minHeight: 46,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  pickerText: {
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  readonlyBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    minHeight: 46,
    backgroundColor: COLORS.surfaceSubtle,
  },
  readonlyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  inputError: {
    borderColor: COLORS.dangerText,
  },
  errorText: {
    color: COLORS.dangerText,
    fontSize: 11.5,
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: "700",
  },
});
