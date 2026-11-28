import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
import BottomNavBar from "../../../components/BottomNavBar";
import BottomSheetModal from "../../../components/BottomSheetModal";
import LaboratoryFormModal from "../../../components/LaboratoryFormModal";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import {
  createLaboratory,
  deleteLaboratory,
  describeFirestoreError,
  subscribeLaboratories,
  toggleLaboratoryActive,
  updateLaboratory,
  type LaboratoryInput,
} from "../../../services/laboratoryService";
import type { Laboratory } from "../../../types";

export default function KelolaLaboratoriumScreen() {
  const { user } = useAuth();

  const isAslab =
    user?.activeRole === "aslab" ||
    (Array.isArray(user?.roles) && user.roles.includes("aslab"));

  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(isAslab);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Laboratory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailLabId, setDetailLabId] = useState<string | null>(null);

  const detailLab = useMemo(
    () =>
      detailLabId
        ? (laboratories.find((item) => item.id === detailLabId) ?? null)
        : null,
    [laboratories, detailLabId],
  );

  useEffect(() => {
    if (!user || !isAslab) {
      return;
    }

    const unsubscribe = subscribeLaboratories(
      (items) => {
        setLaboratories(items);
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        setLoadError(describeFirestoreError(error));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user, isAslab]);

  const filteredLabs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return laboratories;
    return laboratories.filter(
      (lab) =>
        lab.nama.toLowerCase().includes(q) ||
        lab.alamat.toLowerCase().includes(q) ||
        lab.deskripsi.toLowerCase().includes(q),
    );
  }, [laboratories, searchQuery]);

  async function handleFormSubmit(values: LaboratoryInput) {
    if (!user) return;
    setSubmitting(true);
    setFormError(null);

    try {
      if (formMode === "create") {
        await createLaboratory(user.id, values);
      } else if (selectedLab) {
        await updateLaboratory(user.id, selectedLab.id, values);
      }
      setFormVisible(false);
      setSelectedLab(null);
    } catch (error) {
      setFormError(describeFirestoreError(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(lab: Laboratory) {
    if (!user) return;
    try {
      await toggleLaboratoryActive(user.id, lab.id, !lab.aktif);
    } catch (error) {
      setLoadError(describeFirestoreError(error));
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteLaboratory(deleteTarget.id);
      setDeleteTarget(null);
    } catch (error) {
      setLoadError(describeFirestoreError(error));
    } finally {
      setDeleting(false);
    }
  }

  if (!isAslab) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.content}>
          <Pressable style={styles.backRow} onPress={() => router.back()}>
            <AppIcon
              name="chevron-left"
              size={20}
              color={COLORS.textPrimary}
            />
            <Text style={styles.title}>Lokasi Laboratorium</Text>
          </Pressable>
          <View style={styles.forbiddenBox}>
            <AppIcon name="alert" size={30} color={COLORS.dangerText} />
            <Text style={styles.forbiddenTitle}>Akses terbatas</Text>
            <Text style={styles.forbiddenDesc}>
              Pengaturan lokasi laboratorium kini dikelola oleh peran Aslab.
              Asisten tidak dapat mengubah pengaturan ruang secara global.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Pressable
            style={styles.backRow}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <AppIcon
              name="chevron-left"
              size={20}
              color={COLORS.textPrimary}
            />
            <Text style={styles.title}>Lokasi Laboratorium</Text>
          </Pressable>
          <Text style={styles.subtitle}>
            Atur titik koordinat, radius validasi presensi, dan status lab.
          </Text>
        </View>

        <View style={styles.actionHeader}>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setSelectedLab(null);
              setFormMode("create");
              setFormError(null);
              setFormVisible(true);
            }}
          >
            <AppIcon name="plus" size={16} color={COLORS.textOnPrimary} />
            <Text style={styles.addButtonText}>Tambah laboratorium</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.mapNavBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/asisten/peta" as any)}
          >
            <AppIcon name="location" size={16} color={COLORS.primary} />
            <Text style={styles.mapNavBtnText}>Peta</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <AppIcon name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama atau alamat laboratorium"
            placeholderTextColor={COLORS.textMuted}
            selectionColor={COLORS.primary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Text style={styles.clearSearchText}>Reset</Text>
            </Pressable>
          )}
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>Memuat data laboratorium…</Text>
          </View>
        )}

        {loadError && (
          <View style={styles.errorBox}>
            <AppIcon name="alert" size={16} color={COLORS.dangerText} />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        )}

        {!loading && !loadError && filteredLabs.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <AppIcon name="location" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? "Laboratorium tidak ditemukan"
                : "Belum ada laboratorium"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Coba kata kunci pencarian lain."
                : "Daftarkan laboratorium pertama untuk mengaktifkan validasi lokasi presensi."}
            </Text>
          </View>
        )}

        {!loading &&
          filteredLabs.map((lab) => (
            <Pressable
              key={lab.id}
              style={({ pressed }) => [
                styles.labCard,
                pressed && styles.pressed,
              ]}
              onPress={() => setDetailLabId(lab.id)}
            >
              <View style={styles.cardHeader}>
                <Text
                  style={styles.labNama}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {lab.nama}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    lab.aktif ? styles.statusActive : styles.statusInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color: lab.aktif
                          ? COLORS.successText
                          : COLORS.neutralBadgeText,
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {lab.aktif ? "Aktif" : "Nonaktif"}
                  </Text>
                </View>
              </View>

              <View style={styles.alamatRow}>
                <AppIcon
                  name="location"
                  size={14}
                  color={COLORS.textSecondary}
                />
                <Text
                  style={styles.labAlamat}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {lab.alamat}
                </Text>
              </View>

              <View style={styles.cardSummaryFooter}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.footerLabel}>Radius presensi</Text>
                  <Text
                    style={styles.radiusSummaryText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {lab.radius} meter
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.detailCtaBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setDetailLabId(lab.id)}
                >
                  <Text style={styles.detailCtaBtnText}>Lihat detail</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
      </ScrollView>

      <BottomNavBar role="asisten" activeTab="beranda" />

      {/* Bottom Sheet Detail & Aksi Laboratorium (Tarik ke Bawah atau Ketuk Luar untuk Tutup) */}
      <BottomSheetModal
        visible={!!detailLab}
        onClose={() => setDetailLabId(null)}
        contentStyle={styles.sheetCardContent}
      >
        {detailLab && (
          <>
            <View style={styles.cardHeader}>
              <Text
                style={styles.sheetTitle}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {detailLab.nama}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  detailLab.aktif
                    ? styles.statusActive
                    : styles.statusInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: detailLab.aktif
                        ? COLORS.successText
                        : COLORS.neutralBadgeText,
                    },
                  ]}
                >
                  {detailLab.aktif ? "Aktif" : "Nonaktif"}
                </Text>
              </View>
            </View>

            <View style={[styles.alamatRow, { marginTop: 6 }]}>
              <AppIcon
                name="location"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.labAlamat}>{detailLab.alamat}</Text>
            </View>

            {detailLab.deskripsi ? (
              <Text style={styles.labDeskripsi}>{detailLab.deskripsi}</Text>
            ) : null}

            <View style={styles.specsContainer}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Koordinat pusat</Text>
                <Text
                  style={styles.specValue}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {detailLab.latitude.toFixed(6)},{" "}
                  {detailLab.longitude.toFixed(6)}
                </Text>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>Radius presensi</Text>
                <Text
                  style={styles.specValue}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {detailLab.radius} meter
                </Text>
              </View>
            </View>

            <View style={styles.cardActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.cardActionBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  const target = detailLab;
                  setDetailLabId(null);
                  setSelectedLab(target);
                  setFormMode("edit");
                  setFormError(null);
                  setFormVisible(true);
                }}
              >
                <Text style={styles.editActionText}>Ubah</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.cardActionBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleToggleStatus(detailLab)}
              >
                <Text
                  style={[
                    styles.toggleActionText,
                    {
                      color: detailLab.aktif
                        ? COLORS.warningText
                        : COLORS.primary,
                    },
                  ]}
                >
                  {detailLab.aktif ? "Nonaktifkan" : "Aktifkan"}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.cardActionBtn,
                  styles.deleteActionBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  const target = detailLab;
                  setDetailLabId(null);
                  setDeleteTarget(target);
                }}
              >
                <Text style={styles.deleteActionText}>Hapus</Text>
              </Pressable>
            </View>
          </>
        )}
      </BottomSheetModal>

      <LaboratoryFormModal
        visible={formVisible}
        mode={formMode}
        initialValues={
          selectedLab
            ? {
                nama: selectedLab.nama,
                deskripsi: selectedLab.deskripsi,
                alamat: selectedLab.alamat,
                latitude: selectedLab.latitude,
                longitude: selectedLab.longitude,
                radius: selectedLab.radius,
                aktif: selectedLab.aktif,
              }
            : null
        }
        submitting={submitting}
        error={formError}
        onSubmit={handleFormSubmit}
        onClose={() => {
          setFormVisible(false);
          setSelectedLab(null);
        }}
      />

      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={deleting ? undefined : () => setDeleteTarget(null)}
          />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Hapus Laboratorium?</Text>
            <Text style={styles.confirmDesc}>
              {deleteTarget?.nama} beserta data koordinat dan radius presensinya
              akan dihapus dari Firestore.
            </Text>

            <View style={styles.confirmActionRow}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmCancelBtn]}
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                <Text style={styles.confirmCancelText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, styles.confirmDeleteBtn]}
                onPress={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.confirmDeleteText}>Hapus</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.surfaceSubtle,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headerBlock: {
    marginBottom: 14,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: "400",
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginLeft: 28,
  },
  actionHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  addButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  addButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: 13.5,
    fontWeight: "700",
  },
  mapNavBtn: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapNavBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "700",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    minHeight: 44,
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    paddingVertical: 9,
  },
  clearSearchText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
  },
  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    color: COLORS.dangerDark,
    flex: 1,
  },
  emptyBox: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 24,
  },
  emptyIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  labCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  labNama: {
    flex: 1,
    minWidth: 0,
    fontSize: 14.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  alamatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  labAlamat: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
    color: COLORS.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  cardSummaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  radiusSummaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  detailCtaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCtaBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  sheetCardContent: {
    paddingHorizontal: 16,
  },
  sheetTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  statusActive: {
    backgroundColor: COLORS.successBg,
  },
  statusInactive: {
    backgroundColor: COLORS.neutralBadgeBg,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  labDeskripsi: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 18,
  },
  specsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 11,
    marginTop: 12,
  },
  specItem: {
    flex: 1,
    gap: 2,
  },
  specDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  specLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  specValue: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 8,
  },
  cardActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  toggleActionText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  deleteActionBtn: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
  },
  deleteActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.dangerText,
  },
  pressed: {
    opacity: 0.82,
  },
  forbiddenBox: {
    alignItems: "center",
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    marginTop: 28,
    gap: 8,
  },
  forbiddenTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.dangerDark,
  },
  forbiddenDesc: {
    fontSize: 12.5,
    color: COLORS.dangerDark,
    textAlign: "center",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 22,
  },
  confirmCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  confirmDesc: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 16,
  },
  confirmActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  confirmCancelText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmDeleteBtn: {
    backgroundColor: COLORS.dangerText,
  },
  confirmDeleteText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
