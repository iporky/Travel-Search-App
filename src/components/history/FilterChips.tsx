import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme/tokens';
import { HISTORY_CHIP_CARET_SVG } from '../../assets/historyAssets';
import { ActionSheetMenu } from '../buzz/ActionSheetMenu';

// Figma History filter chips (12232:59933): `Onboarding/Selection/Chip`
// overridden for History — 36 tall, radius 12, px 12, bg accent-tertiary
// #d8ecfb, label Body/14/Semibold content-primary + 10×6 caret, 6px gap.
// The chip always shows the currently selected value.

export interface FilterOption {
  value: string;
  label: string;
}

type ChipProps = {
  label: string;
  onPress: () => void;
};

export function FilterChip({ label, onPress }: ChipProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
      onPress={onPress}
      hitSlop={4}
    >
      <Text style={styles.chipText}>{label}</Text>
      <View style={styles.caret}>
        <SvgXml xml={HISTORY_CHIP_CARET_SVG} width={10} height={6} />
      </View>
    </Pressable>
  );
}

/**
 * Chip + its options sheet. Tapping the chip opens the shared action-sheet
 * (Figma BottomSheet 12232:60057 / 12232:60085): one row per option, then
 * Cancel. Picking a row closes the sheet, updates the chip and refreshes.
 */
export function DropdownFilter({
  valueLabel,
  options,
  onSelect,
}: {
  valueLabel: string;
  options: FilterOption[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <FilterChip label={valueLabel} onPress={() => setOpen(true)} />
      <ActionSheetMenu
        visible={open}
        items={options.map((o) => ({ label: o.label, onPress: () => onSelect(o.value) }))}
        onClose={() => setOpen(false)}
      />
    </>
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

/**
 * Generic titled single-select bottom sheet with a checkmark on the current
 * value (used by the Contact Us category picker and the Verify flow).
 */
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
                {selected == null && <Ionicons name="checkmark" size={18} color={colors.blue[500]} />}
              </Pressable>
            )}
            {options.map((opt) => {
              const isSel = opt.value === selected;
              return (
                <Pressable key={opt.value} style={styles.optionRow} onPress={() => onSelect(opt.value)}>
                  <Text style={[styles.optionText, isSel && styles.optionTextSelected]}>{opt.label}</Text>
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

const styles = StyleSheet.create({
  // Generic select sheet
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
  // History chip
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.blue[150],
  },
  chipPressed: { backgroundColor: colors.blue[170] },
  chipText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
    textAlign: 'center',
  },
  caret: { width: 10, height: 6, alignItems: 'center', justifyContent: 'center' },
});
