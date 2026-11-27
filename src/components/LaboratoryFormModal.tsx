import * as Location from "expo-location";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { COLORS, RADIUS } from "../constants/theme";
import {
  LABORATORY_LIMITS,
  validateLaboratoryDraft,
  type LaboratoryFieldErrors,
  type LaboratoryInput,
} from "../services/laboratoryService";
import {
  openLocationSettings,
  promptEnableLocationServices,
} from "../services/locationService";
import AppIcon from "./AppIcon";

interface LaboratoryFormModalProps {
  visible: boolean;
  mode: "create" | "edit";
  initialValues?: LaboratoryInput | null;
  submitting?: boolean;
  error?: string | null;
  onSubmit: (values: LaboratoryInput) => void;
  onClose: () => void;
}

interface FormInnerProps {
  mode: "create" | "edit";
  initialValues?: LaboratoryInput | null;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: LaboratoryInput) => void;
  onClose: () => void;
}

function LaboratoryFormInner({
  mode,
  initialValues,
  submitting,
  error,
  onSubmit,
  onClose,
}: FormInnerProps) {
  const [nama, setNama] = useState(initialValues?.nama ?? "");
  const [deskripsi, setDeskripsi] = useState(initialValues?.deskripsi ?? "");
  const [alamat, setAlamat] = useState(initialValues?.alamat ?? "");
  const [latitude, setLatitude] = useState(
    initialValues && Number.isFinite(initialValues.latitude)
      ? String(initialValues.latitude)
      : "",
  );
  const [longitude, setLongitude] = useState(
    initialValues && Number.isFinite(initialValues.longitude)
      ? String(initialValues.longitude)
      : "",
  );
  const [radius, setRadius] = useState(
    initialValues && Number.isFinite(initialValues.radius)
      ? String(initialValues.radius)
      : "50",
  );
  const [aktif, setAktif] = useState(initialValues?.aktif !== false);

  const [errors, setErrors] = useState<LaboratoryFieldErrors>({});
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  async function handleGetCurrentLocation() {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setGpsError("Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan.");
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setGpsError("GPS perangkat tidak aktif. Mohon nyalakan GPS.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(String(position.coords.latitude));
      setLongitude(String(position.coords.longitude));
      setErrors((prev) => ({
        ...prev,
        latitude: undefined,
        longitude: undefined,
      }));
    } catch {
      setGpsError("Gagal mendapatkan koordinat GPS perangkat.");
    } finally {
      setGpsLoading(false);
    }
  }

  function handleSubmit() {
    if (submitting) return;

    const validation = validateLaboratoryDraft({
      nama,
      deskripsi,
      alamat,
      latitude,
      longitude,
      radius,
      aktif,
    });

    if (!validation.valid || !validation.input) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    onSubmit(validation.input);
  }

  return (
    <View style={styles.card} accessibilityViewIsModal>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {mode === "create" ? "Tambah Laboratorium" : "Ubah Laboratorium"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "create"
            ? "Daftarkan laboratorium dan batas radius presensi."
            : "Perbarui koordinat, radius, atau informasi laboratorium."}
        </Text>

        {error && (
          <View style={styles.bannerError}>
            <AppIcon name="alert" size={16} color={COLORS.dangerText} />
            <Text style={styles.bannerErrorText}>{error}</Text>
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Nama laboratorium <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.nama && styles.inputError]}
            value={nama}
            onChangeText={(text) => {
              setNama(text);
              setErrors((prev) => ({ ...prev, nama: undefined }));
            }}
            placeholder="Contoh: Laboratorium Komputer B"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            maxLength={LABORATORY_LIMITS.namaMax}
            editable={!submitting}
          />
          {errors.nama ? (
            <Text style={styles.errorText}>{errors.nama}</Text>
          ) : (
            <Text style={styles.hintText}>
              Sesuaikan dengan nama laboratorium pada jadwal praktikum.
            </Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Alamat / gedung <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.alamat && styles.inputError]}
            value={alamat}
            onChangeText={(text) => {
              setAlamat(text);
              setErrors((prev) => ({ ...prev, alamat: undefined }));
            }}
            placeholder="Contoh: Gedung Laboratorium Terpadu Lt. 3"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            maxLength={LABORATORY_LIMITS.alamatMax}
            editable={!submitting}
          />
          {errors.alamat && (
            <Text style={styles.errorText}>{errors.alamat}</Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Deskripsi (opsional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={deskripsi}
            onChangeText={setDeskripsi}
            placeholder="Fasilitas atau petunjuk menuju laboratorium..."
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            multiline
            numberOfLines={3}
            maxLength={LABORATORY_LIMITS.deskripsiMax}
            editable={!submitting}
          />
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.labelWithAction}>
            <Text style={styles.label}>
              Koordinat titik pusat <Text style={styles.req}>*</Text>
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.gpsBtn,
                pressed && { opacity: 0.85 },
                gpsLoading && { opacity: 0.6 },
              ]}
              onPress={handleGetCurrentLocation}
              disabled={gpsLoading || submitting}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <AppIcon name="location" size={14} color={COLORS.primary} />
                  <Text style={styles.gpsBtnText}>Ambil GPS saat ini</Text>
                </>
              )}
            </Pressable>
          </View>

          {gpsError && (
            <View style={styles.gpsErrorBox}>
              <Text style={styles.gpsErrorText}>{gpsError}</Text>
              <View style={styles.gpsErrorActionRow}>
                {gpsError.toLowerCase().includes("izin") ? (
                  <Pressable
                    style={styles.gpsErrorActionBtn}
                    onPress={openLocationSettings}
                    hitSlop={6}
                  >
                    <Text style={styles.gpsErrorActionText}>
                      Buka Pengaturan
                    </Text>
                  </Pressable>
                ) : gpsError.toLowerCase().includes("aktif") ? (
                  <Pressable
                    style={styles.gpsErrorActionBtn}
                    onPress={async () => {
                      const on = await promptEnableLocationServices();
                      if (on) void handleGetCurrentLocation();
                    }}
                    hitSlop={6}
                  >
                    <Text style={styles.gpsErrorActionText}>Nyalakan GPS</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.gpsErrorActionBtnSecondary}
                  onPress={handleGetCurrentLocation}
                  hitSlop={6}
                >
                  <Text style={styles.gpsErrorActionTextSecondary}>
                    Coba lagi
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <View style={styles.coordRow}>
            <View style={styles.coordCol}>
              <Text style={styles.subLabel}>Latitude</Text>
              <TextInput
                style={[styles.input, errors.latitude && styles.inputError]}
                value={latitude}
                onChangeText={(text) => {
                  setLatitude(text);
                  setErrors((prev) => ({ ...prev, latitude: undefined }));
                }}
                placeholder="-7.0512"
                placeholderTextColor={COLORS.textMuted}
                selectionColor={COLORS.primary}
                keyboardType="numeric"
                editable={!submitting}
              />
              {errors.latitude && (
                <Text style={styles.errorText}>{errors.latitude}</Text>
              )}
            </View>

            <View style={styles.coordCol}>
              <Text style={styles.subLabel}>Longitude</Text>
              <TextInput
                style={[styles.input, errors.longitude && styles.inputError]}
                value={longitude}
                onChangeText={(text) => {
                  setLongitude(text);
                  setErrors((prev) => ({ ...prev, longitude: undefined }));
                }}
                placeholder="110.4401"
                placeholderTextColor={COLORS.textMuted}
                selectionColor={COLORS.primary}
                keyboardType="numeric"
                editable={!submitting}
              />
              {errors.longitude && (
                <Text style={styles.errorText}>{errors.longitude}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Radius presensi (meter) <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.radius && styles.inputError]}
            value={radius}
            onChangeText={(text) => {
              setRadius(text);
              setErrors((prev) => ({ ...prev, radius: undefined }));
            }}
            placeholder="50"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
            keyboardType="numeric"
            editable={!submitting}
          />
          {errors.radius ? (
            <Text style={styles.errorText}>{errors.radius}</Text>
          ) : (
            <Text style={styles.hintText}>
              Batas jarak maksimal dari titik pusat lab (5 – 10.000 meter).
            </Text>
          )}
        </View>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Laboratorium aktif</Text>
            <Text style={styles.hintText}>
              Laboratorium aktif dapat dipilih untuk jadwal dan presensi.
            </Text>
          </View>
          <Switch
            value={aktif}
            onValueChange={setAktif}
            trackColor={{ false: COLORS.borderStrong, true: COLORS.primaryBorder }}
            thumbColor={aktif ? COLORS.primary : COLORS.background}
            disabled={submitting}
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.btn, styles.cancelBtn]}
            onPress={onClose}
            disabled={submitting}
          >
            <Text style={styles.cancelBtnText}>Batal</Text>
          </Pressable>

          <Pressable
            style={[
              styles.btn,
              styles.submitBtn,
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === "create" ? "Simpan Lab" : "Simpan"}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default function LaboratoryFormModal({
  visible,
  mode,
  initialValues,
  submitting = false,
  error,
  onSubmit,
  onClose,
}: LaboratoryFormModalProps) {
  if (!visible) return null;

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
          accessibilityLabel="Tutup form laboratorium"
        />

        <LaboratoryFormInner
          key={
            initialValues
              ? `${initialValues.nama}-${initialValues.latitude}`
              : "new"
          }
          mode={mode}
          initialValues={initialValues}
          submitting={submitting}
          error={error}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 22,
    maxHeight: "90%",
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
    marginTop: 3,
    marginBottom: 14,
    lineHeight: 18,
  },
  bannerError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 11,
    marginBottom: 12,
    gap: 8,
  },
  bannerErrorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.dangerDark,
    fontWeight: "500",
  },
  fieldGroup: {
    marginBottom: 13,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  req: {
    color: COLORS.dangerText,
    fontWeight: "700",
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13.5,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: COLORS.dangerText,
  },
  errorText: {
    fontSize: 11.5,
    color: COLORS.dangerText,
    marginTop: 4,
  },
  hintText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  labelWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 5,
  },
  gpsBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  gpsErrorBox: {
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.md,
    padding: 11,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
  },
  gpsErrorText: {
    fontSize: 12,
    color: COLORS.dangerDark,
    marginBottom: 7,
  },
  gpsErrorActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gpsErrorActionBtn: {
    backgroundColor: COLORS.dangerText,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
  },
  gpsErrorActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  gpsErrorActionBtnSecondary: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gpsErrorActionTextSecondary: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  coordRow: {
    flexDirection: "row",
    gap: 10,
  },
  coordCol: {
    flex: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceSubtle,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
