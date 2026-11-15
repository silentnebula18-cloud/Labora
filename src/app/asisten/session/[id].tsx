import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
import ConfirmationBottomSheet, {
  type ConfirmationType,
} from "../../../components/ConfirmationBottomSheet";
import ScheduleFormModal from "../../../components/ScheduleFormModal";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeAssistantClasses,
} from "../../../services/classService";
import {
  isScheduleExpired as checkScheduleExpired,
  subscribeSessionAttendances,
  type AttendanceWithStudent,
  type ScheduleInput,
} from "../../../services/sessionService";
import type { ClassRecord, SessionStatus } from "../../../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTanggal(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWaktu(isoString: string) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatTimestamp(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ─── Komponen Baris Presensi ──────────────────────────────────────────────────

function AttendanceRow({
  item,
  index,
}: {
  item: AttendanceWithStudent;
  index: number;
}) {
  return (
    <View style={styles.attendanceRow}>
      <View style={styles.attendanceIndex}>
        <Text style={styles.attendanceIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.attendanceInfo}>
        <Text style={styles.attendanceName}>{item.namaStudent}</Text>
        <Text style={styles.attendanceNim}>NIM {item.nimStudent}</Text>
      </View>
      <View style={styles.attendanceTime}>
        <Text style={styles.attendanceTimeText}>
          {formatWaktu(item.waktuHadir)}
        </Text>
        <Text style={styles.attendanceTimeLabel}>Hadir pukul</Text>
      </View>
    </View>
  );
}

// ─── Konfigurasi Status ───────────────────────────────────────────────────────

const STATUS_LABEL: Record<SessionStatus, string> = {
  scheduled: "Terjadwal (Belum Dibuka)",
  open: "Sedang Dibuka",
  closed: "Selesai (Ditutup)",
};

const STATUS_STYLE: Record<
  SessionStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  scheduled: {
    bg: "#f8fafc",
    border: "#cbd5e1",
    text: "#334155",
    dot: "#64748b",
  },
  open: {
    bg: "#e6f4ea",
    border: "#b7dfc2",
    text: "#0f5132",
    dot: "#15803d",
  },
  closed: {
    bg: "#f1f5f9",
    border: "#cbd5e1",
    text: "#475569",
    dot: "#94a3b8",
  },
};

