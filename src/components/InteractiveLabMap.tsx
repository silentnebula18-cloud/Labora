import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { COLORS, RADIUS } from "../constants/theme";
import {
  calculateHaversineDistanceMeters,
  type Coordinates,
} from "../services/locationService";
import { fetchWalkingRoute, type RouteResult } from "../services/routeService";
import type { Laboratory } from "../types";
import AppIcon from "./AppIcon";

const SafeWebView = WebView as unknown as React.ComponentType<any>;

interface InteractiveLabMapProps {
  laboratories: Laboratory[];
  selectedLab: Laboratory | null;
  onSelectLab: (lab: Laboratory) => void;
  onMapPress?: () => void;
  userCoords: Coordinates | null;
  onRefreshLocation: () => void;
  refreshingLocation?: boolean;
}

function buildLeafletHtml(
  labs: Laboratory[],
  selectedId: string | null,
  userCoords: Coordinates | null,
): string {
  const defaultLat =
    selectedId && labs.find((l) => l.id === selectedId)
      ? labs.find((l) => l.id === selectedId)!.latitude
      : userCoords
        ? userCoords.latitude
        : labs[0]?.latitude ?? -7.0512;
  const defaultLng =
    selectedId && labs.find((l) => l.id === selectedId)
      ? labs.find((l) => l.id === selectedId)!.longitude
      : userCoords
        ? userCoords.longitude
        : labs[0]?.longitude ?? 110.4401;

  const serializedLabs = JSON.stringify(
    labs.map((l) => ({
      id: l.id,
      nama: l.nama,
      alamat: l.alamat,
      latitude: l.latitude,
      longitude: l.longitude,
      radius: l.radius,
    })),
  );
  const serializedUser = JSON.stringify(userCoords);
  const serializedSelected = JSON.stringify(selectedId);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css"
    onerror="this.onerror=null;this.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';"
  />
  <style>
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #E8EEF2;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .lab-pin {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FFFFFF;
      color: #111827;
      border: 1.5px solid #0E6F5C;
      border-radius: 999px;
      padding: 5px 11px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 3px 10px rgba(15, 23, 42, 0.16);
      transform: translate(-50%, -50%);
    }
    .lab-pin.active {
      background: #0E6F5C;
      color: #FFFFFF;
      border-color: #0E6F5C;
    }
    .lab-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #0E6F5C;
    }
    .lab-pin.active .lab-dot {
      background: #FFFFFF;
    }
    .user-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #2563EB;
      border: 3px solid #FFFFFF;
      box-shadow: 0 0 0 7px rgba(37, 99, 235, 0.24);
    }
    .leaflet-container {
      background: #E8EEF2;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function loadLeafletScript(url, fallbackUrl, onReady) {
      var script = document.createElement('script');
      script.src = url;
      script.onload = onReady;
      script.onerror = function() {
        if (fallbackUrl) {
          loadLeafletScript(fallbackUrl, null, onReady);
        }
      };
      document.body.appendChild(script);
    }

    function initMap() {
      if (typeof L === 'undefined') return;

      var map = L.map('map', {
        zoomControl: false,
        attributionControl: false
      }).setView([${defaultLat}, ${defaultLng}], 17);

      // Provider waterfall 100% tanpa API Key & tanpa watermark:
      // OpenStreetMap Standard -> Esri World Street Map -> OSM DE Mirror
      // (CARTO dihapus karena kini mewajibkan API key dan menampilkan watermark "API KEY REQUIRED")
      var TILE_PROVIDERS = [
        {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          options: {
            maxZoom: 19,
            referrerPolicy: 'strict-origin-when-cross-origin'
          }
        },
        {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
          options: { maxZoom: 19 }
        },
        {
          url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
          options: { maxZoom: 18 }
        }
      ];

      var tileIdx = 0;
      var activeTileLayer = null;
      var tileErrorCount = 0;

      function mountTileProvider(idx) {
        if (idx >= TILE_PROVIDERS.length) return;
        if (activeTileLayer) {
          map.removeLayer(activeTileLayer);
          activeTileLayer = null;
        }
        tileErrorCount = 0;
        var cfg = TILE_PROVIDERS[idx];
        var layer = L.tileLayer(cfg.url, cfg.options).addTo(map);
        layer.on('tileerror', function() {
          tileErrorCount += 1;
          if (tileErrorCount >= 3 && tileIdx === idx && idx + 1 < TILE_PROVIDERS.length) {
            tileIdx = idx + 1;
            mountTileProvider(tileIdx);
          }
        });
        activeTileLayer = layer;
      }

      mountTileProvider(0);

      var labLayers = [];
      var userLayer = null;
      var lastUserPos = null;
      var userAnimFrame = null;
      var routeLayer = null;

      function escapeHtml(str) {
        return String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function animateUserMarker(fromPos, toPos) {
        if (!userLayer) return;
        if (userAnimFrame) {
          cancelAnimationFrame(userAnimFrame);
          userAnimFrame = null;
        }
        var startTime = performance.now();
        var duration = 650;

        function step(now) {
          var t = Math.min(1, (now - startTime) / duration);
          var eased = 1 - Math.pow(1 - t, 3);
          var lat = fromPos.latitude + (toPos.latitude - fromPos.latitude) * eased;
          var lng = fromPos.longitude + (toPos.longitude - fromPos.longitude) * eased;
          userLayer.setLatLng([lat, lng]);
          if (t < 1) {
            userAnimFrame = requestAnimationFrame(step);
          } else {
            userAnimFrame = null;
          }
        }

        userAnimFrame = requestAnimationFrame(step);
      }

      window.renderMapState = function(labs, selectedId, userPos) {
        labLayers.forEach(function(layer) { map.removeLayer(layer); });
        labLayers = [];

        (labs || []).forEach(function(lab) {
          var isSel = lab.id === selectedId;
          var circle = L.circle([lab.latitude, lab.longitude], {
            radius: lab.radius || 50,
            color: '#0E6F5C',
            weight: isSel ? 2 : 1.2,
            fillColor: '#0E6F5C',
            fillOpacity: isSel ? 0.18 : 0.08
          }).addTo(map);

          var icon = L.divIcon({
            className: '',
            html: '<div class="lab-pin ' + (isSel ? 'active' : '') + '"><span class="lab-dot"></span><span>' + escapeHtml(lab.nama) + '</span></div>',
            iconSize: [0, 0]
          });

          var marker = L.marker([lab.latitude, lab.longitude], { icon: icon }).addTo(map);
          marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_LAB', id: lab.id }));
            }
          });

          labLayers.push(circle, marker);
        });

        if (userPos && typeof userPos.latitude === 'number' && typeof userPos.longitude === 'number') {
          if (!userLayer) {
            var uIcon = L.divIcon({
              className: '',
              html: '<div class="user-dot"></div>',
              iconSize: [16, 16],
              iconAnchor: [8, 8]
            });
            userLayer = L.marker([userPos.latitude, userPos.longitude], { icon: uIcon, zIndexOffset: 500 }).addTo(map);
          } else if (lastUserPos) {
            animateUserMarker(lastUserPos, userPos);
          } else {
            userLayer.setLatLng([userPos.latitude, userPos.longitude]);
          }
          lastUserPos = { latitude: userPos.latitude, longitude: userPos.longitude };
        } else if (userLayer) {
          map.removeLayer(userLayer);
          userLayer = null;
          lastUserPos = null;
        }
      };

      window.renderRoute = function(coords, isFallback) {
        if (routeLayer) {
          map.removeLayer(routeLayer);
          routeLayer = null;
        }
        if (!Array.isArray(coords) || coords.length < 2) return;
        var latLngs = coords.map(function(c) { return [c.latitude, c.longitude]; });
        routeLayer = L.polyline(latLngs, {
          color: '#0E6F5C',
          weight: 4,
          opacity: 0.85,
          dashArray: isFallback ? '7 7' : undefined,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      };

      window.fitRouteBounds = function(coords) {
        if (!Array.isArray(coords) || coords.length < 2) return;
        var latLngs = coords.map(function(c) { return [c.latitude, c.longitude]; });
        var bounds = L.latLngBounds(latLngs);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [46, 46], maxZoom: 18, animate: true });
        }
      };

      window.flyToCoord = function(lat, lng, zoom) {
        if (typeof lat === 'number' && typeof lng === 'number') {
          map.flyTo([lat, lng], zoom || 17, { duration: 0.45 });
        }
      };

      window.resizeMap = function() {
        map.invalidateSize({ animate: false });
      };

      map.on('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_CLICK' }));
        }
      });

      window.renderMapState(${serializedLabs}, ${serializedSelected}, ${serializedUser});

      // Fix Android WebView layout measurement lag
      setTimeout(function() { map.invalidateSize(false); }, 120);
      setTimeout(function() { map.invalidateSize(false); }, 400);
      window.addEventListener('resize', function() { map.invalidateSize(false); });

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
      }
    }

    loadLeafletScript(
      'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
      'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
      initMap
    );
  </script>
