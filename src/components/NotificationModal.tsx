import { router } from "expo-router";
import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { COLORS, RADIUS } from "../constants/theme";
import { requestNotificationPermissionAgain } from "../services/notificationService";
import type { AppNotification, NotificationType, Role } from "../types";
import { formatTanggal } from "../utils/format";
import AppIcon, { type AppIconName } from "./AppIcon";
import BottomSheetModal from "./BottomSheetModal";

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  userRole?: Role | null;
  isNotificationPermissionGranted?: boolean | null;
  isConnectionError?: boolean;
  onRefreshPermission?: () => void;
  onRetryConnection?: () => void;
}

function getNotificationStyle(type: NotificationType): {
  iconName: AppIconName;
  iconColor: string;
  bgColor: string;
} {
  switch (type) {
    case "session_opened":
      return {
        iconName: "play",
        iconColor: COLORS.primary,
        bgColor: COLORS.primarySoft,
      };
    case "schedule_updated":
      return {
        iconName: "calendar",
        iconColor: COLORS.warningText,
        bgColor: COLORS.warningBg,
      };
    case "permission_decided":
      return {
        iconName: "file-text",
        iconColor: COLORS.primary,
        bgColor: COLORS.primarySoft,
      };
    default:
      return {
        iconName: "bell",
        iconColor: COLORS.primary,
        bgColor: COLORS.primarySoft,
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
  return formatTanggal(date);
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
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setIsScrollAtTop(true);
    }
  }

  const handleNotificationPress = async (item: AppNotification) => {
    if (!item.isRead) {
      await onMarkAsRead(item.id);
    }

    onClose();

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
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      maxHeight="80%"
      canDragBody={isScrollAtTop}
      header={
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            Daftar Notifikasi
          </Text>

          {unreadCount > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.markAllBtn,
                pressed && { opacity: 0.7 },
              ]}
              onPress={() => onMarkAllAsRead()}
              hitSlop={8}
            >
              <Text style={styles.markAllText}>Tandai dibaca</Text>
            </Pressable>
          )}
        </View>
      }
    >
      {isNotificationPermissionGranted === false && (
        <View style={styles.bannerWarning}>
          <AppIcon name="bell" size={15} color={COLORS.warningText} />
          <Text
            style={styles.bannerWarningText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Izin notifikasi belum aktif
          </Text>
          <Pressable
            style={styles.bannerWarningBtn}
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
            <Text style={styles.bannerActionText}>Aktifkan</Text>
          </Pressable>
        </View>
      )}

      {isConnectionError && (
        <View style={styles.bannerError}>
          <AppIcon name="alert" size={15} color={COLORS.dangerText} />
          <Text
            style={styles.bannerErrorText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Gangguan koneksi notifikasi
          </Text>
          {onRetryConnection && (
            <Pressable style={styles.bannerErrorBtn} onPress={onRetryConnection}>
              <Text style={styles.bannerActionText}>Coba lagi</Text>
            </Pressable>
          )}
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <AppIcon name="bell" size={22} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Belum ada notifikasi</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={(e) => {
            const atTop = e.nativeEvent.contentOffset.y <= 2;
            setIsScrollAtTop((prev) => (prev === atTop ? prev : atTop));
          }}
          scrollEventThrottle={16}
        >
          {notifications.map((item, idx) => {
            const style = getNotificationStyle(item.type);
            const isLast = idx === notifications.length - 1;

            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [
                  styles.row,
                  !item.isRead && styles.rowUnread,
                  !isLast && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => handleNotificationPress(item)}
              >
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: style.bgColor },
                  ]}
                >
                  <AppIcon
                    name={style.iconName}
                    size={15}
                    color={style.iconColor}
                  />
                </View>

                <View style={styles.rowContent}>
                  <View style={styles.rowTop}>
                    <Text
                      style={[
                        styles.rowTitle,
                        !item.isRead && styles.rowTitleUnread,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.title}
                    </Text>
                    <View style={styles.timeWrap}>
                      <Text
                        style={styles.timeText}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {formatTimeAgo(item.createdAt)}
                      </Text>
                      {!item.isRead && <View style={styles.unreadDot} />}
                    </View>
                  </View>

                  <Text
                    style={styles.rowBody}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.body}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  bannerWarning: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerWarningText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.warningText,
  },
  bannerWarningBtn: {
    backgroundColor: COLORS.warningText,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
  },
  bannerError: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.dangerBorder,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bannerErrorText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.dangerDark,
  },
  bannerErrorBtn: {
    backgroundColor: COLORS.dangerText,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
  },
  bannerActionText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: COLORS.textOnPrimary,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 13,
    gap: 12,
    backgroundColor: COLORS.card,
  },
  rowUnread: {
    backgroundColor: COLORS.primarySurface,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rowPressed: {
    opacity: 0.8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 19,
    color: COLORS.textPrimary,
  },
  rowTitleUnread: {
    fontWeight: "700",
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  rowBody: {
    fontSize: 12.5,
    fontWeight: "400",
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 38,
    paddingHorizontal: 24,
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
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
