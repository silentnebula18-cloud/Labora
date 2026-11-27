import * as Location from "expo-location";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import BottomNavBar from "../../../components/BottomNavBar";
import InteractiveLabMap from "../../../components/InteractiveLabMap";
import LabDetailCard from "../../../components/LabDetailCard";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useSession } from "../../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeLaboratories,
} from "../../../services/laboratoryService";
import {
  calculateHaversineDistanceMeters,
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
        setSelectedLab(
          (prev) => prev ?? (activeLabs.length > 0 ? activeLabs[0] : null),
        );
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
            const nextLat = location.coords.latitude;
            const nextLng = location.coords.longitude;
            setUserCoords((prev) => {
              if (
                prev &&
                calculateHaversineDistanceMeters(
                  prev.latitude,
                  prev.longitude,
                  nextLat,
                  nextLng,
                ) < 3
              ) {
                return prev;
              }
              return { latitude: nextLat, longitude: nextLng };
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <AppIcon name="chevron-left" size={20} color={COLORS.textPrimary} />
        </Pressable>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Peta Laboratorium
          </Text>
          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Lokasi, radius validasi, dan jadwal aktif.
          </Text>
        </View>

        <Pressable
          style={styles.manageShortcutBtn}
          onPress={() => router.push("/asisten/laboratorium" as any)}
        >
          <Text style={styles.manageShortcutText}>Kelola</Text>
        </Pressable>
      </View>

      {gpsError && (
        <View style={styles.gpsWarningBanner}>
          <AppIcon name="alert" size={14} color={COLORS.warningText} />
          <Text style={styles.gpsWarningText}>{gpsError}</Text>
          <View style={styles.gpsWarningActions}>
            {gpsError.toLowerCase().includes("izin") ? (
              <Pressable
                onPress={() => void openLocationSettings()}
                hitSlop={8}
              >
                <Text style={styles.gpsActionText}>Pengaturan</Text>
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
              <Text style={styles.gpsRetryText}>Coba lagi</Text>
            </Pressable>
          </View>
        </View>
      )}

      {laboratories.length > 0 && (
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
                      {
                        backgroundColor: isSelected
                          ? COLORS.textOnPrimary
                          : COLORS.primary,
                      },
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
      )}

      <View style={styles.mapArea}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Memuat peta laboratorium…</Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorBox}>
            <AppIcon name="alert" size={24} color={COLORS.dangerText} />
            <Text style={styles.errorTitle}>Gagal memuat peta</Text>
            <Text style={styles.errorDesc}>{loadError}</Text>
          </View>
        ) : (
          <InteractiveLabMap
            laboratories={laboratories}
            selectedLab={selectedLab}
            onSelectLab={(lab) => setSelectedLab(lab)}
            onMapPress={() => setSelectedLab(null)}
            userCoords={userCoords}
            onRefreshLocation={refreshCurrentLocation}
            refreshingLocation={refreshingLocation}
          />
        )}
      </View>

      {selectedLab && (
        <LabDetailCard
          laboratory={selectedLab}
          userCoords={userCoords}
          sessions={sessions}
          onClose={() => setSelectedLab(null)}
          onManageLab={() => router.push("/asisten/laboratorium" as any)}
        />
      )}

      <BottomNavBar role="asisten" activeTab="beranda" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 10,
  },
  backBtn: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  manageShortcutBtn: {
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
  },
  manageShortcutText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  gpsWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.warningBg,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.warningBorder,
    gap: 8,
  },
  gpsWarningText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.warningText,
  },
  gpsWarningActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  gpsActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.warningText,
  },
  gpsRetryText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  labPillsWrapper: {
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  labPillsScroll: {
    paddingHorizontal: 18,
    gap: 8,
  },
  labPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
  },
  labPillSelected: {
    backgroundColor: COLORS.primary,
  },
  labPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  labPillTextSelected: {
    color: COLORS.textOnPrimary,
  },
  mapArea: {
    flex: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  errorTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.dangerText,
  },
  errorDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