</body>
</html>`;
}

export default function InteractiveLabMap({
  laboratories,
  selectedLab,
  onSelectLab,
  onMapPress,
  userCoords,
  onRefreshLocation,
  refreshingLocation = false,
}: InteractiveLabMapProps) {
  const webViewRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);

  const hasNativeWebView = useMemo(() => {
    if (Platform.OS === "web") return false;
    try {
      return Boolean(UIManager.getViewManagerConfig?.("RNCWebView"));
    } catch {
      return false;
    }
  }, []);

  // Gunakan useState lazy initializer agar React Compiler tidak pernah me-regenerate
  // source HTML WebView saat userCoords / selectedLab / laboratories berubah.
  const [webViewSource] = useState(() => ({
    html: buildLeafletHtml(laboratories, selectedLab?.id ?? null, userCoords),
    baseUrl: "https://labora.app/",
  }));

  const userLat = userCoords?.latitude ?? null;
  const userLng = userCoords?.longitude ?? null;
  const selectedLabId = selectedLab?.id ?? null;
  const selectedLabLat = selectedLab?.latitude ?? null;
  const selectedLabLng = selectedLab?.longitude ?? null;

  // Ambil rute jalan kaki gratis (OSRM + fallback garis langsung) saat posisi user & lab terpilih tersedia
  useEffect(() => {
    if (
      userLat === null ||
      userLng === null ||
      selectedLabId === null ||
      selectedLabLat === null ||
      selectedLabLng === null
    ) {
      return;
    }

    let cancelled = false;
    void fetchWalkingRoute(
      { latitude: userLat, longitude: userLng },
      { latitude: selectedLabLat, longitude: selectedLabLng },
    ).then((res) => {
      if (!cancelled) {
        setRouteResult(res);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userLat, userLng, selectedLabId, selectedLabLat, selectedLabLng]);

  const activeRoute = useMemo(() => {
    if (userLat === null || userLng === null || selectedLabId === null) {
      return null;
    }
    return routeResult;
  }, [userLat, userLng, selectedLabId, routeResult]);

  const syncMapState = useCallback(() => {
    if (!hasNativeWebView || !webViewRef.current) return;
    const payloadLabs = JSON.stringify(
      laboratories.map((l) => ({
        id: l.id,
        nama: l.nama,
        alamat: l.alamat,
        latitude: l.latitude,
        longitude: l.longitude,
        radius: l.radius,
      })),
    );
    const payloadSelected = JSON.stringify(selectedLab?.id ?? null);
    const payloadUser = JSON.stringify(userCoords);

    webViewRef.current.injectJavaScript(
      `if (window.renderMapState) { window.renderMapState(${payloadLabs}, ${payloadSelected}, ${payloadUser}); } true;`,
    );
  }, [hasNativeWebView, laboratories, selectedLab?.id, userCoords]);

  const syncRouteState = useCallback(() => {
    if (!hasNativeWebView || !webViewRef.current) return;
    const coords = activeRoute?.coordinates ?? [];
    const isFallback = activeRoute?.isFallback ?? true;
    webViewRef.current.injectJavaScript(
      `if (window.renderRoute) { window.renderRoute(${JSON.stringify(coords)}, ${JSON.stringify(isFallback)}); } true;`,
    );
  }, [hasNativeWebView, activeRoute]);

  // Sinkronkan marker, lingkaran radius, dan titik GPS ke Leaflet tanpa me-reload halaman
  useEffect(() => {
    if (!mapReady) return;
    syncMapState();
  }, [mapReady, syncMapState]);

  // Sinkronkan garis rute Polyline ke Leaflet
  useEffect(() => {
    if (!mapReady) return;
    syncRouteState();
  }, [mapReady, syncRouteState]);

  // Geser kamera hanya ketika ID laboratorium yang dipilih berubah
  useEffect(() => {
    if (
      !mapReady ||
      !hasNativeWebView ||
      !webViewRef.current ||
      selectedLabId === null ||
      selectedLabLat === null ||
      selectedLabLng === null
    ) {
      return;
    }
    webViewRef.current.injectJavaScript(
      `if (window.flyToCoord) { window.flyToCoord(${selectedLabLat}, ${selectedLabLng}, 17); } true;`,
    );
  }, [mapReady, hasNativeWebView, selectedLabId, selectedLabLat, selectedLabLng]);

  function centerOnUser() {
    if (userCoords && hasNativeWebView && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `if (window.flyToCoord) { window.flyToCoord(${userCoords.latitude}, ${userCoords.longitude}, 17); } true;`,
      );
    }
    onRefreshLocation();
  }

  function focusRoute() {
    if (!hasNativeWebView || !webViewRef.current) return;
    const coords =
      activeRoute?.coordinates && activeRoute.coordinates.length >= 2
        ? activeRoute.coordinates
        : userCoords && selectedLab
          ? [
              userCoords,
              {
                latitude: selectedLab.latitude,
                longitude: selectedLab.longitude,
              },
            ]
          : [];
    if (coords.length >= 2) {
      webViewRef.current.injectJavaScript(
        `if (window.fitRouteBounds) { window.fitRouteBounds(${JSON.stringify(coords)}); } true;`,
      );
    }
  }

  function handleWebViewMessage(event: WebViewMessageEvent) {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        id?: string;
      };
      if (parsed.type === "MAP_READY") {
        setMapReady(true);
      } else if (parsed.type === "SELECT_LAB" && parsed.id) {
        const target = laboratories.find((l) => l.id === parsed.id);
        if (target) onSelectLab(target);
      } else if (parsed.type === "MAP_CLICK") {
        onMapPress?.();
      }
    } catch {
      // Abaikan pesan non-JSON
    }
  }

  // Fallback bersih pada Web atau apabila APK lama belum di-rebuild dengan react-native-webview
  if (!hasNativeWebView) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackNotice}>
          <AppIcon name="location" size={20} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fallbackTitle}>Daftar lokasi laboratorium</Text>
            <Text style={styles.fallbackDesc}>
              {Platform.OS === "web"
                ? "Tampilan peta berjalan dalam mode daftar spasial pada browser web."
                : "Bangun ulang development APK 1x untuk menampilkan peta jalan interaktif."}
            </Text>
          </View>
        </View>

        {userCoords && (
          <View style={styles.userPosCard}>
            <View style={styles.userPulseDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.userPosLabel}>Lokasi perangkat aktif</Text>
            </View>
            <Pressable
              style={styles.refreshBtn}
              onPress={onRefreshLocation}
              disabled={refreshingLocation}
            >
              {refreshingLocation ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.refreshBtnText}>Perbarui</Text>
              )}
            </Pressable>
          </View>
        )}

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.fallbackList}
          showsVerticalScrollIndicator={false}
        >
          {laboratories.map((lab) => {
            const isSelected = selectedLab?.id === lab.id;
            const dist = userCoords
              ? calculateHaversineDistanceMeters(
                  userCoords.latitude,
                  userCoords.longitude,
                  lab.latitude,
                  lab.longitude,
                )
              : null;

            return (
              <Pressable
                key={lab.id}
                style={[
                  styles.fallbackCard,
                  isSelected && styles.fallbackCardSelected,
                ]}
                onPress={() => onSelectLab(lab)}
              >
                <View style={styles.fallbackCardTop}>
                  <Text
                    style={styles.fallbackLabName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {lab.nama}
                  </Text>
                  <View
                    style={[
                      styles.distPill,
                      {
                        backgroundColor:
                          dist === null
                            ? COLORS.neutralBadgeBg
                            : dist <= lab.radius
                              ? COLORS.successBg
                              : COLORS.warningBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.distPillText,
                        {
                          color:
                            dist === null
                              ? COLORS.neutralBadgeText
                              : dist <= lab.radius
                                ? COLORS.successText
                                : COLORS.warningText,
                        },
                      ]}
                    >
                      {dist === null
                        ? "Lokasi belum terdeteksi"
                        : dist <= lab.radius
                          ? "Berada dalam radius"
                          : "Di luar radius"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={styles.fallbackAlamat}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {lab.alamat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={() => {
        if (mapReady && webViewRef.current) {
          webViewRef.current.injectJavaScript(
            "if (window.resizeMap) { window.resizeMap(); } true;",
          );
        }
      }}
    >
      <SafeWebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={webViewSource}
        style={styles.webview}
        onMessage={handleWebViewMessage}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        allowFileAccess
        cacheEnabled
        applicationNameForUserAgent="LaboraApp/1.0"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />

      {/* Tombol Mengambang: Pusatkan Lokasi & Fokus Rute */}
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
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <AppIcon name="location" size={19} color={COLORS.primary} />
          )}
        </Pressable>

        {userCoords && selectedLab && (
          <Pressable
            style={({ pressed }) => [
              styles.controlBtn,
              pressed && styles.controlBtnPressed,
            ]}
            onPress={focusRoute}
            accessibilityLabel="Tampilkan rute ke laboratorium"
          >
            <AppIcon name="route" size={18} color={COLORS.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E8EEF2",
  },
  webview: {
    flex: 1,
    backgroundColor: "#E8EEF2",
  },
  mapControls: {
    position: "absolute",
    top: 14,
    right: 14,
    gap: 10,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnPressed: {
    backgroundColor: COLORS.primarySoft,
  },

  fallbackContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  fallbackNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
  },
  fallbackTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  fallbackDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
  userPosCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  userPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  userPosLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refreshBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  fallbackList: {
    paddingBottom: 24,
    gap: 10,
  },
  fallbackCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 3,
  },
  fallbackCardSelected: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: COLORS.primarySurface,
  },
  fallbackCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  fallbackLabName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  distPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
  },
  distPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  fallbackAlamat: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
});
