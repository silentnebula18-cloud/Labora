import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppIcon, { type AppIconName } from "./AppIcon";
import type { AppNotification, NotificationType } from "../types";

interface InAppNotificationToastProps {
  notification: AppNotification | null;
  onPress: (notification: AppNotification) => void;
  onDismiss: () => void;
}

function getIconConfig(type: NotificationType): {
  name: AppIconName;
  color: string;
  bg: string;
} {
  switch (type) {
    case "session_opened":
      return { name: "play", color: "#16a34a", bg: "#dcfce7" };
    case "schedule_updated":
      return { name: "calendar", color: "#d97706", bg: "#fef3c7" };
    case "permission_decided":
      return { name: "clipboard", color: "#41337A", bg: "#C2EFEB" };
    default:
      return { name: "info", color: "#41337A", bg: "#C2EFEB" };
  }
}

export default function InAppNotificationToast({
  notification,
  onPress,
  onDismiss,
}: InAppNotificationToastProps) {
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(-120));
  const [opacity] = useState(() => new Animated.Value(0));

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [opacity, onDismiss, translateY]);

  useEffect(() => {
    if (notification) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [dismiss, notification, opacity, translateY]);

  if (!notification) return null;

  const icon = getIconConfig(notification.type);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable
        style={styles.card}
        onPress={() => {
          onPress(notification);
          dismiss();
        }}
      >
        <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
          <AppIcon name={icon.name} size={18} color={icon.color} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>

        <Pressable
          style={styles.closeBtn}
          onPress={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    shadowColor: "#331E36",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#C2EFEB",
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: "#331E36",
    marginBottom: 2,

  },
  body: {
    fontSize: 12,
    color: "#41337A",
    lineHeight: 16,

  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ECFEE8",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6EA4BF",

  },
});
