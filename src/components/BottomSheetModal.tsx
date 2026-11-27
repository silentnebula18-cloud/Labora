import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RADIUS } from "../constants/theme";

interface BottomSheetModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Area header di bawah handle bar yang selalu dapat ditarik ke bawah */
  header?: React.ReactNode;
  maxHeight?: ViewStyle["maxHeight"];
  contentStyle?: StyleProp<ViewStyle>;
  /** Komponen di bagian bawah sheet yang tetap menempel (mis. tombol aksi) */
  footer?: React.ReactNode;
  /** Izinkan swipe-down dari badan sheet (set ke false saat ScrollView internal sedang tidak di puncak) */
  canDragBody?: boolean;
}

/**
 * Bottom Sheet terpusat yang selalu mendukung:
 * 1. Ketuk di area luar (backdrop) untuk menutup
 * 2. Tarik ke bawah (swipe-down) untuk menutup tanpa harus menekan tombol X atau Batal
 */
export default function BottomSheetModal({
  visible,
  onClose,
  children,
  header,
  maxHeight = "85%",
  contentStyle,
  footer,
  canDragBody = true,
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets();
  const [translateY] = useState(() => new Animated.Value(260));

  useEffect(() => {
    if (visible) {
      translateY.stopAnimation();
      translateY.setValue(260);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 210,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, translateY]);

  const animateClose = useCallback(() => {
    translateY.stopAnimation();
    Animated.timing(translateY, {
      toValue: 480,
      duration: 170,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onClose();
      }
    });
  }, [translateY, onClose]);

  const resetPosition = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 5,
    }).start();
  }, [translateY]);

  const handlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 65 || gesture.vy > 0.5) {
            animateClose();
          } else {
            resetPosition();
          }
        },
        onPanResponderTerminate: () => {
          resetPosition();
        },
      }),
    [translateY, animateClose, resetPosition],
  );

  const bodyPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          canDragBody &&
          gesture.dy > 8 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onMoveShouldSetPanResponderCapture: (_evt, gesture) =>
          canDragBody &&
          gesture.dy > 10 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 65 || gesture.vy > 0.5) {
            animateClose();
          } else {
            resetPosition();
          }
        },
        onPanResponderTerminate: () => {
          resetPosition();
        },
      }),
    [canDragBody, translateY, animateClose, resetPosition],
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={animateClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdrop}
          onPress={animateClose}
          accessibilityLabel="Tutup panel bawah"
          accessibilityRole="button"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight,
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY }],
            },
            contentStyle,
          ]}
          {...bodyPanResponder.panHandlers}
        >
          {/* Zona handle & header yang selalu merespons tarikan ke bawah */}
          <View {...handlePanResponder.panHandlers}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>
            {header}
          </View>

          {children}
          {footer}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderStrong,
  },
});