// ─── Layar Detail Sesi ────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const {
    getSession,
    getAttendances,
    getEnrolled,
    setSessionStatus,
    updateSchedule,
    deleteSchedule,
    sessions,
  } = useSession();

  const [classes, setClasses] = useState<ClassRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeAssistantClasses(user.id, (items) => {
      setClasses(items);
    });
    return unsubscribe;
  }, [user]);

  const session = useMemo(() => {
    const fromList = id
      ? sessions.find((s) => s.id === id || s.scheduleId === id)
      : undefined;
    return fromList ?? (id ? getSession(id) : null);
  }, [id, sessions, getSession]);

  const [realtimeAttendances, setRealtimeAttendances] = useState<
    AttendanceWithStudent[]
  >([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeSessionAttendances(
      id,
      (items) => {
        setRealtimeAttendances(items);
        setAttendanceLoading(false);
        setAttendanceError(null);
      },
      (err) => {
        setAttendanceError(describeFirestoreError(err));
        setAttendanceLoading(false);
      },
    );
    return unsubscribe;
  }, [id]);

  const attendances = useMemo(() => {
    if (!attendanceLoading) return realtimeAttendances;
    return id ? getAttendances(id) : [];
  }, [id, attendanceLoading, realtimeAttendances, getAttendances]);

  const enrolledCount = useMemo(
    () => (session ? getEnrolled(session.classId) : 0),
    [session, getEnrolled],
  );

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const isScheduleExpired = useMemo(() => {
    return checkScheduleExpired(
      session?.tanggal,
      session?.jamSelesai,
      currentTime,
    );
  }, [session, currentTime]);

  // Auto-close otomatis ke Firestore jika sesi masih berstatus open tetapi jadwal sudah lewat jam selesai
  useEffect(() => {
    if (!session || session.status !== "open" || !isScheduleExpired) return;
    setSessionStatus(session.id, "closed", "system").catch(() => undefined);
  }, [session, isScheduleExpired, setSessionStatus]);

  const [modalType, setModalType] = useState<ConfirmationType | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [editVisible, setEditVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleBukaSesi() {
    if (!session) return;
    setStatusError(null);
    setModalType("buka");
  }

  function handleTutupSesi() {
    if (!session) return;
    setStatusError(null);
    setModalType("tutup");
  }

  async function handleConfirmAction() {
    if (!session || !modalType) return;
    const action = modalType;
    setModalType(null);
    try {
      if (action === "buka") {
        await setSessionStatus(session.id, "open", user?.id);
      } else if (action === "tutup") {
        await setSessionStatus(session.id, "closed", user?.id);
      }
    } catch (error) {
      setStatusError(describeFirestoreError(error));
    }
  }

  async function handleEditSchedule(values: ScheduleInput) {
    if (!session) return;
    const targetClass = classes.find((c) => c.id === values.classId);
    if (!targetClass) {
      setEditError("Kelas yang dipilih tidak ditemukan.");
      return;
    }

    setEditing(true);
    setEditError(null);
    try {
      const scheduleId = session.scheduleId || session.id;
      await updateSchedule(scheduleId, targetClass, values);
      setEditVisible(false);
    } catch (error) {
      setEditError(describeFirestoreError(error));
    } finally {
      setEditing(false);
    }
  }

  async function handleDeleteSchedule() {
    if (!session || deleting) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const scheduleId = session.scheduleId || session.id;
      await deleteSchedule(scheduleId);
      setDeleteVisible(false);
      router.back();
    } catch (error) {
      setDeleteError(describeFirestoreError(error));
    } finally {
      setDeleting(false);
    }
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Jadwal atau sesi tidak ditemukan.
          </Text>
          <Pressable
            style={styles.backBtnFallback}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnFallbackText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hadirCount = attendances.length;
  const statusTheme = STATUS_STYLE[session.status] ?? STATUS_STYLE.scheduled;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <AppIcon name="chevron-left" size={18} color="#2563eb" />
          <Text style={styles.backText}>Kembali</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Detail Sesi</Text>
        <View style={{ width: 68 }} />
      </View>

      <FlatList
        data={attendances}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={() => (
          <>
            {statusError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{statusError}</Text>
              </View>
            )}

            {/* Info Sesi & Jadwal */}
            <View style={styles.sessionCard}>
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: statusTheme.bg,
                      borderColor: statusTheme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: statusTheme.dot },
                    ]}
                  />
                  <Text
                    style={[styles.statusLabel, { color: statusTheme.text }]}
                  >
                    {STATUS_LABEL[session.status]}
                  </Text>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.infoBtn,
                    pressed && styles.infoBtnPressed,
                  ]}
                  onPress={() => setModalType("info")}
                  accessibilityRole="button"
                  accessibilityLabel="Informasi Pendukung Sesi"
                >
                  <AppIcon name="info" size={14} color="#2563eb" />
                  <Text style={styles.infoBtnText}>Info Sesi</Text>
                </Pressable>
              </View>

              <Text style={styles.mataKuliah}>
                {session.practicum.mataKuliah}
              </Text>
              <Text style={styles.namaPraktikum}>
                Pertemuan {session.practicum.nomorPraktikum} ·{" "}
                {session.practicum.namaPraktikum} · Kelas{" "}
                {session.kelas.namaKelas}
              </Text>

              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <View style={styles.detailIconBox}>
                    <AppIcon name="calendar" size={16} color="#2563eb" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Tanggal</Text>
                    <Text style={styles.detailValue}>
                      {formatTanggal(session.tanggal)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconBox}>
                    <AppIcon name="clock" size={16} color="#2563eb" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Waktu Pelaksanaan</Text>
                    <Text style={styles.detailValue}>
                      {session.jamMulai} – {session.jamSelesai} WIB
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={styles.detailIconBox}>
                    <AppIcon name="location" size={16} color="#2563eb" />
                  </View>
                  <View>
                    <Text style={styles.detailLabel}>Ruang Laboratorium</Text>
                    <Text style={styles.detailValue}>{session.ruang}</Text>
                  </View>
                </View>

                {session.openedAt && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconBox}>
                      <AppIcon name="unlock" size={16} color="#0f5132" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Waktu Sesi Dibuka</Text>
                      <Text style={styles.detailValue}>
                        {formatTimestamp(session.openedAt)}
                      </Text>
                    </View>
                  </View>
                )}

                {session.closedAt && (
                  <View style={styles.detailItem}>
                    <View style={styles.detailIconBox}>
                      <AppIcon name="lock" size={16} color="#475569" />
                    </View>
                    <View>
                      <Text style={styles.detailLabel}>Waktu Sesi Ditutup</Text>
                      <Text style={styles.detailValue}>
                        {formatTimestamp(session.closedAt)}
                        {session.closedBy === "system"
                          ? " (Otomatis oleh Sistem)"
                          : ""}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Tombol Kelola Jadwal (Ubah & Hapus) */}
              <View style={styles.scheduleActionsRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.scheduleActionBtn,
                    styles.editScheduleBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={() => {
                    setEditError(null);
                    setEditVisible(true);
                  }}
                >
                  <Text style={styles.editScheduleBtnText}>Ubah Jadwal</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.scheduleActionBtn,
                    styles.deleteScheduleBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={() => {
                    setDeleteError(null);
                    setDeleteVisible(true);
                  }}
                >
                  <Text style={styles.deleteScheduleBtnText}>Hapus Jadwal</Text>
                </Pressable>
              </View>

              {/* Pintasan Pemeriksaan Izin untuk Sesi Ini (SRS 011) */}
              <Pressable
                style={({ pressed }) => [
                  styles.permissionShortcutBtn,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={() =>
                  router.push({
                    pathname: "/asisten/izin",
                    params: { sessionId: session.id },
                  } as any)
                }
              >
                <AppIcon name="clipboard" size={14} color="#2563eb" />
                <Text style={styles.permissionShortcutBtnText}>
                  Periksa Pengajuan Izin Sesi Ini
                </Text>
              </Pressable>
            </View>

            {/* Tombol Aksi Buka / Tutup Sesi */}
            {session.status === "scheduled" && (
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.actionBtnOpen,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={handleBukaSesi}
              >
                <AppIcon name="play" size={16} color="#ffffff" />
                <Text style={styles.actionBtnText}>Buka Sesi Praktikum</Text>
              </Pressable>
            )}

            {session.status === "open" && (
              <>
                {isScheduleExpired && (
                  <View style={styles.sessionWarningBox}>
                    <AppIcon name="alert" size={15} color="#b45309" />
                    <Text style={styles.sessionWarningText}>
                      Waktu jadwal telah melewati pukul {session.jamSelesai} WIB.
                      Silakan tutup sesi jika praktikum telah selesai.
                    </Text>
                  </View>
                )}
                <Pressable
                  style={({ pressed }) => [
                    styles.actionBtn,
                    styles.actionBtnClose,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={handleTutupSesi}
                >
                  <AppIcon name="stop" size={16} color="#ffffff" />
                  <Text style={styles.actionBtnText}>Tutup Sesi Praktikum</Text>
                </Pressable>
              </>
            )}

            {session.status === "closed" && (
              <>
                {!isScheduleExpired ? (
                  <>
                    <View style={styles.closedReopenNotice}>
                      <AppIcon name="info" size={16} color="#2563eb" />
                      <Text style={styles.closedReopenNoticeText}>
                        Sesi saat ini sedang ditutup. Anda dapat membukanya
                        kembali selama rentang waktu praktikum masih berlangsung
                        (sebelum pukul {session.jamSelesai} WIB).
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.actionBtnReopen,
                        pressed && styles.actionBtnPressed,
                      ]}
                      onPress={handleBukaSesi}
                    >
                      <AppIcon name="play" size={16} color="#ffffff" />
                      <Text style={styles.actionBtnText}>
                        Buka Kembali Sesi Praktikum
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.closedBanner}>
                    <AppIcon name="lock" size={18} color="#475569" />
                    <View style={styles.closedBannerContent}>
                      <Text style={styles.closedBannerText}>
                        {session.closedBy === "system"
                          ? "Sesi Ditutup Otomatis oleh Sistem"
                          : "Sesi telah ditutup dan dikunci"}
                      </Text>
                      <Text style={styles.closedBannerSubtext}>
                        Waktu jadwal praktikum telah berakhir (melewati pk{" "}
                        {session.jamSelesai} WIB). Untuk membuka sesi ini
                        kembali, silakan sesuaikan jam selesai melalui tombol
                        &quot;Ubah Jadwal&quot; di atas.
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Header Tabel Presensi */}
            <View style={styles.attendanceHeader}>
              <Text style={styles.attendanceSectionTitle}>Daftar Presensi</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>
                  {hadirCount}/{enrolledCount} hadir
                </Text>
              </View>
            </View>

            {attendanceError ? (
              <View style={styles.emptyAttendance}>
                <View style={styles.emptyAttendanceIconCircle}>
                  <AppIcon name="alert" size={24} color="#dc2626" />
                </View>
                <Text style={[styles.emptyAttendanceText, { color: "#dc2626" }]}>
                  {attendanceError}
                </Text>
              </View>
            ) : (
              hadirCount === 0 && (
                <View style={styles.emptyAttendance}>
                  <View style={styles.emptyAttendanceIconCircle}>
                    <AppIcon name="users" size={24} color="#64748b" />
                  </View>
                  <Text style={styles.emptyAttendanceText}>
                    Belum ada praktikan yang tercatat hadir
                  </Text>
                </View>
              )
            )}
          </>
        )}
        renderItem={({ item, index }) => (
          <AttendanceRow item={item} index={index} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={{ height: 32 }} />}
      />

      {/* Bottom Sheet Konfirmasi Buka/Tutup & Info */}
      <ConfirmationBottomSheet
        visible={modalType !== null}
        type={modalType}
        sessionData={{
          mataKuliah: session.practicum.mataKuliah,
          namaPraktikum: `Pertemuan ${session.practicum.nomorPraktikum} · ${session.practicum.namaPraktikum}`,
          namaKelas: session.kelas.namaKelas,
          ruang: session.ruang,
          tanggal: session.tanggal,
          jamMulai: session.jamMulai,
          jamSelesai: session.jamSelesai,
          status: session.status,
          enrolledCount,
          hadirCount,
        }}
        onConfirm={handleConfirmAction}
        onClose={() => setModalType(null)}
      />

      {/* Modal Ubah Jadwal */}
      {editVisible && (
        <ScheduleFormModal
          visible
          mode="edit"
          classes={classes}
          initialValues={{
            classId: session.classId,
            nomorPraktikum: session.practicum.nomorPraktikum,
            namaPraktikum: session.practicum.namaPraktikum,
            tanggal: session.tanggal,
            jamMulai: session.jamMulai,
            jamSelesai: session.jamSelesai,
            ruang: session.ruang,
          }}
          submitting={editing}
          error={editError}
          onSubmit={handleEditSchedule}
          onClose={() => {
            if (!editing) setEditVisible(false);
          }}
        />
      )}

      {/* Modal Konfirmasi Hapus Jadwal */}
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
            accessibilityLabel="Tutup konfirmasi hapus jadwal"
          />

          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalIconDanger}>
              <AppIcon name="alert" size={24} color="#991b1b" />
            </View>

            <Text style={styles.modalTitle}>Hapus Jadwal & Sesi?</Text>
            <Text style={styles.modalDescription}>
              Jadwal {session.practicum.mataKuliah} (Pertemuan{" "}
              {session.practicum.nomorPraktikum} · Kelas{" "}
              {session.kelas.namaKelas}) beserta data sesinya akan dihapus
              permanen.
            </Text>

            {deleteError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{deleteError}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  pressed && styles.actionBtnPressed,
                ]}
                onPress={() => setDeleteVisible(false)}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalDangerBtn,
                  pressed && styles.actionBtnPressed,
                  deleting && styles.btnDisabled,
                ]}
                onPress={handleDeleteSchedule}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalDangerText}>Hapus</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f5f9" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  loadingText: { fontSize: 15, color: "#64748b", textAlign: "center" },
  backBtnFallback: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnFallbackText: { color: "#fff", fontWeight: "700" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: 68,
  },
  backText: { fontSize: 14.5, color: "#2563eb", fontWeight: "700" },
  topBarTitle: {
    fontSize: 15.5,
    fontWeight: "800",
    color: "#0f172a",
  },

  listContent: { padding: 16 },

  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorBoxText: { color: "#991b1b", fontSize: 13 },

  // Kartu info sesi
  sessionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  infoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  infoBtnPressed: { opacity: 0.75 },
  infoBtnText: { fontSize: 11.5, fontWeight: "700", color: "#2563eb" },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4.5,
    gap: 6,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 11.5, fontWeight: "700" },

  mataKuliah: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  namaPraktikum: { fontSize: 13.5, color: "#475569", marginBottom: 16 },

  detailGrid: { gap: 12 },
  detailItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  detailIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 13.5,
    color: "#0f172a",
    fontWeight: "600",
    marginTop: 1,
  },

  scheduleActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  scheduleActionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  editScheduleBtn: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  editScheduleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
  deleteScheduleBtn: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  deleteScheduleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991b1b",
  },

  // Tombol aksi sesi
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 16,
  },
  actionBtnOpen: { backgroundColor: "#2563eb" },
  actionBtnReopen: { backgroundColor: "#15803d" },
  actionBtnClose: { backgroundColor: "#991b1b" },
  actionBtnPressed: { opacity: 0.85 },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  sessionWarningBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#fefce8",
    borderColor: "#fde047",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  sessionWarningText: {
    flex: 1,
    color: "#854d0e",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },

  closedBanner: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "flex-start",
    marginBottom: 16,
  },
  closedBannerContent: {
    flex: 1,
  },
  closedBannerText: { color: "#334155", fontSize: 14, fontWeight: "700" },
  closedBannerSubtext: {
    color: "#64748b",
    fontSize: 12.5,
    marginTop: 4,
    lineHeight: 18,
  },

  closedReopenNotice: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    alignItems: "center",
    marginBottom: 12,
  },
  closedReopenNoticeText: {
    flex: 1,
    color: "#1e40af",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },

  // Presensi
  attendanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  attendanceSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  countBadge: {
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  countBadgeText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },

  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  attendanceIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  attendanceIndexText: { fontSize: 12.5, fontWeight: "800", color: "#2563eb" },
  attendanceInfo: { flex: 1 },
  attendanceName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  attendanceNim: { fontSize: 12, color: "#64748b", marginTop: 2 },
  attendanceTime: { alignItems: "flex-end" },
  attendanceTimeText: { fontSize: 13.5, fontWeight: "700", color: "#0f5132" },
  attendanceTimeLabel: { fontSize: 11, color: "#64748b", marginTop: 1 },

  emptyAttendance: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  emptyAttendanceIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyAttendanceText: { fontSize: 13, color: "#64748b", fontWeight: "500" },

  // Modal hapus jadwal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
  },
  modalIconDanger: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 6,
  },
  modalDescription: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
  },
  modalDangerBtn: {
    flex: 1.3,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#991b1b",
  },
  modalDangerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  btnDisabled: { opacity: 0.6 },
  permissionShortcutBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  permissionShortcutBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563eb",
  },
});
