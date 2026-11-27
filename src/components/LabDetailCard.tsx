import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS, RADIUS } from "../constants/theme";
import {
  calculateHaversineDistanceMeters,
  type Coordinates,
} from "../services/locationService";
import type { SessionWithMeta } from "../services/sessionService";
import type { Laboratory } from "../types";
import { formatTanggal } from "../utils/format";
import {
  formatSessionTimeRange,
  getLaboratoryActivities,
} from "../utils/laboratoryActivity";
import AppIcon from "./AppIcon";

interface LabDetailCardProps {
  laboratory: Laboratory;
  userCoords: Coordinates | null;
  sessions: SessionWithMeta[];
  onClose: () => void;
  onManageLab?: (lab: Laboratory) => void;
}

export default function LabDetailCard({
  laboratory,
  userCoords,
  sessions,
  onClose,
  onManageLab,
}: LabDetailCardProps) {
  const activities = getLaboratoryActivities(laboratory, sessions);
  const [translateY] = useState(() => new Animated.Value(0));
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const [prevLabId, setPrevLabId] = useState(laboratory.id);
  if (laboratory.id !== prevLabId) {
    setPrevLabId(laboratory.id);
    setIsScrollAtTop(true);
  }

  useEffect(() => {
    translateY.stopAnimation();
    translateY.setValue(0);
  }, [laboratory.id, translateY]);

  const animateClose = useCallback(() => {
    translateY.stopAnimation();
    Animated.timing(translateY, {
      toValue: 420,
      duration: 170,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }, [translateY, onClose]);

  const resetPosition = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 5,
    }).start();
  }, [translateY]);

  const handlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 60 || gesture.vy > 0.5) {
            animateClose();
          } else {
            resetPosition();
          }
        },
        onPanResponderTerminate: () => {
          resetPosition();
        },
      }),
    [translateY, animateClose, resetPosition],
  );

  const bodyPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          isScrollAtTop &&
          gesture.dy > 8 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
          isScrollAtTop &&
          gesture.dy > 10 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 60 || gesture.vy > 0.5) {
            animateClose();
          } else {
            resetPosition();
          }
        },
        onPanResponderTerminate: () => {
          resetPosition();
        },
      }),
    [isScrollAtTop, translateY, animateClose, resetPosition],
  );

  let distanceMeters: number | null = null;
  let isWithinRadius = false;

  if (
    userCoords &&
    Number.isFinite(laboratory.latitude) &&
    Number.isFinite(laboratory.longitude)
  ) {
    distanceMeters = calculateHaversineDistanceMeters(
      userCoords.latitude,
      userCoords.longitude,
      laboratory.latitude,
      laboratory.longitude,
    );
    isWithinRadius = distanceMeters <= laboratory.radius;
  }

  const radiusBadge =
    distanceMeters === null
      ? {
          label: "Lokasi belum terdeteksi",
          bg: COLORS.neutralBadgeBg,
          border: COLORS.border,
          text: COLORS.neutralBadgeText,
        }
      : isWithinRadius
        ? {
            label: "Berada dalam radius",
            bg: COLORS.successBg,
            border: COLORS.primaryBorder,
            text: COLORS.successText,
          }
        : {
            label: "Di luar radius",
            bg: COLORS.warningBg,
            border: COLORS.warningBorder,
            text: COLORS.warningText,
          };

  return (
    <Animated.View
      style={[styles.cardContainer, { transform: [{ translateY }] }]}
      {...bodyPanResponder.panHandlers}
    >
      {/* Zona Tarik ke Bawah: Handle + Header Lab */}
      <View {...handlePanResponder.panHandlers}>
        <View style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text
              style={styles.labName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {laboratory.nama}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: radiusBadge.bg,
                  borderColor: radiusBadge.border,
                },
              ]}
            >
              <Text
                style={[styles.statusText, { color: radiusBadge.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {radiusBadge.label}
              </Text>
            </View>
          </View>

          <View style={styles.addressRow}>
            <AppIcon name="location" size={14} color={COLORS.textSecondary} />
            <Text
              style={styles.addressText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {laboratory.alamat}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={(e) => {
          const atTop = e.nativeEvent.contentOffset.y <= 2;
          setIsScrollAtTop((prev) => (prev === atTop ? prev : atTop));
        }}
        scrollEventThrottle={16}
      >
        {laboratory.deskripsi ? (
          <Text
            style={styles.description}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {laboratory.deskripsi}
          </Text>
        ) : null}

        {/* Praktikum Berlangsung: Hanya Nama Kelas & Jam */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.liveIndicator} />
            <Text style={styles.sectionTitle}>
              Praktikum Berlangsung ({activities.ongoing.length})
            </Text>
          </View>

          {activities.ongoing.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Text style={styles.emptyActivityText}>
                Tidak ada praktikum berlangsung
              </Text>
            </View>
          ) : (
            activities.ongoing.map((session) => (
              <View key={session.id} style={styles.activityCardActive}>
                <Text
                  style={styles.classNameText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {session.practicum?.mataKuliah ?? "Mata Kuliah"} · Kelas{" "}
                  {session.kelas?.namaKelas ?? "—"}
                </Text>

                <View style={styles.activityMetaRow}>
                  <AppIcon name="clock" size={13} color={COLORS.primary} />
                  <Text
                    style={styles.activityMetaText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formatSessionTimeRange(session)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Praktikum Berikutnya: Hanya Nama Kelas, Tanggal, & Jam */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppIcon name="clock" size={15} color={COLORS.textSecondary} />
            <Text style={styles.sectionTitle}>
              Praktikum Berikutnya ({activities.upcoming.length})
            </Text>
          </View>

          {activities.upcoming.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Text style={styles.emptyActivityText}>
                Tidak ada jadwal praktikum
              </Text>
            </View>
          ) : (
            activities.upcoming.map((session) => (
              <View key={session.id} style={styles.activityCard}>
                <Text
                  style={styles.classNameText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {session.practicum?.mataKuliah ?? "Mata Kuliah"} · Kelas{" "}
                  {session.kelas?.namaKelas ?? "—"}
                </Text>

                <View style={styles.activityMetaRow}>
                  <AppIcon
                    name="calendar"
                    size={13}
                    color={COLORS.textSecondary}
                  />
                  <Text
                    style={styles.activityMetaText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {formatTanggal(session.tanggal)} ·{" "}
                    {formatSessionTimeRange(session)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {onManageLab && (
          <Pressable
            style={({ pressed }) => [
              styles.manageBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => onManageLab(laboratory)}
          >
            <AppIcon name="edit" size={15} color={COLORS.primary} />
            <Text style={styles.manageBtnText}>Ubah data laboratorium</Text>
          </Pressable>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: 370,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  labName: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  description: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 4,
  },
  section: {
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptyActivityBox: {
    padding: 11,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyActivityText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  activityCardActive: {
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySurface,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    marginBottom: 10,
  },
  activityCard: {
    padding: 14,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  classNameText: {
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  activityMetaText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  manageBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primarySoft,
  },
  manageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
