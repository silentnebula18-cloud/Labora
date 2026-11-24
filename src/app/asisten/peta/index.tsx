import * as Location from "expo-location";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
import InteractiveLabMap from "../../../components/InteractiveLabMap";
import LabDetailCard from "../../../components/LabDetailCard";
import { useSession } from "../../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeLaboratories,
} from "../../../services/laboratoryService";
import {
  openLocationSettings,
  promptEnableLocationServices,
  type Coordinates,
} from "../../../services/locationService";
import type { Laboratory } from "../../../types";

export default function AsistenPetaScreen() {
  const { sessions } = useSession();

  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [refreshingLocation, setRefreshingLocation] = useState(false);

  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  // 1. Langganan Realtime Koleksi Laboratorium
  useEffect(() => {
    const unsubscribe = subscribeLaboratories(
      (items) => {
        const activeLabs = items.filter(
          (lab) =>
            lab.aktif !== false &&
            Number.isFinite(lab.latitude) &&
            Number.isFinite(lab.longitude),
        );
        setLaboratories(activeLabs);
        setSelectedLab((prev) => prev ?? (activeLabs.length > 0 ? activeLabs[0] : null));
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        setLoadError(describeFirestoreError(error));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  // 2. Pemantauan Real-time Posisi Pengguna (SRS-016 & SRS-018)
  async function refreshCurrentLocation() {
    setRefreshingLocation(true);
    setGpsError(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setGpsError("Izin akses lokasi ditolak oleh pengguna");
        return;
      }
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setGpsError("GPS perangkat tidak aktif. Mohon aktifkan GPS");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserCoords({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch {
      setGpsError("Gagal mendapatkan lokasi GPS perangkat");
    } finally {
      setRefreshingLocation(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function initTracking() {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!isMounted) return;
        if (perm.status !== "granted") {
          setGpsError("Izin akses lokasi ditolak oleh pengguna");
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!isMounted) return;
        if (!servicesEnabled) {
          setGpsError("GPS perangkat tidak aktif. Mohon aktifkan GPS");
          return;
        }

        const initialPos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!isMounted) return;
        setUserCoords({
          latitude: initialPos.coords.latitude,
          longitude: initialPos.coords.longitude,
        });

        if (locationSubRef.current) {
          locationSubRef.current.remove();
          locationSubRef.current = null;
        }

        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (location) => {
            if (!isMounted) return;
            setUserCoords({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            setGpsError(null);
          },
        );

        locationSubRef.current = sub;
      } catch {
        if (isMounted) {
          setGpsError("Gagal mendapatkan lokasi GPS perangkat");
        }
      }
    }

    initTracking();

    return () => {
      isMounted = false;
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityLabel="Kembali ke beranda"
        >
          <AppIcon name="chevron-left" size={18} color="#2563eb" />
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Peta Laboratorium</Text>
          <Text style={styles.headerSubtitle}>
            Lokasi, radius validasi & jadwal aktif
          </Text>
        </View>

        <Pressable
          style={styles.manageShortcutBtn}
          onPress={() => router.push("/asisten/laboratorium" as any)}
          accessibilityLabel="Buka kelola laboratorium"
        >
          <Text style={styles.manageShortcutText}>Kelola</Text>
        </Pressable>
      </View>

      {/* Banner GPS Error jika terjadi masalah izin/GPS */}
      {gpsError && (
        <View style={styles.gpsWarningBanner}>
          <AppIcon name="alert" size={14} color="#b45309" />
          <Text style={styles.gpsWarningText}>{gpsError}</Text>
          <View style={styles.gpsWarningActions}>
            {gpsError.toLowerCase().includes("izin") ? (
              <Pressable
                onPress={() => void openLocationSettings()}
                hitSlop={8}
              >
                <Text style={styles.gpsActionText}>Buka Pengaturan</Text>
              </Pressable>
            ) : gpsError.toLowerCase().includes("aktif") ? (
              <Pressable
                onPress={async () => {
                  const on = await promptEnableLocationServices();
                  if (on) void refreshCurrentLocation();
                }}
                hitSlop={8}
              >
                <Text style={styles.gpsActionText}>Nyalakan GPS</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={refreshCurrentLocation} hitSlop={8}>
              <Text style={styles.gpsRetryText}>Coba Lagi</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Horizontal Lab Picker Pills */}
      <View style={styles.labPillsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.labPillsScroll}
        >
          {laboratories.map((lab) => {
            const isSelected = selectedLab?.id === lab.id;
            return (
              <Pressable
                key={lab.id}
                style={[
                  styles.labPill,
                  isSelected && styles.labPillSelected,
                ]}
                onPress={() => setSelectedLab(lab)}
              >
                <View
                  style={[
                    styles.labPillDot,
                    { backgroundColor: isSelected ? "#ffffff" : "#2563eb" },
                  ]}
                />
                <Text
                  style={[
                    styles.labPillText,
                    isSelected && styles.labPillTextSelected,
                  ]}
                >
                  {lab.nama}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Area Peta Interaktif */}
      <View style={styles.mapArea}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Memuat peta & laboratorium…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorBox}>
            <AppIcon name="alert" size={24} color="#dc2626" />
            <Text style={styles.errorTitle}>Gagal Memuat Peta</Text>
            <Text style={styles.errorDesc}>{loadError}</Text>
          </View>
        ) : (
          <InteractiveLabMap
            laboratories={laboratories}
            selectedLab={selectedLab}
            onSelectLab={(lab) => setSelectedLab(lab)}
            userCoords={userCoords}
            onRefreshLocation={refreshCurrentLocation}
            refreshingLocation={refreshingLocation}
          />
        )}
      </View>

      {/* Bottom Sheet Detail Laboratorium & Aktivitas Ongoing/Upcoming */}
      {selectedLab && (
        <LabDetailCard
          laboratory={selectedLab}
          userCoords={userCoords}
          sessions={sessions}
          onClose={() => setSelectedLab(null)}
          onManageLab={() => router.push("/asisten/laboratorium" as any)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#ffffff",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563eb",
  },
  titleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: "#64748b",
  },
  manageShortcutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  manageShortcutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },
  gpsWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#fef3c7",
    gap: 8,
  },
  gpsWarningText: {
    flex: 1,
    fontSize: 11,
    color: "#92400e",
  },
  gpsWarningActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gpsActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#b45309",
    textDecorationLine: "underline",
  },
  gpsRetryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },
  labPillsWrapper: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingVertical: 8,
  },
  labPillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  labPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  labPillSelected: {
    backgroundColor: "#2563eb",
  },
  labPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  labPillTextSelected: {
    color: "#ffffff",
  },
  mapArea: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
  },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
  },
  errorDesc: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
