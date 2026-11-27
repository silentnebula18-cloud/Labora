import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS } from "../constants/theme";
import AppIcon, { type AppIconName } from "./AppIcon";

export interface DropdownOption {
  value: string;
  label: string;
  subtitle?: string;
  badge?: string;
}

interface SelectDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  rightIcon?: AppIconName;
  emptyText?: string;
}

/**
 * Komponen Dropdown Menu seragam untuk form Kelas, Sesi/Jadwal, Laboratorium, dan Izin.
 * Sesuai tampilan field dropdown di `docs/ui` (putih bersih, border #E2E8F0, radius 14px).
 */
export default function SelectDropdown({
  value,
  options,
  onChange,
  placeholder = "Pilih salah satu",
  disabled = false,
  hasError = false,
  emptyText = "Belum ada pilihan tersedia",
}: SelectDropdownProps) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

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
      >
        <View style={styles.triggerTextWrap}>
          <Text
            style={[
              styles.triggerText,
              !selectedOption && styles.triggerPlaceholder,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          {selectedOption?.subtitle ? (
            <Text
              style={styles.triggerSubtitle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selectedOption.subtitle}
            </Text>
          ) : null}
        </View>
        <AppIcon
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={open ? COLORS.primary : COLORS.textSecondary}
        />
      </Pressable>

      {open && (
        <View style={styles.dropdownMenu}>
          {options.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.dropdownScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {options.map((opt, index) => {
                const isSelected = opt.value === value;
                const isLast = index === options.length - 1;

                return (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.optionItem,
                      !isLast && styles.optionDivider,
                      isSelected && styles.optionItemSelected,
                      pressed && styles.optionItemPressed,
                    ]}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <View style={styles.optionLeft}>
                      {opt.badge ? (
                        <View
                          style={[
                            styles.badge,
                            isSelected && styles.badgeSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              isSelected && styles.badgeTextSelected,
                            ]}
                          >
                            {opt.badge}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.optionTextWrap}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelSelected,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {opt.label}
                        </Text>
                        {opt.subtitle ? (
                          <Text
                            style={styles.optionSub}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {opt.subtitle}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {isSelected && (
                      <AppIcon name="check" size={16} color={COLORS.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
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
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    gap: 10,
  },
  triggerOpen: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySurface,
  },
  triggerError: {
    borderColor: COLORS.dangerText,
  },
  triggerDisabled: {
    opacity: 0.6,
  },
  triggerPressed: {
    opacity: 0.92,
  },
  triggerTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  triggerText: {
    fontSize: 13.5,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  triggerSubtitle: {
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  triggerPlaceholder: {
    color: COLORS.textMuted,
    fontWeight: "400",
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    overflow: "hidden",
    maxHeight: 240,
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  emptyBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: COLORS.card,
    gap: 10,
  },
  optionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  optionItemSelected: {
    backgroundColor: COLORS.primarySoft,
  },
  optionItemPressed: {
    backgroundColor: COLORS.surfaceSubtle,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  optionTextWrap: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  badge: {
    minWidth: 34,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
  },
  badgeSelected: {
    backgroundColor: COLORS.primary,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  badgeTextSelected: {
    color: COLORS.textOnPrimary,
  },
  optionLabel: {
    fontSize: 13.5,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  optionLabelSelected: {
    fontWeight: "700",
    color: COLORS.primary,
  },
  optionSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
});
