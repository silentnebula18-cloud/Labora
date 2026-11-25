import { router } from "expo-router";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { requestNotificationPermissionAgain } from "../services/notificationService";
import type { AppNotification, NotificationType } from "../types";
import AppIcon, { type AppIconName } from "./AppIcon";

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  userRole?: "praktikan" | "asisten" | null;
  isNotificationPermissionGranted?: boolean | null;
  isConnectionError?: boolean;
  onRefreshPermission?: () => void;
  onRetryConnection?: () => void;
}

function getNotificationStyle(type: NotificationType): {
  iconName: AppIconName;
  iconColor: string;
  bgColor: string;
  borderColor: string;
} {
  switch (type) {
    case "session_opened":
      return {
        iconName: "play",
        iconColor: "#16a34a",
        bgColor: "#dcfce7",
        borderColor: "#bbf7d0",
      };
    case "schedule_updated":
      return {
        iconName: "calendar",
        iconColor: "#d97706",
        bgColor: "#fef3c7",
        borderColor: "#fde68a",
      };
    case "permission_decided":
      return {
        iconName: "clipboard",
        iconColor: "#2563eb",
        bgColor: "#dbeafe",
        borderColor: "#bfdbfe",
      };
    default:
      return {
        iconName: "info",
        iconColor: "#475569",
        bgColor: "#f1f5f9",
        borderColor: "#e2e8f0",
      };
  }
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return "";
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

export default function NotificationModal({
  visible,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  userRole,
  isNotificationPermissionGranted,
  isConnectionError,
  onRefreshPermission,
  onRetryConnection,
}: NotificationModalProps) {
  const insets = useSafeAreaInsets();

  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.isRead) {
      await onMarkAsRead(item.id);
    }

    onClose();

    // Navigasi kontekstual berdasarkan tipe notifikasi
    if (item.type === "session_opened" && item.data?.sessionId) {
      const sessionId = String(item.data.sessionId);
      if (userRole === "praktikan") {
        router.push(`/praktikan/session/${sessionId}` as any);
      } else if (userRole === "asisten") {
        router.push(`/asisten/session/${sessionId}` as any);
      }
    } else if (item.type === "permission_decided") {
      if (userRole === "praktikan") {
        router.push("/praktikan/izin" as any);
      } else if (userRole === "asisten" && item.data?.permissionId) {
        router.push(`/asisten/izin/${item.data.permissionId}` as any);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Header Modal */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.bellIconBox}>
                <AppIcon name="bell" size={18} color="#2563eb" />
              </View>
              <Text style={styles.title}>Notifikasi</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount} Baru</Text>
                </View>
              )}
            </View>

            <View style={styles.headerRightActions}>
              {unreadCount > 0 && (
                <Pressable
                  style={styles.markAllBtn}
                  onPress={() => onMarkAllAsRead()}
                >
                  <Text style={styles.markAllText}>Tandai Dibaca</Text>
                </Pressable>
              )}
              <Pressable
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Banner Peringatan Izin Notifikasi (SRS-018) */}
          {isNotificationPermissionGranted === false && (
            <View style={styles.permWarningBanner}>
              <View style={styles.warningIconCircle}>
                <AppIcon name="bell" size={15} color="#b45309" />
              </View>
              <View style={styles.warningTextWrap}>
                <Text style={styles.warningTitle}>Izin Notifikasi Belum Aktif</Text>
                <Text style={styles.warningDesc}>
                  Pemberitahuan ke status bar HP nonaktif. Notifikasi tetap dapat dibaca di sini.
                </Text>
              </View>
              <Pressable
                style={styles.warningActionBtn}
                onPress={async () => {
                  try {
                    const granted = await requestNotificationPermissionAgain();
                    if (!granted) {
                      await Linking.openSettings();
                    }
                  } catch (err) {
                    console.warn("Gagal membuka pengaturan:", err);
                  }
                  if (onRefreshPermission) onRefreshPermission();
                }}
              >
                <Text style={styles.warningActionText}>Aktifkan</Text>
              </Pressable>
            </View>
          )}

          {/* Banner Gangguan Jaringan / Server Notifikasi (SRS-018) */}
          {isConnectionError && (
            <View style={styles.connectionErrorBanner}>
              <View style={styles.connErrorIconCircle}>
                <AppIcon name="alert" size={15} color="#b91c1c" />
              </View>
              <View style={styles.warningTextWrap}>
                <Text style={styles.connErrorTitle}>Koneksi Mengalami Gangguan</Text>
                <Text style={styles.connErrorDesc}>
                  Gagal tersambung ke server notifikasi. Menampilkan riwayat tersimpan.
                </Text>
              </View>
              {onRetryConnection && (
                <Pressable
                  style={styles.connRetryBtn}
                  onPress={onRetryConnection}
                >
                  <Text style={styles.connRetryText}>Coba Lagi</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* List Notifikasi */}
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <AppIcon name="bell" size={32} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Notifikasi</Text>
              <Text style={styles.emptyDesc}>
                Pemberitahuan pembukaan sesi praktikum, pembaruan jadwal, dan hasil izin akan muncul di sini.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((item) => {
                const style = getNotificationStyle(item.type);
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      styles.card,
                      !item.isRead && styles.cardUnread,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => handleNotificationPress(item)}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        {
                          backgroundColor: style.bgColor,
                          borderColor: style.borderColor,
                        },
                      ]}
                    >
                      <AppIcon
                        name={style.iconName}
                        size={16}
                        color={style.iconColor}
                      />
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeaderRow}>
                        <Text
                          style={[
                            styles.cardTitle,
                            !item.isRead && styles.cardTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text style={styles.timeText}>
                          {formatTimeAgo(item.createdAt)}
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.cardBody,
                          !item.isRead && styles.cardBodyUnread,
                        ]}
                        numberOfLines={3}
                      >
                        {item.body}
                      </Text>
                    </View>

                    {!item.isRead && <View style={styles.unreadDot} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    paddingTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bellIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  badge: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563eb",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748b",
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  cardUnread: {
    backgroundColor: "#f8faff",
    borderColor: "#bfdbfe",
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
    marginRight: 6,
  },
  cardTitleUnread: {
    fontWeight: "700",
    color: "#0f172a",
  },
  timeText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  cardBody: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
  },
  cardBodyUnread: {
    color: "#334155",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2563eb",
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
  },
  permWarningBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  warningIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
  },
  warningTextWrap: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 2,
  },
  warningDesc: {
    fontSize: 11,
    color: "#b45309",
    lineHeight: 15,
  },
  warningActionBtn: {
    backgroundColor: "#d97706",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  warningActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  connectionErrorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  connErrorIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  connErrorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 2,
  },
  connErrorDesc: {
    fontSize: 11,
    color: "#b91c1c",
    lineHeight: 15,
  },
  connRetryBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  connRetryText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
});
