import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

type Props = {
  label: string;
  size?: 'sm' | 'lg';
  onPress?: () => void;
  style?: ViewStyle;
};

export function SuggestionChip({ label, size = 'lg', onPress, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.sm,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[typography.body14Medium, { color: colors.text.primary }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surface.subtle,
  },
  lg: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  sm: { paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  pressed: { backgroundColor: colors.surface.focus, borderColor: colors.blue[300] },
});
