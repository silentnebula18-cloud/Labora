import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import InAppNotificationToast from "../components/InAppNotificationToast";
import NotificationModal from "../components/NotificationModal";
import {
  addForegroundMessageListener,
  checkNotificationPermission,
  initFCM,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeUserNotifications,
} from "../services/notificationService";
import type { AppNotification } from "../types";
import { useAuth } from "./AuthContext";

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  openNotificationModal: () => void;
  closeNotificationModal: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isNotificationPermissionGranted: boolean | null;
  isConnectionError: boolean;
  refreshPermissionStatus: () => Promise<void>;
  retryConnection: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, activeRole } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] =
    useState<boolean | null>(null);
  const [isConnectionError, setIsConnectionError] = useState(false);
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);

  const prevIdsRef = useRef<Set<string>>(new Set());
  const shownToastIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const refreshPermissionStatus = useCallback(async () => {
    const granted = await checkNotificationPermission();
    setIsNotificationPermissionGranted(granted);
  }, []);

  // Periksa izin saat aplikasi kembali aktif dari background/pengaturan HP
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          void refreshPermissionStatus();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [refreshPermissionStatus]);

  // Inisialisasi FCM & Real-time Subscription saat pengguna masuk
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const shownToastIds = shownToastIdsRef.current;
    const prevIds = prevIdsRef.current;

    let unsubFCM: (() => void) | undefined;
    void initFCM(user.id).then((cleanup) => {
      unsubFCM = cleanup;
      void refreshPermissionStatus();
    });

    const unsubFirestore = subscribeUserNotifications(
      user.id,
      (newNotifs) => {
        setNotifications(newNotifs);
        setIsConnectionError(false);

        // Cek apakah ada notifikasi baru untuk ditampilkan sebagai toast (tanpa duplikasi dengan FCM foreground)
        if (!initialLoadRef.current) {
          const fresh = newNotifs.find(
            (n) =>
              !n.isRead &&
              !prevIds.has(n.id) &&
              !shownToastIds.has(n.id),
          );
          if (fresh) {
            shownToastIds.add(fresh.id);
            setActiveToast(fresh);
          }
        } else {
          initialLoadRef.current = false;
        }

        prevIds.clear();
        newNotifs.forEach((n) => prevIds.add(n.id));
      },
      (err) => {
        console.warn("[NotificationContext] Error connecting to notifications:", err.message);
        setIsConnectionError(true);
      },
    );

    // Listener saat FCM foreground message diterima
    const unsubForeground = addForegroundMessageListener((remoteMessage) => {
      if (remoteMessage.notification) {
        const linkedNotifId =
          typeof remoteMessage.data?.notificationId === "string" &&
          remoteMessage.data.notificationId.trim().length > 0
            ? remoteMessage.data.notificationId.trim()
            : null;
        const toastId =
          linkedNotifId ?? remoteMessage.messageId ?? String(Date.now());

        if (shownToastIds.has(toastId) || prevIds.has(toastId)) {
          return;
        }

        shownToastIds.add(toastId);
        const toastItem: AppNotification = {
          id: toastId,
          recipientUid: user.id,
          title: remoteMessage.notification.title ?? "Pemberitahuan Baru",
          body: remoteMessage.notification.body ?? "",
          type: (remoteMessage.data?.type as any) ?? "system_info",
          data: remoteMessage.data as Record<string, unknown>,
          isRead: false,
          createdAt: new Date(),
        };
        setActiveToast(toastItem);
      }
    });

    return () => {
      if (unsubFCM) unsubFCM();
      unsubFirestore();
      unsubForeground();
      setNotifications([]);
      prevIds.clear();
      shownToastIds.clear();
      initialLoadRef.current = true;
    };
  }, [user?.id, connectionRetryCount, refreshPermissionStatus]);

  const effectiveNotifications = useMemo(
    () => (user?.id ? notifications : []),
    [notifications, user?.id],
  );

  const unreadCount = useMemo(
    () => effectiveNotifications.filter((n) => !n.isRead).length,
    [effectiveNotifications],
  );

  const openNotificationModal = useCallback(() => {
    setIsModalOpen(true);
    void refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const closeNotificationModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleMarkAsRead = useCallback(async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (!unreadIds.length) return;
    await markAllNotificationsAsRead(unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [notifications]);

  const handleRetryConnection = useCallback(() => {
    setIsConnectionError(false);
    setConnectionRetryCount((c) => c + 1);
  }, []);

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      notifications: effectiveNotifications,
      unreadCount,
      openNotificationModal,
      closeNotificationModal,
      markAsRead: handleMarkAsRead,
      markAllAsRead: handleMarkAllAsRead,
      isNotificationPermissionGranted,
      isConnectionError,
      refreshPermissionStatus,
      retryConnection: handleRetryConnection,
    }),
    [
      effectiveNotifications,
      unreadCount,
      openNotificationModal,
      closeNotificationModal,
      handleMarkAsRead,
      handleMarkAllAsRead,
      isNotificationPermissionGranted,
      isConnectionError,
      refreshPermissionStatus,
      handleRetryConnection,
    ],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      {/* Floating In-App Toast Banner */}
      <InAppNotificationToast
        notification={activeToast}
        onPress={(notif) => {
          void handleMarkAsRead(notif.id);
          openNotificationModal();
        }}
        onDismiss={() => setActiveToast(null)}
      />

      {/* Notification Drawer Modal */}
      <NotificationModal
        visible={isModalOpen}
        onClose={closeNotificationModal}
        notifications={effectiveNotifications}
        unreadCount={unreadCount}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        userRole={activeRole}
        isNotificationPermissionGranted={isNotificationPermissionGranted}
        isConnectionError={isConnectionError}
        onRefreshPermission={refreshPermissionStatus}
        onRetryConnection={handleRetryConnection}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification harus digunakan di dalam NotificationProvider",
    );
  }
  return context;
}
