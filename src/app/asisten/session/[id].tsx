import { requireOptionalNativeModule } from "expo";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppIcon from "../../../components/AppIcon";
import BottomNavBar from "../../../components/BottomNavBar";
import BottomSheetModal from "../../../components/BottomSheetModal";
import ConfirmationBottomSheet, {
  type ConfirmationType,
} from "../../../components/ConfirmationBottomSheet";
import ScheduleFormModal from "../../../components/ScheduleFormModal";
import { COLORS, RADIUS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useSession } from "../../../context/SessionContext";
import {
  describeFirestoreError,
  subscribeAssistantClasses,
  subscribeClassMembers,
} from "../../../services/classService";
import { subscribeAssistantPermissions } from "../../../services/permissionService";
import {
  isScheduleExpired as checkScheduleExpired,
  subscribeSessionAttendances,
  type AttendanceWithStudent,
  type ScheduleInput,
} from "../../../services/sessionService";
import type {
  ClassMember,
  ClassRecord,
  PermissionRecord,
  SessionStatus,
} from "../../../types";
import { formatJam, formatTanggal } from "../../../utils/format";

function formatJamPendek(isoString: string) {
  return formatJam(isoString);
}

const STATUS_BADGE: Record<
  SessionStatus,
  { label: string; bg: string; text: string }
