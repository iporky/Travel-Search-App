import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';

// Shared building blocks for the redesigned Profile/Settings suite
// (Figma "Backend Functionality" wireframes): neutral palette — white surfaces,
// #d1d5db borders, #f3f4f6 icon wells, #111827/#6b7280 text.

export const P = {
  border: '#d1d5db',
  well: '#f3f4f6',
  textDark: '#111827',
  textMuted: '#6b7280',
  textFaint: '#9ca3af',
  dark: colors.gray[1300],
};

/** Screen header: round back button + bold title (Figma sub-screens). */
export function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.subHeader}>
      <Pressable style={styles.backCircle} hitSlop={8} onPress={onBack}>
        <Ionicons name="arrow-back" size={18} color={P.textDark} />
      </Pressable>
      <Text style={styles.subTitle}>{title}</Text>
    </View>
  );
}

/** Uppercase micro section caption ("ACTIVITY", "UPDATES"…). */
export function SectionCaption({ children }: { children: string }) {
  return <Text style={styles.caption}>{children}</Text>;
}

/** Settings row: icon well + label + right accessory, hairline separators. */
export function SettingsRow({
  icon,
  label,
  value,
  chevron,
  danger,
  first,
  onPress,
  right,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  chevron?: 'right' | 'down';
  danger?: boolean;
  /** First row in a card (no top divider). */
  first?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      style={[styles.row, !first && styles.rowDivider]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        {icon ? (
          <View style={styles.iconWell}>
            <Ionicons name={icon} size={18} color={danger ? '#ef4444' : P.textDark} />
          </View>
        ) : null}
        <Text style={[styles.rowLabel, danger && { color: '#ef4444' }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {right}
        {chevron ? (
          <Ionicons
            name={chevron === 'right' ? 'chevron-forward' : 'chevron-down'}
            size={16}
            color={P.textMuted}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

/** Toggle row used across Notifications / Privacy settings screens. */
export function ToggleRow({
  label,
  value,
  onChange,
  disabled,
  first,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  first?: boolean;
}) {
  return (
    <View style={[styles.row, !first && styles.rowDivider]}>
      <Text style={[styles.rowLabel, disabled && { color: P.textFaint }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: '#e5e7eb', true: P.dark }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

/** Bordered card that hosts SettingsRow / ToggleRow stacks. */
export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Full-width near-black CTA (Figma: "Send Code" / "Verify" / "Send Feedback"). */
export function DarkButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[styles.darkBtn, (disabled || loading) && { opacity: 0.5 }]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Text style={styles.darkBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
  },
  subTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    lineHeight: 28,
    color: P.textDark,
  },
  caption: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: P.textFaint,
  },
  card: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: 14,
    minHeight: 52,
    gap: spacing[3],
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[4], flexShrink: 1 },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.well,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: P.textDark,
    flexShrink: 1,
  },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexShrink: 0 },
  rowValue: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: P.textMuted,
  },
  darkBtn: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: P.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkBtnText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
  },
});
