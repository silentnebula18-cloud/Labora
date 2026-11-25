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

import AppIcon from "./AppIcon";
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
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <AppIcon name="location" size={22} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              {mode === "create"
                ? "Tambah Laboratorium"
                : "Ubah Laboratorium"}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "create"
                ? "Daftarkan laboratorium dan batas radius presensi (SRS-015)."
                : "Perbarui koordinat, radius, atau informasi laboratorium."}
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.bannerError}>
            <AppIcon name="alert" size={16} color="#b91c1c" />
            <Text style={styles.bannerErrorText}>{error}</Text>
          </View>
        )}

        {/* Nama Laboratorium */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Nama Laboratorium / Ruang <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.nama && styles.inputError]}
            value={nama}
            onChangeText={(text) => {
              setNama(text);
              setErrors((prev) => ({ ...prev, nama: undefined }));
            }}
            placeholder="Contoh: Laboratorium Komputer B"
            placeholderTextColor="#94a3b8"
            maxLength={LABORATORY_LIMITS.namaMax}
            editable={!submitting}
          />
          {errors.nama ? (
            <Text style={styles.errorText}>{errors.nama}</Text>
          ) : (
            <Text style={styles.hintText}>
              Cocokkan dengan nama ruang pada jadwal agar presensi GPS otomatis
              terhubung.
            </Text>
          )}
        </View>

        {/* Alamat / Lokasi Gedung */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Alamat / Lokasi Gedung <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.alamat && styles.inputError]}
            value={alamat}
            onChangeText={(text) => {
              setAlamat(text);
              setErrors((prev) => ({ ...prev, alamat: undefined }));
            }}
            placeholder="Contoh: Gedung Laboratorium Terpadu Lt. 3"
            placeholderTextColor="#94a3b8"
            maxLength={LABORATORY_LIMITS.alamatMax}
            editable={!submitting}
          />
          {errors.alamat && (
            <Text style={styles.errorText}>{errors.alamat}</Text>
          )}
        </View>

        {/* Deskripsi */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Deskripsi (Opsional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={deskripsi}
            onChangeText={setDeskripsi}
            placeholder="Fasilitas, spesifikasi PC, atau petunjuk menuju lab..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            maxLength={LABORATORY_LIMITS.deskripsiMax}
            editable={!submitting}
          />
        </View>

        {/* Koordinat GPS & Bantuan Lokasi Saat Ini */}
        <View style={styles.fieldGroup}>
          <View style={styles.labelWithAction}>
            <Text style={styles.label}>
              Koordinat Titik Pusat <Text style={styles.req}>*</Text>
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.gpsBtn,
                pressed && styles.gpsBtnPressed,
                gpsLoading && styles.gpsBtnDisabled,
              ]}
              onPress={handleGetCurrentLocation}
              disabled={gpsLoading || submitting}
            >
              {gpsLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <>
                  <AppIcon name="location" size={14} color="#2563eb" />
                  <Text style={styles.gpsBtnText}>Ambil GPS Saat Ini</Text>
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
                    <Text style={styles.gpsErrorActionText}>Buka Pengaturan</Text>
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
                  <Text style={styles.gpsErrorActionTextSecondary}>Coba Lagi</Text>
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
                placeholder="-7.2575"
                placeholderTextColor="#94a3b8"
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
                placeholder="112.7521"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                editable={!submitting}
              />
              {errors.longitude && (
                <Text style={styles.errorText}>{errors.longitude}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Radius Validasi Presensi (Meter) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Radius Presensi (Meter) <Text style={styles.req}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.radius && styles.inputError]}
            value={radius}
            onChangeText={(text) => {
              setRadius(text);
              setErrors((prev) => ({ ...prev, radius: undefined }));
            }}
            placeholder="50"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            editable={!submitting}
          />
          {errors.radius ? (
            <Text style={styles.errorText}>{errors.radius}</Text>
          ) : (
            <Text style={styles.hintText}>
              Batas jarak maksimal praktikan dari titik pusat lab saat melakukan
              presensi (5 - 10.000 meter).
            </Text>
          )}
        </View>

        {/* Status Aktif */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Status Laboratorium Aktif</Text>
            <Text style={styles.hintText}>
              Laboratorium aktif dapat digunakan untuk jadwal dan validasi
              presensi.
            </Text>
          </View>
          <Switch
            value={aktif}
            onValueChange={setAktif}
            trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
            thumbColor={aktif ? "#2563eb" : "#f1f5f9"}
            disabled={submitting}
          />
        </View>

        {/* Tombol Aksi */}
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
              submitting && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === "create" ? "Simpan Laboratorium" : "Simpan Perubahan"}
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
          key={initialValues ? `${initialValues.nama}-${initialValues.latitude}` : "new"}
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
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
    maxHeight: "90%",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 16,
  },
  bannerError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  bannerErrorText: {
    flex: 1,
    fontSize: 12,
    color: "#b91c1c",
    fontWeight: "500",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 4,
  },
  req: {
    color: "#dc2626",
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fff5f5",
  },
  errorText: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 4,
  },
  hintText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 15,
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
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  gpsBtnPressed: {
    backgroundColor: "#dbeafe",
  },
  gpsBtnDisabled: {
    opacity: 0.6,
  },
  gpsBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563eb",
  },
  gpsErrorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  gpsErrorText: {
    fontSize: 11,
    color: "#dc2626",
    marginBottom: 6,
  },
  gpsErrorActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gpsErrorActionBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gpsErrorActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  gpsErrorActionBtnSecondary: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gpsErrorActionTextSecondary: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
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
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  submitBtn: {
    backgroundColor: "#2563eb",
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
});
