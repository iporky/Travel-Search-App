import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme/tokens';

// Figma "Filter Bar - More Compact" (10936:78062 / 10936:77806):
// white pill chips, 32 tall, radius 12, border #c5c6cc, 12px gaps, caret ▾.
// Selected (non-default) chips render their value in near-black; defaults gray.

export interface FilterOption {
  value: string;
  label: string;
}

type ChipProps = {
  label: string;
  /** Highlighted (a non-default value is applied). */
  active?: boolean;
  onPress: () => void;
};

export function FilterChip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable style={styles.chip} onPress={onPress} hitSlop={4}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      <Ionicons
        name="chevron-down"
        size={12}
        color={active ? CHIP_ACTIVE : CHIP_INACTIVE}
        style={styles.caret}
      />
    </Pressable>
  );
}

type SheetProps = {
  visible: boolean;
  title: string;
  options: FilterOption[];
  selected: string | null;
  /** Shows a "clear" row that resets the filter to null. */
  clearable?: boolean;
  onClose: () => void;
  onSelect: (value: string | null) => void;
};

/** Bottom-sheet single-select list opened by a FilterChip. */
export function FilterSelectSheet({
  visible,
  title,
  options,
  selected,
  clearable,
  onClose,
  onSelect,
}: SheetProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: spacing[4] + insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          <ScrollView bounces={false} style={styles.optionScroll}>
            {clearable && (
              <Pressable style={styles.optionRow} onPress={() => onSelect(null)}>
                <Text style={[styles.optionText, { color: colors.text.disabled }]}>
                  {t('history.filters.clear')}
                </Text>
                {selected == null && (
                  <Ionicons name="checkmark" size={18} color={colors.blue[500]} />
                )}
              </Pressable>
            )}
            {options.map((opt) => {
              const isSel = opt.value === selected;
              return (
                <Pressable
                  key={opt.value}
                  style={styles.optionRow}
                  onPress={() => onSelect(opt.value)}
                >
                  <Text style={[styles.optionText, isSel && styles.optionTextSelected]}>
                    {opt.label}
                  </Text>
                  {isSel && <Ionicons name="checkmark" size={18} color={colors.blue[500]} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Convenience wrapper: chip + its options sheet in one component. */
export function DropdownFilter({
  label,
  valueLabel,
  active,
  title,
  options,
  selected,
  clearable,
  onSelect,
}: {
  label: string;
  valueLabel?: string;
  active?: boolean;
  title: string;
  options: FilterOption[];
  selected: string | null;
  clearable?: boolean;
  onSelect: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FilterChip
        label={valueLabel ?? label}
        active={active}
        onPress={() => setOpen(true)}
      />
      <FilterSelectSheet
        visible={open}
        title={title}
        options={options}
        selected={selected}
        clearable={clearable}
        onClose={() => setOpen(false)}
        onSelect={(v) => {
          setOpen(false);
          onSelect(v);
        }}
      />
    </>
  );
}

// Wireframe grays from the Figma frame (chips live on the #f8f9fb surface).
const CHIP_ACTIVE = '#0a1422';
const CHIP_INACTIVE = '#585f6a';

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c5c6cc',
    backgroundColor: colors.gray[100],
  },
  chipText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: CHIP_INACTIVE,
  },
  chipTextActive: {
    fontFamily: 'NationalPark_600SemiBold',
    color: CHIP_ACTIVE,
  },
  caret: { marginTop: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(29,25,43,0.4)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.gray[100],
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: spacing[3],
    maxHeight: '70%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.gray[500],
    marginBottom: spacing[3],
  },
  sheetTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1300],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[2],
  },
  optionScroll: { paddingHorizontal: spacing[2] },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
  },
  optionText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
  },
  optionTextSelected: {
    fontFamily: 'NationalPark_600SemiBold',
    color: colors.blue[500],
  },
});
