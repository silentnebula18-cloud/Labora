import React, { useEffect, useRef } from "react";
import Constants from "expo-constants";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

import AppIcon from "./AppIcon";
import { calculateHaversineDistanceMeters, type Coordinates } from "../services/locationService";
import type { Laboratory } from "../types";

interface InteractiveLabMapProps {
  laboratories: Laboratory[];
  selectedLab: Laboratory | null;
  onSelectLab: (lab: Laboratory) => void;
  userCoords: Coordinates | null;
  onRefreshLocation: () => void;
  refreshingLocation?: boolean;
}

export default function InteractiveLabMap({
  laboratories,
  selectedLab,
  onSelectLab,
  userCoords,
  onRefreshLocation,
  refreshingLocation = false,
}: InteractiveLabMapProps) {
  const mapRef = useRef<any>(null);

  // Default coordinate (Surabaya / ITS / UNESA area jika belum ada data)
  const defaultCenter = {
    latitude: -7.2575,
    longitude: 112.7521,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
  };

  const initialRegion = selectedLab
    ? {
        latitude: selectedLab.latitude,
        longitude: selectedLab.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : userCoords
      ? {
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }
      : laboratories.length > 0 && Number.isFinite(laboratories[0].latitude)
        ? {
            latitude: laboratories[0].latitude,
            longitude: laboratories[0].longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }
        : defaultCenter;

  useEffect(() => {
    if (selectedLab && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: selectedLab.latitude,
          longitude: selectedLab.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        500,
      );
    }
  }, [selectedLab]);

  function centerOnUser() {
    if (userCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        500,
      );
    } else {
      onRefreshLocation();
    }
  }

  // ─── Cek Dukungan Native Map & API Key ─────────────────────────────────────────
  // Pada Android, react-native-maps membutuhkan Google Maps API Key.
  // Jika belum dikonfigurasi, kita otomatis beralih ke Mode Radar Spatial agar
  // aplikasi TIDAK CRASH dan pengguna TIDAK PERLU upgrade ke Google Cloud berbayar.
  const hasAndroidGoogleMapsKey = Boolean(
    Constants.expoConfig?.android?.config?.googleMaps?.apiKey ||
    (Constants as any).manifest2?.extra?.expoClient?.android?.config?.googleMaps?.apiKey ||
    (Constants as any).manifest?.android?.config?.googleMaps?.apiKey
  );

  const canMountNativeMap =
    Platform.OS === "ios" || (Platform.OS === "android" && hasAndroidGoogleMapsKey);

  if (!canMountNativeMap) {
    return (
      <View style={styles.webContainer}>
        <View style={styles.webNoticeBox}>
          <AppIcon name="location" size={20} color="#41337A" />
          <View style={{ flex: 1 }}>
            <Text style={styles.webNoticeTitle}>
              Radar Lokasi Laboratorium (Bebas Biaya)
            </Text>
            <Text style={styles.webNoticeDesc}>
              {Platform.OS === "android"
                ? "Berjalan dalam mode mandiri tanpa perlu Google Maps API Key atau upgrade akun berbayar. Kalkulasi jarak GPS, radius presensi, dan aktivitas lab berfungsi 100%."
                : "Mode peta interaktif berjalan dalam tampilan spatial list pada web."}
            </Text>
          </View>
        </View>

        {userCoords && (
          <View style={styles.webUserLocationCard}>
            <View style={styles.userPulseDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.webUserLabel}>Posisi Anda Saat Ini</Text>
              <Text style={styles.webUserCoords}>
                {userCoords.latitude.toFixed(6)}, {userCoords.longitude.toFixed(6)}
              </Text>
            </View>
            <Pressable
              style={styles.webRefreshBtn}
              onPress={onRefreshLocation}
              disabled={refreshingLocation}
            >
              {refreshingLocation ? (
                <ActivityIndicator size="small" color="#41337A" />
              ) : (
                <Text style={styles.webRefreshBtnText}>Perbarui</Text>
              )}
            </Pressable>
          </View>
        )}

        <ScrollView
          style={styles.webList}
          contentContainerStyle={styles.webListContent}
        >
          {laboratories.map((lab) => {
            const isSelected = selectedLab?.id === lab.id;
            let dist: number | null = null;
            if (userCoords) {
              dist = calculateHaversineDistanceMeters(
                userCoords.latitude,
                userCoords.longitude,
                lab.latitude,
                lab.longitude,
              );
            }

            return (
              <Pressable
                key={lab.id}
                style={[
                  styles.webLabItem,
                  isSelected && styles.webLabItemSelected,
                ]}
                onPress={() => onSelectLab(lab)}
              >
                <View style={styles.webLabHeader}>
                  <Text style={styles.webLabName}>{lab.nama}</Text>
                  {dist !== null && (
                    <View
                      style={[
                        styles.webDistBadge,
                        dist <= lab.radius
                          ? styles.webDistInside
                          : styles.webDistOutside,
                      ]}
                    >
                      <Text
                        style={[
                          styles.webDistText,
                          { color: dist <= lab.radius ? "#15803d" : "#b45309" },
                        ]}
                      >
                        {dist} m • {dist <= lab.radius ? "Dalam Radius" : "Di Luar"}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.webLabAlamat}>{lab.alamat}</Text>
                <View style={styles.webLabFooter}>
                  <Text style={styles.webLabRadius}>
                    Radius Presensi: {lab.radius} m
                  </Text>
                  <Text style={styles.webLabCoords}>
                    {lab.latitude.toFixed(4)}, {lab.longitude.toFixed(4)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ─── Tampilan Map Native (Android / iOS) ──────────────────────────────────────
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={true}
        showsMyLocationButton={false}
      >
        {/* Lingkaran Visualisasi Radius Presensi Tiap Lab (SRS-015 & SRS-016) */}
        {laboratories.map((lab) => {
          const isSelected = selectedLab?.id === lab.id;
          return (
            <Circle
              key={`circle-${lab.id}`}
              center={{ latitude: lab.latitude, longitude: lab.longitude }}
              radius={lab.radius}
              fillColor={
                isSelected
                  ? "rgba(65, 51, 122, 0.22)"
                  : "rgba(65, 51, 122, 0.10)"
              }
              strokeColor={isSelected ? "#41337A" : "rgba(65, 51, 122, 0.45)"}
              strokeWidth={isSelected ? 2 : 1}
            />
          );
        })}

        {/* Marker Laboratorium */}
        {laboratories.map((lab) => {
          const isSelected = selectedLab?.id === lab.id;
          return (
            <Marker
              key={`marker-${lab.id}`}
              coordinate={{
                latitude: lab.latitude,
                longitude: lab.longitude,
              }}
              title={lab.nama}
              description={`${lab.alamat} (Radius ${lab.radius}m)`}
              onPress={() => onSelectLab(lab)}
            >
              <View
                style={[
                  styles.markerContainer,
                  isSelected && styles.markerContainerSelected,
                ]}
              >
                <View
                  style={[
                    styles.markerIconBox,
                    isSelected && styles.markerIconBoxSelected,
                  ]}
                >
                  <AppIcon
                    name="location"
                    size={16}
                    color={isSelected ? "#ffffff" : "#41337A"}
                  />
                </View>
                <View
                  style={[
                    styles.markerCalloutPill,
                    isSelected && styles.markerCalloutPillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.markerTitle,
                      isSelected && styles.markerTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {lab.nama}
                  </Text>
                </View>
              </View>
            </Marker>
          );
        })}

        {/* Marker Posisi Pengguna (SRS-016) */}
        {userCoords && (
          <Marker
            coordinate={{
              latitude: userCoords.latitude,
              longitude: userCoords.longitude,
            }}
            title="Lokasi Anda"
            description="Posisi perangkat saat ini"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerPulseOuter}>
              <View style={styles.userMarkerPulseInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Kontrol Floating Tombol Peta */}
      <View style={styles.mapControls}>
        <Pressable
          style={({ pressed }) => [
            styles.controlBtn,
            pressed && styles.controlBtnPressed,
          ]}
          onPress={centerOnUser}
          accessibilityLabel="Pusatkan ke lokasi saya"
        >
          {refreshingLocation ? (
            <ActivityIndicator size="small" color="#41337A" />
          ) : (
            <AppIcon name="location" size={20} color="#41337A" />
          )}
        </Pressable>

        {selectedLab && (
          <Pressable
            style={({ pressed }) => [
              styles.controlBtn,
              pressed && styles.controlBtnPressed,
            ]}
            onPress={() => {
              if (selectedLab && mapRef.current) {
                mapRef.current.animateToRegion({
                  latitude: selectedLab.latitude,
                  longitude: selectedLab.longitude,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                });
              }
            }}
            accessibilityLabel="Pusatkan ke laboratorium terpilih"
          >
            <AppIcon name="search" size={18} color="#41337A" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#C2EFEB",
  },
  markerContainer: {
    alignItems: "center",
  },
  markerContainerSelected: {
    transform: [{ scale: 1.12 }],
  },
  markerIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#41337A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#331E36",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  markerIconBoxSelected: {
    backgroundColor: "#41337A",
    borderColor: "#ffffff",
  },
  markerCalloutPill: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    maxWidth: 120,
  },
  markerCalloutPillSelected: {
    backgroundColor: "#41337A",
    borderColor: "#41337A",
  },
  markerTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#331E36",

  },
  markerTitleSelected: {
    color: "#ffffff",
  },
  userMarkerPulseOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(65, 51, 122, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  userMarkerPulseInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#41337A",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  mapControls: {
    position: "absolute",
    right: 16,
    top: 16,
    gap: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#331E36",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  controlBtnPressed: {
    backgroundColor: "#ECFEE8",
  },

  // Web Styles
  webContainer: {
    flex: 1,
    backgroundColor: "#ECFEE8",
    padding: 16,
  },
  webNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#C2EFEB",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#6EA4BF",
    gap: 10,
    marginBottom: 14,
  },
  webNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#41337A",

  },
  webNoticeDesc: {
    fontSize: 11.5,
    color: "#41337A",
    marginTop: 2,
    lineHeight: 16,

  },
  webUserLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    marginBottom: 14,
    gap: 10,
  },
  userPulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#41337A",
  },
  webUserLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6EA4BF",

  },
  webUserCoords: {
    fontSize: 13,
    fontWeight: "600",
    color: "#331E36",

  },
  webRefreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#C2EFEB",
    borderRadius: 8,
  },
  webRefreshBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#41337A",

  },
  webList: {
    flex: 1,
  },
  webListContent: {
    gap: 10,
  },
  webLabItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#C2EFEB",
  },
  webLabItemSelected: {
    borderColor: "#41337A",
    backgroundColor: "#ECFEE8",
  },
  webLabHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  webLabName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#331E36",

  },
  webDistBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  webDistInside: {
    backgroundColor: "#f0fdf4",
  },
  webDistOutside: {
    backgroundColor: "#fffbeb",
  },
  webDistText: {
    fontSize: 10,
    fontWeight: "700",

  },
  webLabAlamat: {
    fontSize: 12,
    color: "#6EA4BF",
    marginBottom: 8,

  },
  webLabFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#ECFEE8",
  },
  webLabRadius: {
    fontSize: 11,
    fontWeight: "600",
    color: "#41337A",

  },
  webLabCoords: {
    fontSize: 10.5,
    color: "#6EA4BF",

  },
});
