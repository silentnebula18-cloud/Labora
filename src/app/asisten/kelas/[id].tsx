import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
import ClassFormModal from "../../../components/ClassFormModal";
import { useAuth } from "../../../context/AuthContext";
import {
  addClassMember,
  deleteClass,
  describeFirestoreError,
  findUserByNim,
  removeClassMember,
  subscribeClass,
  subscribeClassMembers,
  updateClassInfo,
  type ClassInput,
} from "../../../services/classService";
import type { ClassMember, ClassRecord } from "../../../types";

const NIM_PATTERN = /^\d{14}$/;

function formatTanggal(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function KelasDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const classId = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();

  const [classData, setClassData] = useState<ClassRecord | null>(null);
  const [classLoading, setClassLoading] = useState(true);
  const [classError, setClassError] = useState<string | null>(null);

  const [members, setMembers] = useState<ClassMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [editVisible, setEditVisible] = useState(false);
  const [editValues, setEditValues] = useState<ClassInput | undefined>();
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [addVisible, setAddVisible] = useState(false);
  const [addNim, setAddNim] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [memberToRemove, setMemberToRemove] = useState<ClassMember | null>(
    null,
  );
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const isClassAssistant =
    !!user && !!classData && classData.assistants.includes(user.id);

  useEffect(() => {
    if (!classId) return;

    const unsubscribe = subscribeClass(
      classId,
      (item) => {
        setClassData(item);
        setClassError(null);
        setClassLoading(false);
      },
      (error) => {
        setClassError(describeFirestoreError(error));
        setClassLoading(false);
      },
    );

    return unsubscribe;
  }, [classId]);

  useEffect(() => {
    if (!classId) return;

    const unsubscribe = subscribeClassMembers(
      classId,
      (items) => {
        setMembers(items);
        setMembersError(null);
        setMembersLoading(false);
      },
      (error) => {
        setMembersError(describeFirestoreError(error));
        setMembersLoading(false);
      },
    );

    return unsubscribe;
  }, [classId]);

  function openEdit() {
    if (!classData) return;
    setEditValues({
      mataKuliah: classData.mataKuliah,
      kodeKelas: classData.kodeKelas,
    });
    setEditError(null);
    setEditVisible(true);
  }

  async function handleEdit(values: ClassInput) {
    if (!classId) return;

    setEditing(true);
    setEditError(null);

    try {
      await updateClassInfo(classId, values);
      setEditVisible(false);
    } catch (error) {
      setEditError(describeFirestoreError(error));
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!classId) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteClass(classId);
      setDeleteVisible(false);
      router.back();
    } catch (error) {
      setDeleteError(describeFirestoreError(error));
    } finally {
      setDeleting(false);
    }
  }

  function openAddMember() {
    setAddNim("");
    setAddError(null);
    setAddVisible(true);
  }

  async function handleAddMember() {
    if (!classId || adding) return;

    const nim = addNim.trim();

    if (!nim) {
      setAddError("NIM peserta wajib diisi");
      return;
    }
    if (!NIM_PATTERN.test(nim)) {
      setAddError(
        "NIM harus terdiri dari 14 digit angka tanpa huruf atau karakter lain",
      );
      return;
    }

    setAdding(true);
    setAddError(null);

    try {
      const found = await findUserByNim(nim);

      if (!found) {
        setAddError(
          "Akun dengan NIM tersebut tidak ditemukan. Pastikan praktikan sudah registrasi.",
        );
        return;
      }
      if (!found.roles.includes("praktikan")) {
        setAddError("Akun ini tidak memiliki peran praktikan.");
        return;
      }
      if (members.some((member) => member.uid === found.uid)) {
        setAddError("Peserta sudah terdaftar di kelas ini.");
        return;
      }

      await addClassMember(classId, found);
      setAddVisible(false);
      setAddNim("");
    } catch (error) {
      setAddError(describeFirestoreError(error));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember() {
    if (!classId || !memberToRemove || removing) return;

    setRemoving(true);
    setRemoveError(null);

    try {
      await removeClassMember(classId, memberToRemove.uid);
      setMemberToRemove(null);
    } catch (error) {
      setRemoveError(describeFirestoreError(error));
    } finally {
      setRemoving(false);
    }
  }

  if (classLoading && classId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <ActivityIndicator color="#1e40af" />
          <Text style={styles.centerText}>Memuat kelas…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!classData) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <AppIcon name="search" size={32} color="#475569" />
          <Text style={styles.notFoundTitle}>Kelas tidak ditemukan</Text>
          {classError && <Text style={styles.centerText}>{classError}</Text>}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </Pressable>
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
          <Text style={styles.backText}>‹ Kembali</Text>
        </Pressable>

        <View style={styles.classCard}>
          <View style={styles.classCardTop}>
            <View style={styles.kodePill}>
              <Text style={styles.kodePillText}>
                Kelas {classData.kodeKelas}
              </Text>
            </View>
            <Text style={styles.createdText}>
              Dibuat {formatTanggal(classData.createdAt)}
            </Text>
          </View>

          <Text style={styles.course}>{classData.mataKuliah}</Text>
          <Text style={styles.meta}>
            {classData.assistants.length} asisten bertanggung jawab
          </Text>

          {isClassAssistant ? (
            <View style={styles.classActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.outlineButton,
                  styles.editButton,
                  pressed && styles.pressed,
                ]}
                onPress={openEdit}
              >
                <Text style={styles.editButtonText}>Ubah</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.outlineButton,
                  styles.deleteButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setDeleteError(null);
                  setDeleteVisible(true);
                }}
              >
                <Text style={styles.deleteButtonText}>Hapus</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.readOnlyNotice}>
              <Text style={styles.readOnlyText}>
                Anda hanya dapat melihat data kelas ini.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Peserta ({members.length})</Text>
          {isClassAssistant && (
            <Pressable
              style={({ pressed }) => [
                styles.addMemberButton,
                pressed && styles.pressed,
              ]}
              onPress={openAddMember}
            >
              <Text style={styles.addMemberText}>＋ Tambah</Text>
            </Pressable>
          )}
        </View>

        {membersError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>{membersError}</Text>
          </View>
        )}

        {membersLoading && (
          <View style={styles.loadingMembers}>
            <ActivityIndicator color="#1e40af" />
          </View>
        )}

        {!membersLoading && members.length === 0 && (
          <View style={styles.emptyMembers}>
            <View style={{ marginBottom: 10 }}>
              <AppIcon name="users" size={28} color="#64748b" />
            </View>
            <Text style={styles.emptyMembersTitle}>Belum ada peserta</Text>
            <Text style={styles.emptyMembersText}>
              Tambahkan peserta dengan NIM akun Labora yang sudah terdaftar.
            </Text>
          </View>
        )}

        {members.map((member, index) => (
          <View key={member.uid} style={styles.memberRow}>
            <View style={styles.memberIndex}>
              <Text style={styles.memberIndexText}>{index + 1}</Text>
            </View>

            <View style={styles.memberInfo}>
              <Text style={styles.memberName} numberOfLines={1}>
                {member.nama || "Tanpa nama"}
              </Text>
              <Text style={styles.memberMeta} numberOfLines={1}>
                NIM {member.nim || "—"} · {member.email || "—"}
              </Text>
            </View>

            {isClassAssistant && (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setRemoveError(null);
                  setMemberToRemove(member);
                }}
              >
                <Text style={styles.removeText}>Hapus</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>

      {editVisible && (
        <ClassFormModal
          visible
          mode="edit"
          initialValues={editValues}
          submitting={editing}
          error={editError}
          onSubmit={handleEdit}
          onClose={() => {
            if (!editing) setEditVisible(false);
          }}
        />
      )}

      <Modal
        visible={deleteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setDeleteVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!deleting) setDeleteVisible(false);
            }}
            accessibilityLabel="Tutup konfirmasi hapus kelas"
          />

          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={[styles.modalIconWrap, styles.modalIconDanger]}>
              <Text style={styles.modalIconDangerText}>!</Text>
            </View>

            <Text style={styles.modalTitle}>Hapus Kelas?</Text>
            <Text style={styles.modalDescription}>
              Kelas {classData.kodeKelas} beserta seluruh data pesertanya akan
              dihapus. Akun pengguna tidak akan terhapus.
            </Text>

            {deleteError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{deleteError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => setDeleteVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalDangerButton,
                  pressed && styles.pressed,
                  deleting && styles.buttonDisabled,
                ]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalDangerText}>Hapus Kelas</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!adding) setAddVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!adding) setAddVisible(false);
            }}
            accessibilityLabel="Tutup form tambah peserta"
          />

          <View style={styles.modalCard} accessibilityViewIsModal>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Tambah Peserta</Text>
              <Text style={styles.modalDescription}>
                Masukkan 14 digit NIM akun praktikan yang sudah terdaftar di Labora.
              </Text>

              {addError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorBoxText}>{addError}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>NIM peserta</Text>
              <TextInput
                style={styles.input}
                value={addNim}
                onChangeText={(text) => {
                  setAddNim(text);
                  setAddError(null);
                }}
                placeholder="Masukkan 14 digit NIM"
                placeholderTextColor="#9ca3af"
                selectionColor="#2563eb"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                maxLength={14}
                editable={!adding}
              />

              <View style={styles.modalActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCancelButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setAddVisible(false)}
                  disabled={adding}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.modalPrimaryButton,
                    pressed && styles.pressed,
                    adding && styles.buttonDisabled,
                  ]}
                  onPress={handleAddMember}
                  disabled={adding}
                >
                  {adding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalPrimaryText}>Tambah Peserta</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={memberToRemove !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!removing) setMemberToRemove(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!removing) setMemberToRemove(null);
            }}
            accessibilityLabel="Tutup konfirmasi hapus peserta"
          />

          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={[styles.modalIconWrap, styles.modalIconDanger]}>
              <Text style={styles.modalIconDangerText}>!</Text>
            </View>

            <Text style={styles.modalTitle}>Hapus Peserta?</Text>
            <Text style={styles.modalDescription}>
              {memberToRemove?.nama || "Peserta"} akan dikeluarkan dari kelas
              ini. Akun Firebase pengguna tidak akan terhapus.
            </Text>

            {removeError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{removeError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => setMemberToRemove(null)}
                disabled={removing}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalDangerButton,
                  pressed && styles.pressed,
                  removing && styles.buttonDisabled,
                ]}
                onPress={handleRemoveMember}
                disabled={removing}
              >
                {removing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalDangerText}>Hapus Peserta</Text>
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
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 32 },

  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backText: { fontSize: 16, color: "#1e40af", fontWeight: "600" },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  centerText: { fontSize: 13, color: "#6b7280", textAlign: "center" },
  notFoundIcon: { fontSize: 48 },
  notFoundTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  backButton: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  backButtonText: { color: "#fff", fontWeight: "700" },

  classCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  classCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  kodePill: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  kodePillText: { fontSize: 12, fontWeight: "700", color: "#1d4ed8" },
  createdText: { fontSize: 11, color: "#9ca3af" },
  course: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  meta: { fontSize: 13, color: "#6b7280" },

  classActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  outlineButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  editButton: { borderColor: "#bfdbfe", backgroundColor: "#eff6ff" },
  editButtonText: { fontSize: 13, fontWeight: "700", color: "#1d4ed8" },
  deleteButton: { borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  deleteButtonText: { fontSize: 13, fontWeight: "700", color: "#dc2626" },
  pressed: { opacity: 0.82 },
  buttonDisabled: { opacity: 0.6 },

  readOnlyNotice: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    marginTop: 16,
  },
  readOnlyText: { fontSize: 12, color: "#6b7280", textAlign: "center" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  addMemberButton: {
    backgroundColor: "#1e40af",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addMemberText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  errorBoxText: { color: "#b91c1c", fontSize: 13 },

  loadingMembers: { paddingVertical: 28, alignItems: "center" },

  emptyMembers: {
    backgroundColor: "#fff",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  emptyMembersIcon: { fontSize: 36, marginBottom: 10 },
  emptyMembersTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  emptyMembersText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  memberIndex: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  memberIndexText: { fontSize: 13, fontWeight: "700", color: "#1e40af" },
  memberInfo: { flex: 1, marginRight: 10 },
  memberName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  memberMeta: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  removeText: { fontSize: 12, fontWeight: "700", color: "#dc2626" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalIconDanger: { backgroundColor: "#fee2e2" },
  modalIconDangerText: {
    fontSize: 24,
    color: "#b91c1c",
    fontWeight: "800",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalCancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  modalCancelText: { fontSize: 14, fontWeight: "700", color: "#374151" },
  modalPrimaryButton: {
    flex: 1.4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
  },
  modalPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  modalDangerButton: {
    flex: 1.4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#dc2626",
  },
  modalDangerText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
