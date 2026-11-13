import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { CLASS_CODES } from "../constants/classes";
import AppIcon from "./AppIcon";

interface ClassCodeDropdownProps {
  value: string;
  onChange: (kode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export default function ClassCodeDropdown({
  value,
  onChange,
  placeholder = "Pilih kelas (A1 – E2)",
  disabled = false,
  hasError = false,
}: ClassCodeDropdownProps) {
  const [open, setOpen] = useState(false);

  const normalizedValue = value.trim().toUpperCase();

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          open && styles.triggerOpen,
          hasError && styles.triggerError,
          disabled && styles.triggerDisabled,
          pressed && !disabled && styles.triggerPressed,
        ]}
        onPress={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Pilih kode kelas"
      >
        <Text
          style={[
            styles.triggerText,
            !normalizedValue && styles.triggerPlaceholder,
          ]}
        >
          {normalizedValue ? `Kelas ${normalizedValue}` : placeholder}
        </Text>
        <AppIcon
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={open ? "#2563eb" : "#6b7280"}
        />
      </Pressable>

      {open && (
        <View style={styles.dropdownMenu}>
          <ScrollView
            style={styles.dropdownScroll}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {CLASS_CODES.map((code, index) => {
              const isSelected = normalizedValue === code;
              const isLast = index === CLASS_CODES.length - 1;

              return (
                <Pressable
                  key={code}
                  style={({ pressed }) => [
                    styles.optionItem,
                    !isLast && styles.optionDivider,
                    isSelected && styles.optionItemSelected,
                    pressed && styles.optionItemPressed,
                  ]}
                  onPress={() => {
                    onChange(code);
                    setOpen(false);
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View
                      style={[
                        styles.codeBadge,
                        isSelected && styles.codeBadgeSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.codeBadgeText,
                          isSelected && styles.codeBadgeTextSelected,
                        ]}
                      >
                        {code}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      Kelas {code}
                    </Text>
                  </View>

                  {isSelected && (
                    <AppIcon name="check" size={16} color="#2563eb" />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  triggerOpen: {
    borderColor: "#2563eb",
    backgroundColor: "#f8fafc",
  },
  triggerError: {
    borderColor: "#dc2626",
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerPressed: {
    opacity: 0.9,
  },
  triggerText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
  },
  triggerPlaceholder: {
    color: "#9ca3af",
    fontWeight: "400",
  },

  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    maxHeight: 220,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  optionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  optionItemSelected: {
    backgroundColor: "#eff6ff",
  },
  optionItemPressed: {
    backgroundColor: "#f1f5f9",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  codeBadge: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
  },
  codeBadgeSelected: {
    backgroundColor: "#2563eb",
  },
  codeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  codeBadgeTextSelected: {
    color: "#ffffff",
  },
  optionLabel: {
    fontSize: 14.5,
    fontWeight: "500",
    color: "#1e293b",
  },
  optionLabelSelected: {
    fontWeight: "700",
    color: "#2563eb",
  },
});

