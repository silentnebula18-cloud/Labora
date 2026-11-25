import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import AppIcon from "./AppIcon";
import { calculateHaversineDistanceMeters, type Coordinates } from "../services/locationService";
import type { SessionWithMeta } from "../services/sessionService";
import type { Laboratory } from "../types";
import { formatTanggal } from "../utils/format";
import {
  formatSessionTimeRange,
  getLaboratoryActivities,
} from "../utils/laboratoryActivity";

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

  return (
    <View style={styles.cardContainer}>
      <View style={styles.dragHandleContainer}>
        <View style={styles.dragHandle} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Lab */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={styles.labName}>{laboratory.nama}</Text>
              <View
                style={[
                  styles.statusBadge,
                  laboratory.aktif ? styles.badgeActive : styles.badgeInactive,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: laboratory.aktif ? "#16a34a" : "#6EA4BF",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: laboratory.aktif ? "#15803d" : "#41337A" },
                  ]}
                >
                  {laboratory.aktif ? "Aktif" : "Nonaktif"}
                </Text>
              </View>
            </View>

            <View style={styles.addressRow}>
              <AppIcon name="location" size={13} color="#6EA4BF" />
              <Text style={styles.addressText}>{laboratory.alamat}</Text>
            </View>
          </View>

          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Tutup detail laboratorium"
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* Deskripsi */}
        {laboratory.deskripsi ? (
          <Text style={styles.description}>{laboratory.deskripsi}</Text>
        ) : null}

        {/* Kartu Status Jarak & Radius Presensi (SRS-014 & SRS-016) */}
        <View
          style={[
            styles.proximityBox,
            distanceMeters !== null
              ? isWithinRadius
                ? styles.proximityInside
                : styles.proximityOutside
              : styles.proximityUnknown,
          ]}
        >
          <View style={styles.proximityHeader}>
            <AppIcon
              name="location"
              size={16}
              color={
                distanceMeters !== null
                  ? isWithinRadius
                    ? "#15803d"
                    : "#b45309"
                  : "#6EA4BF"
              }
            />
            <Text
              style={[
                styles.proximityTitle,
                {
                  color:
                    distanceMeters !== null
                      ? isWithinRadius
                        ? "#15803d"
                        : "#b45309"
                      : "#41337A",
                },
              ]}
            >
              {distanceMeters !== null
                ? isWithinRadius
                  ? "Di Dalam Radius Presensi"
                  : "Di Luar Radius Presensi"
                : "Posisi Pengguna Belum Tersedia"}
            </Text>
          </View>

          <View style={styles.proximityDetails}>
            <View style={styles.proximityCol}>
              <Text style={styles.proximityLabel}>JARAK ANDA</Text>
              <Text style={styles.proximityValue}>
                {distanceMeters !== null ? `${distanceMeters} Meter` : "—"}
              </Text>
            </View>
            <View style={styles.proximityDivider} />
            <View style={styles.proximityCol}>
              <Text style={styles.proximityLabel}>RADIUS VALIDASI</Text>
              <Text style={styles.proximityValue}>{laboratory.radius} Meter</Text>
            </View>
            <View style={styles.proximityDivider} />
            <View style={styles.proximityCol}>
              <Text style={styles.proximityLabel}>KOORDINAT PUSAT</Text>
              <Text style={styles.proximityCoord}>
                {laboratory.latitude.toFixed(4)}, {laboratory.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        </View>

        {/* Aktivitas Berlangsung (Ongoing) */}
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
                Tidak ada praktikum yang sedang berlangsung saat ini.
              </Text>
            </View>
          ) : (
            activities.ongoing.map((session) => (
              <View key={session.id} style={styles.activityCardActive}>
                <View style={styles.activityTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matkulText}>
                      {session.practicum?.mataKuliah ?? "Mata Kuliah"}
                    </Text>
                    <Text style={styles.praktikumTitle}>
                      Pertemuan {session.practicum?.nomorPraktikum ?? 1}:{" "}
                      {session.practicum?.namaPraktikum ?? "Praktikum"}
                    </Text>
                  </View>
                  <View style={styles.ongoingBadge}>
                    <Text style={styles.ongoingBadgeText}>BERLANGSUNG</Text>
                  </View>
                </View>

                <View style={styles.activityMetaRow}>
                  <Text style={styles.activityMetaText}>
                    Kelas {session.kelas?.namaKelas ?? "—"}
                  </Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.activityMetaText}>
                    {formatSessionTimeRange(session)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Aktivitas Berikutnya (Upcoming) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppIcon name="clock" size={15} color="#6EA4BF" />
            <Text style={styles.sectionTitle}>
              Praktikum Berikutnya ({activities.upcoming.length})
            </Text>
          </View>

          {activities.upcoming.length === 0 ? (
            <View style={styles.emptyActivityBox}>
              <Text style={styles.emptyActivityText}>
                Belum ada jadwal praktikum berikutnya di laboratorium ini.
              </Text>
            </View>
          ) : (
            activities.upcoming.map((session) => (
              <View key={session.id} style={styles.activityCard}>
                <View style={styles.activityTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.matkulText}>
                      {session.practicum?.mataKuliah ?? "Mata Kuliah"}
                    </Text>
                    <Text style={styles.praktikumTitle}>
                      Pertemuan {session.practicum?.nomorPraktikum ?? 1}:{" "}
                      {session.practicum?.namaPraktikum ?? "Praktikum"}
                    </Text>
                  </View>
                  <Text style={styles.upcomingBadge}>TERJADWAL</Text>
                </View>

                <View style={styles.activityMetaRow}>
                  <Text style={styles.activityMetaText}>
                    Kelas {session.kelas?.namaKelas ?? "—"}
                  </Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.activityMetaText}>
                    {formatTanggal(session.tanggal)}
                  </Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.activityMetaText}>
                    {formatSessionTimeRange(session)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Tombol Pengelolaan khusus Asisten jika onManageLab disediakan */}
        {onManageLab && (
          <Pressable
            style={({ pressed }) => [
              styles.manageBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => onManageLab(laboratory)}
          >
            <AppIcon name="location" size={16} color="#41337A" />
            <Text style={styles.manageBtnText}>Ubah Data Laboratorium Ini</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: 440,
    shadowColor: "#331E36",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6EA4BF",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  labName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#331E36",

  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeActive: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  badgeInactive: {
    backgroundColor: "#ECFEE8",
    borderWidth: 1,
    borderColor: "#C2EFEB",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",

  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addressText: {
    fontSize: 12,
    color: "#6EA4BF",

  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ECFEE8",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 12,
    color: "#6EA4BF",
    fontWeight: "700",

  },
  description: {
    fontSize: 12,
    color: "#41337A",
    marginTop: 8,
    lineHeight: 16,

  },
  proximityBox: {
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
  },
  proximityInside: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  proximityOutside: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  proximityUnknown: {
    backgroundColor: "#ECFEE8",
    borderColor: "#C2EFEB",
  },
  proximityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  proximityTitle: {
    fontSize: 12.5,
    fontWeight: "700",

  },
  proximityDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  proximityCol: {
    flex: 1,
  },
  proximityDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: 8,
  },
  proximityLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#6EA4BF",
    letterSpacing: 0.5,

  },
  proximityValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#331E36",
    marginTop: 2,

  },
  proximityCoord: {
    fontSize: 10,
    fontWeight: "600",
    color: "#41337A",
    marginTop: 2,

  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#331E36",

  },
  emptyActivityBox: {
    backgroundColor: "#ECFEE8",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ECFEE8",
  },
  emptyActivityText: {
    fontSize: 11.5,
    color: "#6EA4BF",
    textAlign: "center",

  },
  activityCardActive: {
    backgroundColor: "#C2EFEB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6EA4BF",
    padding: 12,
    marginBottom: 8,
  },
  activityCard: {
    backgroundColor: "#ECFEE8",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    padding: 12,
    marginBottom: 8,
  },
  activityTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  matkulText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6EA4BF",

  },
  praktikumTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#331E36",
    marginTop: 1,

  },
  ongoingBadge: {
    backgroundColor: "#16a34a",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ongoingBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",

  },
  upcomingBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6EA4BF",

  },
  activityMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  activityMetaText: {
    fontSize: 11,
    color: "#41337A",
    fontWeight: "500",

  },
  metaDot: {
    fontSize: 10,
    color: "#6EA4BF",

  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#C2EFEB",
    borderWidth: 1,
    borderColor: "#6EA4BF",
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 14,
  },
  manageBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#41337A",

  },
  pressed: {
    opacity: 0.75,
  },
});
