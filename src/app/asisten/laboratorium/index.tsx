import { router } from "expo-router";
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
import LaboratoryFormModal from "../../../components/LaboratoryFormModal";
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

  // Guard hak akses: Hanya asisten yang boleh mengelola laboratorium
  const isAssistant =
    user?.activeRole === "asisten" ||
    (Array.isArray(user?.roles) && user.roles.includes("asisten"));

  const [laboratories, setLaboratories] = useState<Laboratory[]>([]);
  const [loading, setLoading] = useState(isAssistant);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  // Modal Create / Edit
  const [formVisible, setFormVisible] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [selectedLab, setSelectedLab] = useState<Laboratory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Konfirmasi Hapus
  const [deleteTarget, setDeleteTarget] = useState<Laboratory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !isAssistant) {
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
  }, [user, isAssistant]);

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

  if (!isAssistant) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <AppIcon name="chevron-left" size={16} color="#41337A" />
            <Text style={styles.backText}>Kembali</Text>
          </Pressable>
          <View style={styles.forbiddenBox}>
            <AppIcon name="alert" size={32} color="#dc2626" />
            <Text style={styles.forbiddenTitle}>Akses Terbatas</Text>
            <Text style={styles.forbiddenDesc}>
              Hanya akun dengan peran Asisten yang memiliki wewenang untuk
              mengelola lokasi laboratorium (SRS-015).
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <AppIcon name="chevron-left" size={16} color="#41337A" />
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>

        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Kelola Lokasi Laboratorium</Text>
            <Text style={styles.subtitle}>
              Atur titik koordinat, radius validasi presensi, dan status
              operasional laboratorium (SRS-015).
            </Text>
          </View>
        </View>

        {/* Tombol Tambah Lab & Search */}
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
            <AppIcon name="plus" size={16} color="#ffffff" />
            <Text style={styles.addButtonText}>Tambah Laboratorium</Text>
          </Pressable>

          {/* Tombol Cepat ke Peta Interaktif */}
          <Pressable
            style={({ pressed }) => [
              styles.mapNavBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => router.push("/asisten/peta" as any)}
          >
            <AppIcon name="location" size={16} color="#41337A" />
            <Text style={styles.mapNavBtnText}>Lihat Peta</Text>
          </Pressable>
        </View>

        {/* Input Pencarian */}
        <View style={styles.searchBox}>
          <AppIcon name="search" size={16} color="#6EA4BF" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama laboratorium, alamat, atau deskripsi..."
            placeholderTextColor="#6EA4BF"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Text style={styles.clearSearchText}>Reset</Text>
            </Pressable>
          )}
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#41337A" />
            <Text style={styles.loadingText}>Memuat data laboratorium…</Text>
          </View>
        )}

        {loadError && (
          <View style={styles.errorBox}>
            <AppIcon name="alert" size={16} color="#b91c1c" />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        )}

        {!loading && !loadError && filteredLabs.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <AppIcon name="location" size={28} color="#6EA4BF" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery
                ? "Tidak ada laboratorium yang sesuai"
                : "Belum Ada Laboratorium"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Coba gunakan kata kunci pencarian yang lain."
                : "Daftarkan laboratorium pertama Anda untuk mengaktifkan validasi lokasi presensi."}
            </Text>
          </View>
        )}

        {!loading &&
          filteredLabs.map((lab) => (
            <View key={lab.id} style={styles.labCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labNama}>{lab.nama}</Text>
                  <View style={styles.alamatRow}>
                    <AppIcon name="location" size={13} color="#6EA4BF" />
                    <Text style={styles.labAlamat} numberOfLines={2}>
                      {lab.alamat}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    lab.aktif ? styles.statusActive : styles.statusInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: lab.aktif ? "#16a34a" : "#6EA4BF" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: lab.aktif ? "#15803d" : "#41337A" },
                    ]}
                  >
                    {lab.aktif ? "Aktif" : "Nonaktif"}
                  </Text>
                </View>
              </View>

              {lab.deskripsi ? (
                <Text style={styles.labDeskripsi} numberOfLines={2}>
                  {lab.deskripsi}
                </Text>
              ) : null}

              {/* Detail Koordinat & Radius */}
              <View style={styles.specsContainer}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>TITIK KOORDINAT</Text>
                  <Text style={styles.specValue}>
                    {lab.latitude.toFixed(6)}, {lab.longitude.toFixed(6)}
                  </Text>
                </View>
                <View style={styles.specDivider} />
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>RADIUS PRESENSI</Text>
                  <Text style={styles.specValue}>{lab.radius} Meter</Text>
                </View>
              </View>

              {/* Tombol Aksi */}
              <View style={styles.cardActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cardActionBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    setSelectedLab(lab);
                    setFormMode("edit");
                    setFormError(null);
                    setFormVisible(true);
                  }}
                >
                  <Text style={styles.editActionText}>Ubah Data</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.cardActionBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleToggleStatus(lab)}
                >
                  <Text
                    style={[
                      styles.toggleActionText,
                      { color: lab.aktif ? "#d97706" : "#16a34a" },
                    ]}
                  >
                    {lab.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.cardActionBtn,
                    styles.deleteActionBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setDeleteTarget(lab)}
                >
                  <Text style={styles.deleteActionText}>Hapus</Text>
                </Pressable>
              </View>
            </View>
          ))}
      </ScrollView>

      {/* Modal Form Tambah/Ubah Laboratorium */}
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

      {/* Modal Dialog Konfirmasi Hapus */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconBox}>
              <AppIcon name="alert" size={26} color="#dc2626" />
            </View>
            <Text style={styles.confirmTitle}>Hapus Laboratorium?</Text>
            <Text style={styles.confirmDesc}>
              Apakah Anda yakin ingin menghapus{" "}
              <Text style={{ fontWeight: "700" }}>{deleteTarget?.nama}</Text>?
              Data koordinat dan radius presensi untuk laboratorium ini akan
              dihapus dari Firestore.
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
                  <ActivityIndicator size="small" color="#ffffff" />
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
    backgroundColor: "#ECFEE8",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#C2EFEB",
  },
  backText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#41337A",

  },
  headerRow: {
    marginBottom: 16,
  },
  headerInfo: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#331E36",

  },
  subtitle: {
    fontSize: 13,
    color: "#6EA4BF",
    lineHeight: 18,

  },
  actionHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  addButton: {
    flex: 1,
    backgroundColor: "#41337A",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",

  },
  mapNavBtn: {
    backgroundColor: "#C2EFEB",
    borderWidth: 1,
    borderColor: "#6EA4BF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapNavBtnText: {
    color: "#41337A",
    fontSize: 13,
    fontWeight: "600",

  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#C2EFEB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#331E36",
    paddingVertical: 2,

  },
  clearSearchText: {
    fontSize: 12,
    color: "#6EA4BF",
    fontWeight: "500",

  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    color: "#6EA4BF",

  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
    flex: 1,

  },
  emptyBox: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#C2EFEB",
    borderRadius: 16,
    padding: 28,
    marginTop: 8,
  },
  emptyIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ECFEE8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#331E36",
    marginBottom: 4,

  },
  emptySubtitle: {
    fontSize: 12,
    color: "#6EA4BF",
    textAlign: "center",
    lineHeight: 18,

  },
  labCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  labNama: {
    fontSize: 16,
    fontWeight: "700",
    color: "#331E36",
    marginBottom: 4,

  },
  alamatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  labAlamat: {
    fontSize: 12,
    color: "#6EA4BF",
    flex: 1,

  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  statusInactive: {
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
    fontSize: 11,
    fontWeight: "600",

  },
  labDeskripsi: {
    fontSize: 12,
    color: "#41337A",
    marginTop: 10,
    lineHeight: 16,

  },
  specsContainer: {
    flexDirection: "row",
    backgroundColor: "#ECFEE8",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ECFEE8",
    padding: 10,
    marginTop: 12,
  },
  specItem: {
    flex: 1,
  },
  specDivider: {
    width: 1,
    backgroundColor: "#C2EFEB",
    marginHorizontal: 10,
  },
  specLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6EA4BF",
    letterSpacing: 0.5,
    marginBottom: 2,

  },
  specValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#331E36",

  },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ECFEE8",
    gap: 8,
  },
  cardActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#ECFEE8",
  },
  editActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#41337A",

  },
  toggleActionText: {
    fontSize: 12,
    fontWeight: "600",

  },
  deleteActionBtn: {
    backgroundColor: "#fef2f2",
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dc2626",

  },
  pressed: {
    opacity: 0.75,
  },
  forbiddenBox: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 40,
    gap: 12,
  },
  forbiddenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#991b1b",

  },
  forbiddenDesc: {
    fontSize: 13,
    color: "#41337A",
    textAlign: "center",
    lineHeight: 18,

  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(51, 30, 54, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#331E36",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#331E36",
    marginBottom: 6,

  },
  confirmDesc: {
    fontSize: 13,
    color: "#41337A",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,

  },
  confirmActionRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelBtn: {
    backgroundColor: "#ECFEE8",
  },
  confirmCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#41337A",

  },
  confirmDeleteBtn: {
    backgroundColor: "#dc2626",
  },
  confirmDeleteText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",

  },
});
