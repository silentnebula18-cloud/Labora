import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS } from "../constants/theme";
import AppIcon from "./AppIcon";

export default function BrandMark() {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <AppIcon name="flask" size={24} color={COLORS.primary} />
      </View>
      <Text style={styles.wordmark}>labora</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontSize: 21,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: -0.4,
  },
});
