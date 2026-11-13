import { StyleSheet, View } from "react-native";

export type AppIconName =
  | "home"
  | "user"
  | "users"
  | "calendar"
  | "clock"
  | "location"
  | "class"
  | "clipboard"
  | "check"
  | "info"
  | "lock"
  | "unlock"
  | "play"
  | "stop"
  | "alert"
  | "plus"
  | "search"
  | "switch"
  | "logout"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "chevron-up";

interface AppIconProps {
  name: AppIconName;
  size?: number;
  color?: string;
}

/**
 * Komponen ikon geometris murni React Native (tanpa emoji/stiker)
 * agar tampilan konsisten, tajam, dan profesional di seluruh perangkat.
 */
export default function AppIcon({
  name,
  size = 18,
  color = "#2563eb",
}: AppIconProps) {
  const stroke = Math.max(1.6, Math.round(size * 0.1));

  switch (name) {
    case "home":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.58,
              height: size * 0.58,
              borderTopWidth: stroke,
              borderLeftWidth: stroke,
              borderColor: color,
              transform: [{ rotate: "45deg" }, { translateY: size * 0.14 }],
            }}
          />
          <View
            style={{
              width: size * 0.64,
              height: size * 0.44,
              borderWidth: stroke,
              borderTopWidth: 0,
              borderColor: color,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              marginTop: -size * 0.16,
            }}
          />
        </View>
      );

    case "user":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.38,
              height: size * 0.38,
              borderRadius: size * 0.19,
              borderWidth: stroke,
              borderColor: color,
              marginBottom: size * 0.06,
            }}
          />
          <View
            style={{
              width: size * 0.68,
              height: size * 0.32,
              borderTopLeftRadius: size * 0.34,
              borderTopRightRadius: size * 0.34,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
            }}
          />
        </View>
      );

    case "users":
      return (
        <View
          style={[
            styles.box,
            { width: size, height: size, flexDirection: "row" },
          ]}
        >
          <View style={{ alignItems: "center" }}>
            <View
              style={{
                width: size * 0.32,
                height: size * 0.32,
                borderRadius: size * 0.16,
                borderWidth: stroke,
                borderColor: color,
                marginBottom: 2,
              }}
            />
            <View
              style={{
                width: size * 0.54,
                height: size * 0.26,
                borderTopLeftRadius: size * 0.26,
                borderTopRightRadius: size * 0.26,
                borderWidth: stroke,
                borderBottomWidth: 0,
                borderColor: color,
              }}
            />
          </View>
        </View>
      );

    case "calendar":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.78,
              height: size * 0.74,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: size * 0.22,
                borderBottomWidth: stroke,
                borderBottomColor: color,
                backgroundColor: color + "20",
              }}
            />
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-evenly",
              }}
            >
              <View
                style={{
                  width: stroke * 1.2,
                  height: stroke * 1.2,
                  borderRadius: stroke,
                  backgroundColor: color,
                }}
              />
              <View
                style={{
                  width: stroke * 1.2,
                  height: stroke * 1.2,
                  borderRadius: stroke,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        </View>
      );

    case "clock":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: size * 0.4,
              borderWidth: stroke,
              borderColor: color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: stroke,
                height: size * 0.22,
                backgroundColor: color,
                position: "absolute",
                top: size * 0.16,
              }}
            />
            <View
              style={{
                width: size * 0.18,
                height: stroke,
                backgroundColor: color,
                position: "absolute",
                right: size * 0.18,
              }}
            />
          </View>
        </View>
      );

    case "location":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.62,
              height: size * 0.62,
              borderRadius: size * 0.31,
              borderBottomRightRadius: 2,
              borderWidth: stroke,
              borderColor: color,
              transform: [{ rotate: "45deg" }],
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: size * 0.2,
                height: size * 0.2,
                borderRadius: size * 0.1,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case "class":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.78,
              height: size * 0.58,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: size * 0.44,
                height: stroke,
                backgroundColor: color,
                marginBottom: 3,
              }}
            />
            <View
              style={{
                width: size * 0.3,
                height: stroke,
                backgroundColor: color,
              }}
            />
          </View>
          <View
            style={{
              width: size * 0.9,
              height: stroke,
              backgroundColor: color,
              marginTop: 2,
            }}
          />
        </View>
      );

    case "clipboard":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.36,
              height: size * 0.14,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 2,
              marginBottom: -stroke,
              zIndex: 1,
              backgroundColor: "#fff",
            }}
          />
          <View
            style={{
              width: size * 0.68,
              height: size * 0.72,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              paddingTop: 2,
            }}
          >
            <View
              style={{
                width: size * 0.38,
                height: stroke,
                backgroundColor: color,
              }}
            />
            <View
              style={{
                width: size * 0.38,
                height: stroke,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case "check":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.56,
              height: size * 0.3,
              borderLeftWidth: stroke * 1.2,
              borderBottomWidth: stroke * 1.2,
              borderColor: color,
              transform: [{ rotate: "-45deg" }, { translateY: -size * 0.05 }],
            }}
          />
        </View>
      );

    case "info":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: size * 0.4,
              borderWidth: stroke,
              borderColor: color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: stroke * 1.2,
                height: stroke * 1.2,
                borderRadius: stroke,
                backgroundColor: color,
                marginBottom: 2,
              }}
            />
            <View
              style={{
                width: stroke * 1.2,
                height: size * 0.26,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case "lock":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.4,
              height: size * 0.28,
              borderTopLeftRadius: size * 0.2,
              borderTopRightRadius: size * 0.2,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderColor: color,
            }}
          />
          <View
            style={{
              width: size * 0.66,
              height: size * 0.48,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: stroke * 1.3,
                height: size * 0.16,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    case "unlock":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.4,
              height: size * 0.26,
              borderTopLeftRadius: size * 0.2,
              borderTopRightRadius: size * 0.2,
              borderWidth: stroke,
              borderBottomWidth: 0,
              borderRightWidth: 0,
              borderColor: color,
              transform: [{ translateX: -size * 0.08 }],
            }}
          />
          <View
            style={{
              width: size * 0.66,
              height: size * 0.48,
              borderWidth: stroke,
              borderColor: color,
              borderRadius: 3,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: stroke * 1.3,
                height: size * 0.16,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          </View>
        </View>
      );

    case "play":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: size * 0.3,
              borderBottomWidth: size * 0.3,
              borderLeftWidth: size * 0.48,
              borderTopColor: "transparent",
              borderBottomColor: "transparent",
              borderLeftColor: color,
              marginLeft: size * 0.08,
            }}
          />
        </View>
      );

    case "stop":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.54,
              height: size * 0.54,
              backgroundColor: color,
              borderRadius: 2,
            }}
          />
        </View>
      );

    case "alert":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.8,
              height: size * 0.8,
              borderRadius: size * 0.4,
              borderWidth: stroke,
              borderColor: color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: stroke * 1.2,
                height: size * 0.28,
                backgroundColor: color,
                marginBottom: 2,
              }}
            />
            <View
              style={{
                width: stroke * 1.2,
                height: stroke * 1.2,
                borderRadius: stroke,
                backgroundColor: color,
              }}
            />
          </View>
        </View>
      );

    case "plus":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.62,
              height: stroke * 1.2,
              backgroundColor: color,
              position: "absolute",
            }}
          />
          <View
            style={{
              width: stroke * 1.2,
              height: size * 0.62,
              backgroundColor: color,
              position: "absolute",
            }}
          />
        </View>
      );

    case "search":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.54,
              height: size * 0.54,
              borderRadius: size * 0.27,
              borderWidth: stroke,
              borderColor: color,
              transform: [
                { translateX: -size * 0.08 },
                { translateY: -size * 0.08 },
              ],
            }}
          />
          <View
            style={{
              width: size * 0.28,
              height: stroke,
              backgroundColor: color,
              position: "absolute",
              bottom: size * 0.18,
              right: size * 0.14,
              transform: [{ rotate: "45deg" }],
            }}
          />
        </View>
      );

    case "switch":
      return (
        <View style={[styles.box, { width: size, height: size, gap: 3 }]}>
          <View
            style={{
              width: size * 0.64,
              height: stroke,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              width: size * 0.64,
              height: stroke,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case "logout":
      return (
        <View
          style={[
            styles.box,
            { width: size, height: size, flexDirection: "row" },
          ]}
        >
          <View
            style={{
              width: size * 0.42,
              height: size * 0.68,
              borderWidth: stroke,
              borderRightWidth: 0,
              borderColor: color,
              borderTopLeftRadius: 3,
              borderBottomLeftRadius: 3,
            }}
          />
          <View
            style={{
              width: size * 0.36,
              height: stroke,
              backgroundColor: color,
              marginLeft: -size * 0.1,
            }}
          />
        </View>
      );

    case "chevron-right":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.36,
              height: size * 0.36,
              borderTopWidth: stroke * 1.1,
              borderRightWidth: stroke * 1.1,
              borderColor: color,
              transform: [{ rotate: "45deg" }, { translateX: -size * 0.06 }],
            }}
          />
        </View>
      );

    case "chevron-left":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.36,
              height: size * 0.36,
              borderBottomWidth: stroke * 1.1,
              borderLeftWidth: stroke * 1.1,
              borderColor: color,
              transform: [{ rotate: "45deg" }, { translateX: size * 0.06 }],
            }}
          />
        </View>
      );

    case "chevron-down":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.36,
              height: size * 0.36,
              borderBottomWidth: stroke * 1.1,
              borderRightWidth: stroke * 1.1,
              borderColor: color,
              transform: [{ rotate: "45deg" }, { translateY: -size * 0.06 }],
            }}
          />
        </View>
      );

    case "chevron-up":
      return (
        <View style={[styles.box, { width: size, height: size }]}>
          <View
            style={{
              width: size * 0.36,
              height: size * 0.36,
              borderTopWidth: stroke * 1.1,
              borderLeftWidth: stroke * 1.1,
              borderColor: color,
              transform: [{ rotate: "45deg" }, { translateY: size * 0.06 }],
            }}
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
  },
});

