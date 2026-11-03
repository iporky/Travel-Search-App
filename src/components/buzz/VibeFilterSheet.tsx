import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme/tokens';
import { EMPTY_FILTERS, VibeFilters } from '../../types/vibes';
import { vibeFilterOptions } from '../../mocks/vibes';
import { MiniCalendar } from './MiniCalendar';
import { AnimatedModal } from '../AnimatedModal';

type Props = {
  visible: boolean;
  initial: VibeFilters;
  onClose: () => void;
  onApply: (filters: VibeFilters) => void;
};

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onToggle(opt)}
          >
            <Text style={active ? styles.chipTextActive : styles.chipText}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Figma: "FilterSheet_Default" (node 11478:76763) — draggable sheet with a date
// calendar and single/multi-select chip groups, plus Reset + Apply.
export function VibeFilterSheet({ visible, initial, onClose, onApply }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState<VibeFilters>(initial);
  const [dateDay, setDateDay] = useState<number | null>(null);

  const single = (key: keyof VibeFilters, v: string) =>
    setF((cur) => ({ ...cur, [key]: cur[key] === v ? null : v }));

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} variant="sheet" scrimColor="rgba(29,25,43,0.4)">
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                setF(EMPTY_FILTERS);
                setDateDay(null);
              }}
            >
              <Text style={styles.resetText}>{t('vibes.reset')}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Text style={styles.groupTitle}>{t('vibes.filters.date')}</Text>
            <MiniCalendar
              selected={dateDay}
              onSelect={(day, label) => {
                setDateDay(day);
                setF((cur) => ({ ...cur, date: label }));
              }}
            />

            <Text style={styles.groupTitle}>{t('vibes.filters.popularity')}</Text>
            <ChipGroup
              options={vibeFilterOptions.popularity}
              selected={f.popularity ? [f.popularity] : []}
              onToggle={(v) => single('popularity', v)}
            />

            <Text style={styles.groupTitle}>{t('vibes.filters.price')}</Text>
            <ChipGroup
              options={vibeFilterOptions.price}
              selected={f.price ? [f.price] : []}
              onToggle={(v) => single('price', v)}
            />

            <Text style={styles.groupTitle}>{t('vibes.filters.distance')}</Text>
            <ChipGroup
              options={vibeFilterOptions.distance}
              selected={f.distance ? [f.distance] : []}
              onToggle={(v) => single('distance', v)}
            />

            <Text style={styles.groupTitle}>{t('vibes.filters.category')}</Text>
            <ChipGroup
              options={vibeFilterOptions.categories}
              selected={f.categories}
              onToggle={(v) =>
                setF((cur) => ({
                  ...cur,
                  categories: cur.categories.includes(v)
                    ? cur.categories.filter((c) => c !== v)
                    : [...cur.categories, v],
                }))
              }
            />

            <Text style={styles.groupTitle}>{t('vibes.filters.language')}</Text>
            <ChipGroup
              options={vibeFilterOptions.language}
              selected={f.language ? [f.language] : []}
              onToggle={(v) => single('language', v)}
            />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: spacing[3] + insets.bottom }]}>
            <Pressable style={styles.applyBtn} onPress={() => onApply(f)}>
              <Text style={styles.applyText}>{t('vibes.apply')}</Text>
            </Pressable>
          </View>
        </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: Math.round(Dimensions.get('window').height * 0.9),
    backgroundColor: colors.surface.default,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  handle: {
    position: 'absolute',
    top: spacing[3],
    left: 0,
    right: 0,
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.gray[600],
    marginHorizontal: 'auto',
  },
  resetBtn: { paddingVertical: spacing[1] },
  resetText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    letterSpacing: -0.14,
    color: colors.blue[500],
  },
  scroll: { paddingHorizontal: spacing[5], paddingBottom: spacing[4], gap: spacing[3] },
  groupTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1300],
    marginTop: spacing[3],
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray[600],
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  chipActive: {
    backgroundColor: colors.blue[500],
    borderColor: colors.blue[500],
    borderStyle: 'solid',
  },
  chipText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[900],
  },
  chipTextActive: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.surface.default,
  },
  bottomBar: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    borderTopWidth: 1,
    borderTopColor: colors.surface.subtle,
  },
  applyBtn: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
});
