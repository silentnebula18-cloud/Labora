import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
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
import BottomNavBar from "../../../components/BottomNavBar";
import ClassFormModal from "../../../components/ClassFormModal";
import ScheduleFormModal from "../../../components/ScheduleFormModal";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
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
import type { ScheduleInput } from "../../../services/sessionService";
import type { ClassMember, ClassRecord, SessionStatus } from "../../../types";
import { formatJam, formatTanggal } from "../../../utils/format";

const NIM_PATTERN = /^\d{14}$/;

const SESSION_BADGE: Record<
  SessionStatus,
  { label: string; bg: string; text: string }
> = {
  open: {
    label: "Berlangsung",
    bg: COLORS.successBg,
    text: COLORS.successText,
  },
  scheduled: {
    label: "Terjadwal",
    bg: COLORS.neutralBadgeBg,
    text: COLORS.neutralBadgeText,
  },
  closed: {
    label: "Selesai",
    bg: COLORS.neutralBadgeBg,
    text: COLORS.neutralBadgeText,
  },
};

function formatDibuat(date: Date | null): string {
  return formatTanggal(date);
}

function getInitials(nama: string): string {
  const parts = nama.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function KelasDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const classId = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();
  const { sessions, createSchedule } = useSession();

  const [activeTab, setActiveTab] = useState<"sesi" | "praktikan">("sesi");

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

  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

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

  // Distribusi peserta kelas merupakan wewenang Aslab (SRS 019).
  const canManageMembers =
    !!user &&
    (user.activeRole === "aslab" ||
      (Array.isArray(user.roles) && user.roles.includes("aslab")));

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

  const classSessions = useMemo(() => {
    return sessions
      .filter((s) => s.classId === classId)
      .sort(
        (a, b) =>
          (b.practicum?.nomorPraktikum ?? 0) -
          (a.practicum?.nomorPraktikum ?? 0),
      );
  }, [sessions, classId]);

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

  async function handleCreateSchedule(values: ScheduleInput) {
    if (!classData) return;
    setCreatingSchedule(true);
    setScheduleError(null);
    try {
      await createSchedule(classData, values);
      setScheduleModalVisible(false);
    } catch (error) {
      setScheduleError(describeFirestoreError(error));
    } finally {
      setCreatingSchedule(false);
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
      setAddError("NIM wajib diisi");
      return;
    }
    if (!NIM_PATTERN.test(nim)) {
      setAddError("NIM harus terdiri dari 14 digit angka");
      return;
    }
    if (user?.nim && nim === user.nim.trim()) {
      setAddError("Tidak dapat mendaftarkan NIM sendiri");
      return;
    }

    setAdding(true);
    setAddError(null);

    try {
      const found = await findUserByNim(nim);

      if (!found) {
        setAddError("NIM tidak ditemukan");
        return;
      }
      if (
        found.uid === user?.id ||
        (classData && classData.assistants.includes(found.uid))
      ) {
        setAddError("Tidak dapat mendaftarkan asisten kelas");
        return;
      }
      if (!found.roles.includes("praktikan")) {
        setAddError("Akun bukan praktikan");
        return;
      }
      if (members.some((member) => member.uid === found.uid)) {
        setAddError("Peserta sudah terdaftar");
        return;
      }

      await addClassMember(classId, found, classData?.assistants ?? []);
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
        <StatusBar style="dark" />
        <View style={styles.centerBox}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.centerText}>Memuat kelas…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!classData) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.centerBox}>
          <AppIcon name="search" size={30} color={COLORS.primary} />
          <Text style={styles.notFoundTitle}>Kelas tidak ditemukan</Text>
          {classError && <Text style={styles.centerText}>{classError}</Text>}
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const nextSess =
    classSessions.find((s) => s.status !== "closed") ?? classSessions[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Navbar: Judul 'Detail kelas' */}
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
            <Text style={styles.headerTitle}>Detail Kelas</Text>
          </Pressable>
        </View>

        {/* Kartu Ringkasan Kelas (Nama Kelas & Kode Kelas di dalam Card) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.kodePill}>
              <Text
                style={styles.kodePillText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Kelas {classData.kodeKelas}
              </Text>
            </View>
            <Text
              style={styles.summaryCountText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {members.length} praktikan
            </Text>
          </View>

          <Text
            style={styles.classNameInCard}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {classData.mataKuliah}
          </Text>
          <Text
            style={styles.createdMetaText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Dibuat {formatDibuat(classData.createdAt)}
          </Text>

          <View style={styles.summaryDivider} />

          <View style={styles.metaRow}>
            <AppIcon name="clock" size={14} color={COLORS.textSecondary} />
            <Text
              style={styles.metaText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {nextSess
                ? `${formatTanggal(nextSess.tanggal)} · ${formatJam(nextSess.jamMulai)}–${formatJam(nextSess.jamSelesai)}`
                : "Belum ada sesi terjadwal"}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <AppIcon name="location" size={14} color={COLORS.textSecondary} />
            <Text
              style={styles.metaText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {nextSess
                ? nextSess.ruang
                : `${classData.assistants.length} asisten pengampu`}
            </Text>
          </View>

          {isClassAssistant && (
            <View style={styles.classActionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.smallActionBtn,
                  pressed && styles.pressed,
                ]}
                onPress={openEdit}
              >
                <AppIcon name="edit" size={14} color={COLORS.primary} />
                <Text style={styles.smallActionText}>Ubah kelas</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.smallActionBtn,
                  styles.smallActionDanger,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setDeleteError(null);
                  setDeleteVisible(true);
                }}
              >
                <AppIcon name="trash" size={14} color={COLORS.dangerText} />
                <Text style={styles.smallActionDangerText}>Hapus</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Segmented Control: Sesi Praktikum | Praktikan */}
        <View style={styles.segmentedTrack}>
          <Pressable
            style={[
              styles.segmentBtn,
              activeTab === "sesi" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("sesi")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "sesi" && styles.segmentTextActive,
              ]}
            >
              Sesi Praktikum
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentBtn,
              activeTab === "praktikan" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("praktikan")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "praktikan" && styles.segmentTextActive,
              ]}
            >
              Praktikan ({members.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === "sesi" ? (
          <>
            {isClassAssistant && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.createSessionBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={() => {
                  setScheduleError(null);
                  setScheduleModalVisible(true);
                }}
              >
                <AppIcon name="plus" size={17} color={COLORS.textOnPrimary} />
                <Text style={styles.primaryBtnText}>Buat sesi baru</Text>
              </Pressable>
            )}

            {classSessions.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <AppIcon name="calendar" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>Belum ada sesi praktikum</Text>
                <Text style={styles.emptySub}>
                  Tekan tombol Buat sesi baru di atas untuk menjadwalkan
                  pertemuan kelas ini.
                </Text>
              </View>
            ) : (
              classSessions.map((sess) => {
                const badge =
                  SESSION_BADGE[sess.status] ?? SESSION_BADGE.scheduled;
                const noStr = String(
                  sess.practicum?.nomorPraktikum ?? 1,
                ).padStart(2, "0");

                const openSessDetail = () =>
                  router.push({
                    pathname: "/asisten/session/[id]",
                    params: { id: sess.id },
                  } as any);

                return (
                  <Pressable
                    key={sess.id}
                    style={({ pressed }) => [
                      styles.sessionCard,
                      pressed && styles.pressed,
                    ]}
                    onPress={openSessDetail}
                  >
                    <View style={styles.sessionCardTop}>
                      <View style={styles.sessionHeaderLeft}>
                        <View style={styles.sessionIconBox}>
                          <AppIcon
                            name="calendar"
                            size={15}
                            color={COLORS.primary}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            style={styles.sessionOverline}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            Pertemuan {noStr}
                          </Text>
                          <Text
                            style={styles.sessionDateSub}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {formatTanggal(sess.tanggal)}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: badge.bg,
                            borderColor:
                              sess.status === "open"
                                ? COLORS.primaryBorder
                                : COLORS.border,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.statusPillText, { color: badge.text }]}
                        >
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <Text
                      style={styles.sessionTopic}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {sess.practicum?.namaPraktikum ?? "Sesi Praktikum"}
                    </Text>

                    <Text
                      style={styles.sessionTimeMeta}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatJam(sess.jamMulai)}–{formatJam(sess.jamSelesai)}{" "}
                      WIB
                    </Text>

                    <View style={styles.sessionFooterRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.sessionFooterLabel}>
                          Laboratorium
                        </Text>
                        <Text
                          style={styles.sessionFooterValue}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {sess.ruang}
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.detailCtaBtn,
                          pressed && styles.primaryBtnPressed,
                        ]}
                        onPress={openSessDetail}
                      >
                        <Text style={styles.detailCtaBtnText}>
                          Lihat detail
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })
            )}
          </>
        ) : (
          /* Tab Praktikan (Daftar Peserta Kelas) */
          <>
            {canManageMembers && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.createSessionBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={openAddMember}
              >
                <AppIcon name="plus" size={17} color={COLORS.textOnPrimary} />
                <Text style={styles.primaryBtnText}>Tambah praktikan</Text>
              </Pressable>
            )}

            {membersLoading && (
              <View style={styles.centerInline}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.centerText}>Memuat peserta…</Text>
              </View>
            )}

            {membersError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{membersError}</Text>
              </View>
            )}

            {!membersLoading && !membersError && members.length === 0 && (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <AppIcon name="users" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>Belum ada praktikan</Text>
                <Text style={styles.emptySub}>
                  Tambahkan mahasiswa ke kelas ini menggunakan 14 digit NIM.
                </Text>
              </View>
            )}

            {!membersLoading && members.length > 0 && (
              <View style={styles.memberListCard}>
                {members.map((m, idx) => {
                  const isLast = idx === members.length - 1;
                  return (
                    <View
                      key={m.uid}
                      style={[
                        styles.memberRow,
                        !isLast && styles.memberDivider,
                      ]}
                    >
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarText}>
                          {getInitials(m.nama)}
                        </Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text
                          style={styles.memberName}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {m.nama}
                        </Text>
                        <Text
                          style={styles.memberNim}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {m.nim}
                        </Text>
                      </View>
                      {canManageMembers && (
                        <Pressable
                          style={styles.removeMemberBtn}
                          onPress={() => {
                            setRemoveError(null);
                            setMemberToRemove(m);
                          }}
                          hitSlop={8}
                        >
                          <AppIcon
                            name="trash"
                            size={16}
                            color={COLORS.dangerText}
                          />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <BottomNavBar role="asisten" activeTab="kelas" />

      {/* Modal Ubah Kelas */}
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

      {/* Modal Buat Sesi Baru */}
      {scheduleModalVisible && (
        <ScheduleFormModal
          visible
          mode="create"
          classes={[classData]}
          initialValues={{
            classId: classData.id,
            namaPraktikum: "",
            tanggal: new Date(),
            jamMulai: (() => {
              const d = new Date();
              d.setHours(7, 40, 0, 0);
              return d;
            })(),
            jamSelesai: (() => {
              const d = new Date();
              d.setHours(9, 40, 0, 0);
              return d;
            })(),
            ruang: nextSess?.ruang ?? "",
          }}
          submitting={creatingSchedule}
          error={scheduleError}
          onSubmit={handleCreateSchedule}
          onClose={() => {
            if (!creatingSchedule) setScheduleModalVisible(false);
          }}
        />
      )}

      {/* Modal Tambah Praktikan (NIM) */}
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
            onPress={adding ? undefined : () => setAddVisible(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Tambah Praktikan</Text>
            <Text style={styles.modalSubtitle}>
              Masukkan 14 digit NIM mahasiswa yang sudah memiliki akun Labora.
            </Text>

            {addError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{addError}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>
              NIM mahasiswa <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, addError && styles.inputError]}
              value={addNim}
              onChangeText={(t) => {
                setAddNim(t.replace(/[^\d]/g, "").slice(0, 14));
                setAddError(null);
              }}
              placeholder="Contoh: 24060122140001"
              placeholderTextColor={COLORS.textMuted}
              selectionColor={COLORS.primary}
              keyboardType="number-pad"
              maxLength={14}
              editable={!adding}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setAddVisible(false)}
                disabled={adding}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, adding && { opacity: 0.7 }]}
                onPress={handleAddMember}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.confirmBtnText}>Tambah</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Konfirmasi Hapus Peserta */}
      <Modal
        visible={!!memberToRemove}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!removing) setMemberToRemove(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={removing ? undefined : () => setMemberToRemove(null)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Keluarkan Praktikan?</Text>
            <Text style={styles.modalSubtitle}>
              {memberToRemove?.nama} ({memberToRemove?.nim}) akan dihapus dari
              daftar peserta Kelas {classData.kodeKelas}.
            </Text>

            {removeError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{removeError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setMemberToRemove(null)}
                disabled={removing}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.dangerConfirmBtn, removing && { opacity: 0.7 }]}
                onPress={handleRemoveMember}
                disabled={removing}
              >
                {removing ? (
                  <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.confirmBtnText}>Keluarkan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Konfirmasi Hapus Kelas */}
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
            onPress={deleting ? undefined : () => setDeleteVisible(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Hapus Kelas Praktikum?</Text>
            <Text style={styles.modalSubtitle}>
              Kelas {classData.kodeKelas} ({classData.mataKuliah}) beserta data
              pesertanya akan dihapus secara permanen.
            </Text>

            {deleteError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{deleteError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setDeleteVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.dangerConfirmBtn, deleting && { opacity: 0.7 }]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.confirmBtnText}>Hapus Kelas</Text>
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
  safe: { flex: 1, backgroundColor: COLORS.surfaceSubtle },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 24 },
  pressed: { opacity: 0.88 },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  centerInline: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  centerText: { fontSize: 12.5, color: COLORS.textSecondary },
  notFoundTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  headerBlock: {
    marginBottom: 12,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },

  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    marginBottom: 14,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  kodePill: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: RADIUS.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  kodePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  summaryCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  classNameInCard: {
    fontSize: 15.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  createdMetaText: {
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    minWidth: 0,
  },
  classActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 2,
  },
  smallActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  smallActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.primary,
  },
  smallActionDanger: {
    borderColor: COLORS.dangerBorder,
    backgroundColor: COLORS.dangerBg,
  },
  smallActionDangerText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.dangerText,
  },

  segmentedTrack: {
    flexDirection: "row",
    backgroundColor: COLORS.segmentedTrack,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBtnActive: {
    backgroundColor: COLORS.background,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  createSessionBtn: {
    marginBottom: 14,
  },
  primaryBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 14,
    fontWeight: "700",
  },

  sessionCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  sessionCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  sessionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sessionIconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionOverline: {
    fontSize: 12.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sessionDateSub: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: 10,
  },
  sessionTopic: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  sessionTimeMeta: {
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  sessionFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
  },
  sessionFooterLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  sessionFooterValue: {
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

  memberListCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 10,
  },
  memberDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  memberNim: {
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  removeMemberBtn: {
    padding: 7,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.dangerBg,
  },

  emptyCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIconCircle: {
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
  emptySub: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 11,
    marginBottom: 10,
  },
  errorBoxText: {
    fontSize: 12,
    color: COLORS.dangerDark,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 5,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  requiredMark: {
    color: COLORS.dangerText,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  inputError: {
    borderColor: COLORS.dangerText,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerText,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
