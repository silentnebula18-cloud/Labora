import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";
import {
  AuthorizationStatus,
  getToken,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";

import { db, messaging } from "../lib/firebase";
import type {
  AppNotification,
  ClassRecord,
  NotificationType,
  ScheduleInput,
} from "../types";
import { sendFCMv1Push } from "./fcmSenderService";

// Inisialisasi background message handler sekali di level modul
if (messaging) {
  try {
    setBackgroundMessageHandler(messaging, async (remoteMessage: RemoteMessage) => {
      console.log("[FCM] Background message received:", remoteMessage.messageId);
    });
  } catch (err) {
    console.warn("[FCM] Error setting background message handler:", err);
  }
}

type MessageListener = (message: RemoteMessage) => void;
const foregroundListeners = new Set<MessageListener>();

export function addForegroundMessageListener(listener: MessageListener): () => void {
  foregroundListeners.add(listener);
  return () => {
    foregroundListeners.delete(listener);
  };
}

/**
 * Memeriksa apakah izin notifikasi sistem telah diberikan oleh pengguna (SRS-018).
 */
export async function checkNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
      const postNotifPerm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      if (postNotifPerm) {
        const runtimeGranted = await PermissionsAndroid.check(postNotifPerm);
        if (!runtimeGranted) {
          return false;
        }
      }
    }
    if (!messaging) return false;
    const status = await hasPermission(messaging);
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch (err) {
    console.warn("[FCM] Gagal memeriksa status izin notifikasi:", err);
    return false;
  }
}

/**
 * Meminta izin notifikasi ke sistem operasi perangkat (Android 13+ runtime dialog & iOS) (SRS-018).
 */
export async function requestNotificationPermissionAgain(): Promise<boolean> {
  try {
    if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
      const postNotifPerm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
      if (postNotifPerm) {
        const result = await PermissionsAndroid.request(postNotifPerm);
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
      }
    }
    if (!messaging) return false;
    const status = await requestPermission(messaging);
    const isAuthorized =
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL;
    if (!isAuthorized) return false;

    return await checkNotificationPermission();
  } catch (err) {
    console.warn("[FCM] Gagal meminta izin notifikasi:", err);
    return false;
  }
}

/**
 * Inisialisasi FCM untuk pengguna yang sedang aktif (SRS-017 & SRS-018).
 * Meminta izin notifikasi, mengambil token FCM, menyimpannya ke profil pengguna,
 * dan mendaftarkan listener untuk pembaruan token.
 */