> = {
  scheduled: {
    label: "Terjadwal",
    bg: COLORS.neutralBadgeBg,
    text: COLORS.neutralBadgeText,
  },
  open: {
    label: "Berlangsung",
    bg: COLORS.successBg,
    text: COLORS.successText,
  },
  closed: {
    label: "Selesai",
    bg: COLORS.neutralBadgeBg,
    text: COLORS.neutralBadgeText,
  },
};

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
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"hadir" | "belum" | "izin">(
    "hadir",
  );
  const [showAllRows, setShowAllRows] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    return subscribeAssistantClasses(user.id, (items) => {
      setClasses(items);
    });
  }, [user]);

  const session = useMemo(() => {
    const fromList = id
      ? sessions.find((s) => s.id === id || s.scheduleId === id)
      : undefined;
    return fromList ?? (id ? getSession(id) : null);
  }, [id, sessions, getSession]);

  useEffect(() => {
    if (!session?.classId) return;
    const unsubMembers = subscribeClassMembers(session.classId, (items) => {
      setMembers(items);
    });
    const unsubPerms = subscribeAssistantPermissions(
      [session.classId],
      (items) => {
        setPermissions(items);
      },
    );
    return () => {
      unsubMembers();
      unsubPerms();
    };
  }, [session?.classId]);

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

  // Catatan "izin" bukan kehadiran fisik — pisahkan dari daftar Hadir (SRS 020).
  const presentAttendances = useMemo(
    () => attendances.filter((a) => a.attendanceStatus !== "izin"),
    [attendances],
  );

  const sessionPermissions = useMemo(() => {
    if (!session) return [];
    return permissions.filter(
      (p) =>
        p.sessionId === session.id ||
        (session.scheduleId && p.sessionId === session.scheduleId),
    );
  }, [permissions, session]);

  const approvedOrPendingPermUids = useMemo(() => {
    const set = new Set<string>();
    sessionPermissions.forEach((p) => {
      if (p.status === "approved" || p.status === "pending") {
        set.add(p.uid);
      }
    });
    return set;
  }, [sessionPermissions]);

  const attendedUids = useMemo(
    () => new Set(attendances.map((a) => a.studentId)),
    [attendances],
  );

  const belumMembers = useMemo(() => {
    return members.filter(
      (m) => !attendedUids.has(m.uid) && !approvedOrPendingPermUids.has(m.uid),
    );
  }, [members, attendedUids, approvedOrPendingPermUids]);

  const enrolledCount = useMemo(() => {
    if (members.length > 0) return members.length;
    return session ? getEnrolled(session.classId) : 0;
  }, [members.length, session, getEnrolled]);

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

  async function handleCopyCode() {
    if (!session?.kodePresensi) return;
    const codeOnly = session.kodePresensi.trim();
    try {
      const nativeClipboard = requireOptionalNativeModule<{
        setStringAsync?: (
          text: string,
          options?: Record<string, unknown>,
        ) => Promise<boolean>;
      }>("ExpoClipboard");
      if (nativeClipboard?.setStringAsync) {
        await nativeClipboard.setStringAsync(codeOnly, {});
      } else if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(codeOnly);
      } else {
        throw new Error("ExpoClipboard unavailable");
      }
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await Share.share({ message: codeOnly });
      } catch {
        // Abaikan jika dialog dibatalkan
      }
    }
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Jadwal atau sesi tidak ditemukan.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>Kembali</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const hadirCount = presentAttendances.length;
  const izinCount = sessionPermissions.filter(
    (p) => p.status !== "rejected",
  ).length;
  const belumCount =
    members.length > 0
      ? belumMembers.length
      : Math.max(0, enrolledCount - hadirCount - izinCount);
  const progressRatio =
    enrolledCount > 0
      ? Math.min(100, Math.round(((hadirCount + izinCount) / enrolledCount) * 100))
      : 0;

  const badge = STATUS_BADGE[session.status] ?? STATUS_BADGE.scheduled;
  const displayedAttendances = showAllRows
    ? presentAttendances
    : presentAttendances.slice(0, 6);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />

      {/* Header Sesuai Layar `Pantau presensi` */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
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
            <Text style={styles.headerTitle}>Pantau Presensi</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.moreMenuBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => setActionSheetVisible(true)}
            accessibilityLabel="Menu aksi sesi"
            hitSlop={8}
          >
            <AppIcon
              name="more-vertical"
              size={19}
              color={COLORS.textPrimary}
            />
          </Pressable>
        </View>

        <Text style={styles.headerSubtitle}>
          {session.practicum.mataKuliah} · {session.kelas.namaKelas}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {(statusError || attendanceError) && (
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>
              {statusError || attendanceError}
            </Text>
          </View>
        )}

        {/* Kartu Utama Kode Sesi & 3 Statistik Real-Time */}
        <View style={styles.heroMonitorCard}>
          <View style={styles.codeHeaderRow}>
            <View style={styles.codeLeftCol}>
              <Text style={styles.codeOverline}>KODE SESI</Text>
              <View style={styles.codeValueRow}>
                <Text
                  style={styles.codeBigText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {session.kodePresensi || "—"}
                </Text>
                {session.kodePresensi ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.copyIconBtn,
                      pressed && { opacity: 0.65 },
                    ]}
                    onPress={handleCopyCode}
                    accessibilityLabel="Salin kode sesi"
                    hitSlop={8}
                  >
                    <AppIcon
                      name={copied ? "check" : "copy"}
                      size={18}
                      color={COLORS.primary}
                    />
                    {copied ? (
                      <Text style={styles.copiedHint}>Disalin</Text>
                    ) : null}
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View
              style={[styles.statusPill, { backgroundColor: badge.bg }]}
            >
              <Text style={[styles.statusPillText, { color: badge.text }]}>
                {badge.label}
              </Text>
            </View>
          </View>

          <Text style={styles.sessionSubDetail}>
            Pertemuan {String(session.practicum.nomorPraktikum).padStart(2, "0")}{" "}
            · {session.practicum.namaPraktikum} · {formatTanggal(session.tanggal)}{" "}
            ({formatJam(session.jamMulai).replace(":", ".")}–
            {formatJam(session.jamSelesai).replace(":", ".")}) · {session.ruang}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statNumber, { color: COLORS.primary }]}>
                {hadirCount}
              </Text>
              <Text style={styles.statLabel}>Hadir</Text>
            </View>

            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{izinCount}</Text>
              <Text style={styles.statLabel}>Izin</Text>
            </View>

            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{belumCount}</Text>
              <Text style={styles.statLabel}>Belum</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressRatio}%` }]}
            />
          </View>

          {/* Tombol Kontrol Siklus Sesi */}
          <View style={styles.lifecycleWrap}>
            {session.status === "scheduled" && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={() => {
                  setStatusError(null);
                  setModalType("buka");
                }}
              >
                <AppIcon name="play" size={15} color={COLORS.textOnPrimary} />
                <Text style={styles.primaryBtnText}>Buka Sesi Praktikum</Text>
              </Pressable>
            )}

            {session.status === "open" && (
              <Pressable
                style={({ pressed }) => [
                  styles.closeSessionBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => {
                  setStatusError(null);
                  setModalType("tutup");
                }}
              >
                <AppIcon name="stop" size={14} color={COLORS.dangerText} />
                <Text style={styles.closeSessionBtnText}>
                  Tutup Sesi Praktikum
                </Text>
              </Pressable>
            )}

            {session.status === "closed" && !isScheduleExpired && (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  pressed && styles.primaryBtnPressed,
                ]}
                onPress={() => {
                  setStatusError(null);
                  setModalType("buka");
                }}
              >
                <AppIcon name="play" size={15} color={COLORS.textOnPrimary} />
                <Text style={styles.primaryBtnText}>
                  Buka Kembali Sesi Praktikum
                </Text>
              </Pressable>
            )}

            {session.status === "closed" && isScheduleExpired && (
              <Text style={styles.lockedHint}>
                Waktu jadwal sesi telah berakhir. Sesuaikan jam melalui tombol
                ubah jadwal di kanan atas bila perlu membuka kembali.
              </Text>
            )}
          </View>
        </View>

        {/* Segmented Control 3 Tab: Hadir | Belum | Izin */}
        <View style={styles.segmentedTrack}>
          <Pressable
            style={[
              styles.segmentBtn,
              activeTab === "hadir" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("hadir")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "hadir" && styles.segmentTextActive,
              ]}
            >
              Hadir ({hadirCount})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentBtn,
              activeTab === "belum" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("belum")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "belum" && styles.segmentTextActive,
              ]}
            >
              Belum ({belumCount})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.segmentBtn,
              activeTab === "izin" && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab("izin")}
          >
            <Text
              style={[
                styles.segmentText,
                activeTab === "izin" && styles.segmentTextActive,
              ]}
            >
              Izin ({sessionPermissions.length})
            </Text>
          </Pressable>
        </View>

        {/* Isi Daftar Berdasarkan Tab */}
        {activeTab === "hadir" ? (
          attendanceLoading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.emptySub}>Memuat daftar hadir…</Text>
            </View>
          ) : presentAttendances.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Belum ada yang presensi</Text>
              <Text style={styles.emptySub}>
                Praktikan yang melakukan presensi dengan kode sesi akan otomatis
                muncul secara real-time di sini.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.listCard}>
                {displayedAttendances.map((item, idx) => {
                  const isLast = idx === displayedAttendances.length - 1;
                  return (
                    <View
                      key={item.id}
                      style={[styles.studentRow, !isLast && styles.rowDivider]}
                    >
                      <View style={styles.checkBoxMint}>
                        <AppIcon
                          name="check"
                          size={16}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={styles.studentMeta}>
                        <Text
                          style={styles.studentName}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.namaStudent}
                        </Text>
                        <Text
                          style={styles.studentNim}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.nimStudent}
                        </Text>
                      </View>
                      <View style={styles.attendanceRightCol}>
                        <Text
                          style={styles.timeRight}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {formatJamPendek(item.waktuHadir)}
                        </Text>
                        <Text
                          style={
                            item.latenessStatus === "late"
                              ? styles.lateTag
                              : styles.onTimeTag
                          }
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.latenessStatus === "late"
                            ? `Terlambat ${item.lateMinutes ?? 0} mnt`
                            : "Tepat waktu"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {presentAttendances.length > 6 && (
                <View style={styles.listFooterRow}>
                  <Text style={styles.listFooterCount}>
                    Menampilkan {displayedAttendances.length} dari{" "}
                    {presentAttendances.length} praktikan
                  </Text>
                  <Pressable onPress={() => setShowAllRows((v) => !v)}>
                    <Text style={styles.listFooterLink}>
                      {showAllRows ? "Ringkas" : "Lihat semua"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </>
          )
        ) : activeTab === "belum" ? (
          belumMembers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                {members.length === 0
                  ? "Belum ada daftar peserta kelas"
                  : "Seluruh praktikan sudah tercatat"}
              </Text>
              <Text style={styles.emptySub}>
                {members.length === 0
                  ? "Tambahkan peserta di halaman Detail Kelas."
                  : "Semua peserta kelas telah hadir atau mengajukan izin."}
              </Text>
            </View>
          ) : (
            <View style={styles.listCard}>
              {belumMembers.map((m, idx) => {
                const isLast = idx === belumMembers.length - 1;
                return (
                  <View
                    key={m.uid}
                    style={[styles.studentRow, !isLast && styles.rowDivider]}
                  >
                    <View style={styles.pendingDotBox}>
                      <AppIcon
                        name="clock"
                        size={15}
                        color={COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.studentMeta}>
                      <Text
                        style={styles.studentName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {m.nama}
                      </Text>
                      <Text
                        style={styles.studentNim}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {m.nim}
                      </Text>
                    </View>
                    <Text
                      style={styles.statusTagMuted}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Belum
                    </Text>
                  </View>
                );
              })}
            </View>
          )
        ) : sessionPermissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Tidak ada pengajuan izin</Text>
            <Text style={styles.emptySub}>
              Belum ada praktikan yang mengajukan izin pada sesi ini.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {sessionPermissions.map((p, idx) => {
              const isLast = idx === sessionPermissions.length - 1;
              return (
                <Pressable
                  key={p.id}
                  style={[styles.studentRow, !isLast && styles.rowDivider]}
                  onPress={() => router.push(`/asisten/izin/${p.id}` as any)}
                >
                  <View style={styles.checkBoxMint}>
                    <AppIcon
                      name="file-text"
                      size={16}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.studentMeta}>
                    <Text
                      style={styles.studentName}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {p.nama}
                    </Text>
                    <Text
                      style={styles.studentNim}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {p.nim} · {p.alasan}
                    </Text>
                  </View>
                  <View style={styles.permRightRow}>
                    <Text
                      style={[
                        styles.permStatusText,
                        p.status === "approved"
                          ? { color: COLORS.primary }
                          : p.status === "rejected"
                            ? { color: COLORS.dangerText }
                            : { color: COLORS.warningText },
                      ]}
                    >
                      {p.status === "approved"
                        ? "Disetujui"
                        : p.status === "rejected"
                          ? "Ditolak"
                          : "Menunggu"}
                    </Text>
                    <AppIcon
                      name="chevron-right"
                      size={15}
                      color={COLORS.textSecondary}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <BottomNavBar role="asisten" activeTab="kelas" />

      {/* Bottom Sheet Menu Aksi Sesi (Titik 3 — Tanpa Ikon & Tanpa Tombol Batal) */}
      <BottomSheetModal
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        contentStyle={styles.actionSheetContent}
      >
        <Text style={styles.actionSheetTitle}>Opsi Sesi</Text>

        <Pressable
          style={({ pressed }) => [
            styles.actionSheetItem,
            pressed && styles.actionSheetItemPressed,
          ]}
          onPress={() => {
            setActionSheetVisible(false);
            setModalType("info");
          }}
        >
          <Text style={styles.actionSheetItemText}>Rincian sesi</Text>
        </Pressable>

        <View style={styles.actionSheetDivider} />

        <Pressable
          style={({ pressed }) => [
            styles.actionSheetItem,
            pressed && styles.actionSheetItemPressed,
          ]}
          onPress={() => {
            setActionSheetVisible(false);
            setEditError(null);
            setEditVisible(true);
          }}
        >
          <Text style={styles.actionSheetItemText}>Edit jadwal</Text>
        </Pressable>

        <View style={styles.actionSheetDivider} />

        <Pressable
          style={({ pressed }) => [
            styles.actionSheetItem,
            pressed && styles.actionSheetItemPressed,
          ]}
          onPress={() => {
            setActionSheetVisible(false);
            setDeleteError(null);
            setDeleteVisible(true);
          }}
        >
          <Text
            style={[
              styles.actionSheetItemText,
              styles.actionSheetDangerText,
            ]}
          >
            Hapus sesi
          </Text>
        </Pressable>
      </BottomSheetModal>

      {/* Bottom Sheet Konfirmasi Buka/Tutup/Info */}
      <ConfirmationBottomSheet
        visible={!!modalType}
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
          asistenNama: user?.nama,
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

      {/* Modal Hapus Jadwal */}
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
            <Text style={styles.modalTitle}>Hapus Sesi Praktikum?</Text>
            <Text style={styles.modalSubtitle}>
              Pertemuan {session.practicum.nomorPraktikum} (
              {session.practicum.namaPraktikum}) pada Kelas{" "}
              {session.kelas.namaKelas} akan dihapus permanen.
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
                style={[styles.dangerBtn, deleting && { opacity: 0.7 }]}
                onPress={handleDeleteSchedule}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color={COLORS.textOnPrimary} />
                ) : (
                  <Text style={styles.dangerBtnText}>Hapus Sesi</Text>
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
  content: { paddingHorizontal: 16, paddingBottom: 24 },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  loadingText: { fontSize: 13, color: COLORS.textSecondary },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginTop: 3,
    marginLeft: 28,
  },
  moreMenuBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSheetContent: {
    paddingHorizontal: 16,
  },
  actionSheetTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    paddingVertical: 6,
    marginBottom: 4,
  },
  actionSheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  actionSheetItemPressed: {
    opacity: 0.7,
  },
  actionSheetItemText: {
    fontSize: 14.5,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  actionSheetDangerText: {
    color: COLORS.dangerText,
  },
  actionSheetDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: 11,
    marginBottom: 12,
  },
  errorBoxText: { fontSize: 12, color: COLORS.dangerDark },

  heroMonitorCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  codeHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  codeLeftCol: {
    flex: 1,
    minWidth: 0,
  },
  codeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },
  codeOverline: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 0.4,
  },
  codeBigText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 1,
    flexShrink: 1,
  },
  statusPill: {
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  copyIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  copiedHint: {
    fontSize: 11.5,
    fontWeight: "600",
    color: COLORS.primary,
  },
  sessionSubDetail: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    marginTop: 8,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statCol: {
    flex: 1,
    gap: 2,
  },
  statNumber: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    height: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
  },
  lifecycleWrap: {
    marginTop: 14,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  primaryBtnPressed: {
    backgroundColor: COLORS.primaryPressed,
  },
  primaryBtnText: {
    color: COLORS.textOnPrimary,
    fontSize: 13.5,
    fontWeight: "700",
  },
  closeSessionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  closeSessionBtnText: {
    color: COLORS.dangerText,
    fontSize: 13.5,
    fontWeight: "700",
  },
  lockedHint: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    lineHeight: 17,
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
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
  },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  checkBoxMint: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingDotBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  studentMeta: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  studentName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  studentNim: {
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  timeRight: {
    fontSize: 12.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  attendanceRightCol: {
    alignItems: "flex-end",
    gap: 2,
  },
  onTimeTag: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.successText,
  },
  lateTag: {
    fontSize: 10.5,
    fontWeight: "600",
    color: COLORS.warningText,
  },
  statusTagMuted: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  permRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  permStatusText: {
    fontSize: 12,
    fontWeight: "700",
  },

  listFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 2,
  },
  listFooterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  listFooterLink: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },

  emptyCard: {
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
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
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  dangerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.dangerText,
    alignItems: "center",
  },
  dangerBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
});