export async function initFCM(userId: string): Promise<() => void> {
  if (!messaging) {
    console.warn("[FCM] Messaging module tidak tersedia.");
    return () => undefined;
  }

  const cleanups: (() => void)[] = [];

  try {
    const isAuthorized = await requestNotificationPermissionAgain();

    if (isAuthorized) {
      try {
        const token = await getToken(messaging);
        if (token) {
          console.log("[FCM] FCM Token didapatkan:", token.substring(0, 12) + "...");
          // Simpan token ke dokumen users di Firestore
          await setDoc(
            doc(db, "users", userId),
            {
              fcmToken: token,
              fcmTokenUpdatedAt: serverTimestamp(),
            },
            { merge: true },
          ).catch((e) => {
            console.warn("[FCM] Belum dapat menyimpan token ke Firestore (cek security rules):", e?.message);
          });
        }
      } catch (tokenErr) {
        console.warn("[FCM] Gagal mengambil token FCM:", tokenErr);
      }

      // Pantau pembaruan token
      const unsubRefresh = onTokenRefresh(messaging, async (newToken) => {
        try {
          await setDoc(
            doc(db, "users", userId),
            {
              fcmToken: newToken,
              fcmTokenUpdatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch (e) {
          console.warn("[FCM] Gagal memperbarui fcmToken baru:", e);
        }
      });
      cleanups.push(unsubRefresh);

      // Listener pesan saat aplikasi berada di latar depan (foreground)
      const unsubMessage = onMessage(messaging, async (remoteMessage) => {
        console.log("[FCM] Pesan foreground diterima:", remoteMessage);
        foregroundListeners.forEach((l) => l(remoteMessage));
      });
      cleanups.push(unsubMessage);

      // Listener ketika notifikasi dibuka dari background
      const unsubOpened = onNotificationOpenedApp(messaging, (remoteMessage) => {
        console.log("[FCM] Aplikasi dibuka dari notifikasi:", remoteMessage);
      });
      cleanups.push(unsubOpened);
    } else {
      console.log("[FCM] Izin notifikasi tidak diberikan oleh pengguna.");
    }
  } catch (error) {
    console.warn("[FCM] Gagal menginisialisasi FCM:", error);
  }

  return () => {
    cleanups.forEach((c) => c());
  };
}

/**
 * Pantau daftar notifikasi milik pengguna secara real-time.
 */
export function subscribeUserNotifications(
  userId: string,
  onData: (notifications: AppNotification[]) => void,
  onError?: (err: Error) => void,
): () => void {
  if (!userId) {
    onData([]);
    return () => undefined;
  }

  const q = query(
    collection(db, "notifications"),
    where("recipientUid", "==", userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AppNotification[] = snapshot.docs.map((d) => {
        const raw = d.data() as Record<string, unknown>;
        let createdAt: Date | null = null;
        if (raw.createdAt && typeof (raw.createdAt as { toDate?: unknown }).toDate === "function") {
          createdAt = (raw.createdAt as { toDate: () => Date }).toDate();
        } else if (raw.createdAt instanceof Date) {
          createdAt = raw.createdAt;
        }

        return {
          id: d.id,
          recipientUid: String(raw.recipientUid ?? ""),
          recipientRole: raw.recipientRole as "praktikan" | "asisten" | undefined,
          title: String(raw.title ?? "Notifikasi"),
          body: String(raw.body ?? ""),
          type: (raw.type as NotificationType) ?? "system_info",
          data: (raw.data as Record<string, unknown>) ?? {},
          isRead: Boolean(raw.isRead),
          createdAt,
        };
      });

      // Urutkan dari yang terbaru
      items.sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt ? b.createdAt.getTime() : 0;
        return timeB - timeA;
      });

      onData(items);
    },
    (err) => {
      console.warn("[NotificationService] Gagal subscribe notifikasi:", err.message);
      if (onError) onError(err);
    },
  );
}

/**
 * Tandai satu notifikasi sebagai sudah dibaca.
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      isRead: true,
    });
  } catch (err) {
    console.warn("[NotificationService] Gagal menandai notifikasi dibaca:", err);
  }
}

/**
 * Tandai semua notifikasi pengguna sebagai sudah dibaca.
 */
export async function markAllNotificationsAsRead(
  notificationIds: string[],
): Promise<void> {
  if (!notificationIds.length) return;
  try {
    const batch = writeBatch(db);
    notificationIds.forEach((id) => {
      batch.update(doc(db, "notifications", id), { isRead: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn("[NotificationService] Gagal menandai semua dibaca:", err);
  }
}

/**
 * Buat dokumen notifikasi baru di Firestore untuk satu penerima.
 */
export async function sendNotificationToUser(
  recipientUid: string,
  title: string,
  body: string,
  type: NotificationType,
  data?: Record<string, unknown>,
  recipientRole: "praktikan" | "asisten" = "praktikan",
): Promise<void> {
  if (!recipientUid) return;
  try {
    const notifRef = doc(collection(db, "notifications"));
    await setDoc(notifRef, {
      recipientUid,
      recipientRole,
      title,
      body,
      type,
      data: data ?? {},
      isRead: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn(`[NotificationService] Gagal mengirim notifikasi ke ${recipientUid}:`, err);
  }
}

/**
 * SRS-017 Trigger 1: Notifikasi saat sesi praktikum dibuka.
 * Mengirim pemberitahuan ke seluruh mahasiswa peserta kelas terkait.
 */
export async function notifySessionOpened(
  sessionId: string,
  _assistantUid: string,
): Promise<void> {
  try {
    // 1. Ambil data sesi
    const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
    if (!sessionSnap.exists()) return;
    const sessionData = sessionSnap.data() as Record<string, unknown>;
    const classId = String(sessionData.classId ?? "");
    const kodeKelas = String(sessionData.kodeKelas ?? "");

    if (!classId) return;

    // 2. Ambil data kelas (untuk daftar mahasiswa memberIds)
    const classSnap = await getDoc(doc(db, "classes", classId));
    if (!classSnap.exists()) return;
    const classData = classSnap.data() as Record<string, unknown>;
    const memberIds = Array.isArray(classData.memberIds)
      ? (classData.memberIds as string[])
      : [];
    const mataKuliah = String(classData.mataKuliah ?? "Praktikum");

    // 3. Ambil data jadwal jika ada untuk nama praktikum
    let namaPraktikum = "Praktikum";
    const scheduleSnap = await getDoc(doc(db, "schedules", sessionId));
    if (scheduleSnap.exists()) {
      const scheduleData = scheduleSnap.data() as Record<string, unknown>;
      namaPraktikum = String(scheduleData.namaPraktikum ?? `Pertemuan ${scheduleData.nomorPraktikum ?? ""}`);
    }

    if (!memberIds.length) return;

    const title = "Sesi Praktikum Dibuka!";
    const body = `Sesi ${mataKuliah} - ${namaPraktikum} (${kodeKelas}) telah dibuka. Segera lakukan presensi!`;

    // 4. Buat notifikasi untuk setiap mahasiswa kelas terkait
    const batch = writeBatch(db);
    for (const studentId of memberIds) {
      const notifRef = doc(collection(db, "notifications"));
      batch.set(notifRef, {
        recipientUid: studentId,
        recipientRole: "praktikan",
        title,
        body,
        type: "session_opened",
        data: { sessionId, classId, type: "session_opened" },
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`[NotificationService] Notifikasi sesi dibuka dikirim ke ${memberIds.length} mahasiswa.`);

    // 5. Kirim remote push notification via Google FCM v1 ke status bar HP praktikan
    for (const studentId of memberIds) {
      void getDoc(doc(db, "users", studentId))
        .then((uSnap) => {
          if (uSnap.exists()) {
            const uData = uSnap.data() as Record<string, unknown>;
            const fcmToken =
              typeof uData.fcmToken === "string" ? uData.fcmToken : null;
            if (fcmToken) {
              void sendFCMv1Push(fcmToken, title, body, {
                sessionId,
                classId,
                type: "session_opened",
              });
            }
          }
        })
        .catch(() => undefined);
    }
  } catch (err) {
    console.warn("[NotificationService] Gagal mengirim notifikasi sesi dibuka:", err);
  }
}

/**
 * SRS-017 Trigger 2: Notifikasi saat jadwal praktikum mengalami perubahan.
 * Mengirim pemberitahuan ke seluruh mahasiswa peserta kelas terkait.
 */
export async function notifyScheduleUpdated(
  scheduleId: string,
  _assistantUid: string,
  input: ScheduleInput,
  kelas: ClassRecord,
): Promise<void> {
  try {
    let memberIds = kelas.memberIds ?? [];
    if (!memberIds.length && kelas.id) {
      const classSnap = await getDoc(doc(db, "classes", kelas.id));
      if (classSnap.exists()) {
        const cData = classSnap.data() as Record<string, unknown>;
        memberIds = Array.isArray(cData.memberIds) ? (cData.memberIds as string[]) : [];
      }
    }

    if (!memberIds.length) return;

    const title = "Perubahan Jadwal Praktikum";
    const body = `Jadwal praktikum ${kelas.mataKuliah} (${kelas.kodeKelas}) pertemuan ke-${input.nomorPraktikum} (${input.namaPraktikum}) diperbarui ke ruang ${input.ruang}.`;

    const batch = writeBatch(db);
    for (const studentId of memberIds) {
      const notifRef = doc(collection(db, "notifications"));
      batch.set(notifRef, {
        recipientUid: studentId,
        recipientRole: "praktikan",
        title,
        body,
        type: "schedule_updated",
        data: { scheduleId, classId: kelas.id, type: "schedule_updated" },
        isRead: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
    console.log(`[NotificationService] Notifikasi jadwal diubah dikirim ke ${memberIds.length} mahasiswa.`);

    // Kirim remote push notification via Google FCM v1 ke status bar HP praktikan
    for (const studentId of memberIds) {
      void getDoc(doc(db, "users", studentId))
        .then((uSnap) => {
          if (uSnap.exists()) {
            const uData = uSnap.data() as Record<string, unknown>;
            const fcmToken =
              typeof uData.fcmToken === "string" ? uData.fcmToken : null;
            if (fcmToken) {
              void sendFCMv1Push(fcmToken, title, body, {
                scheduleId,
                classId: kelas.id,
                type: "schedule_updated",
              });
            }
          }
        })
        .catch(() => undefined);
    }
  } catch (err) {
    console.warn("[NotificationService] Gagal mengirim notifikasi jadwal diubah:", err);
  }
}

/**
 * SRS-017 Trigger 3: Notifikasi saat pengajuan izin diterima/ditolak.
 * Mengirim pemberitahuan personal ke praktikan pembuat izin.
 */
export async function notifyPermissionDecided(
  permissionId: string,
  _assistantUid: string,
  decision: "approved" | "rejected",
): Promise<void> {
  try {
    const permSnap = await getDoc(doc(db, "permissionRequests", permissionId));
    if (!permSnap.exists()) {
      console.warn(
        "[NotificationService] Pengajuan izin tidak ditemukan:",
        permissionId,
      );
      return;
    }
    const permData = permSnap.data() as Record<string, unknown>;

    // Field di Firestore adalah "uid" (bukan studentUid)
    const studentUid = String(permData.uid ?? permData.studentUid ?? "");
    if (!studentUid) {
      console.warn(
        "[NotificationService] UID praktikan tidak ditemukan di dokumen izin:",
        permData,
      );
      return;
    }

    const statusText = decision === "approved" ? "Disetujui" : "Ditolak";
    const mataKuliah = String(permData.mataKuliah ?? "Praktikum");
    const namaPraktikum = permData.namaPraktikum
      ? ` - ${permData.namaPraktikum}`
      : "";

    const title = `Pengajuan Izin ${statusText}`;
    const body = `Pengajuan izin Anda untuk ${mataKuliah}${namaPraktikum} telah ${statusText.toLowerCase()} oleh asisten.`;

    await sendNotificationToUser(
      studentUid,
      title,
      body,
      "permission_decided",
      { permissionId, status: decision, type: "permission_decided" },
      "praktikan",
    );
    console.log(
      `[NotificationService] Notifikasi keputusan izin dikirim ke mahasiswa ${studentUid}`,
    );

    // Kirim remote push notification via Google FCM v1 ke status bar HP praktikan
    try {
      const uSnap = await getDoc(doc(db, "users", studentUid));
      if (uSnap.exists()) {
        const uData = uSnap.data() as Record<string, unknown>;
        const fcmToken =
          typeof uData.fcmToken === "string" ? uData.fcmToken : null;
        if (fcmToken) {
          await sendFCMv1Push(fcmToken, title, body, {
            permissionId,
            status: decision,
            type: "permission_decided",
          });
        }
      }
    } catch (fcmErr) {
      console.warn(
        "[NotificationService] Error sending FCM for permission:",
        fcmErr,
      );
    }
  } catch (err) {
    console.warn(
      "[NotificationService] Gagal mengirim notifikasi keputusan izin:",
      err,
    );
  }
}
