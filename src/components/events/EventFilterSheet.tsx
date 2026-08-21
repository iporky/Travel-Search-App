import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../theme/tokens';
import { MiniCalendar } from '../buzz/MiniCalendar';

// Events-tab filter sheet — same shell as the Vibes FilterSheet_Default
// (Figma 11478:76763: draggable sheet, calendar, chip groups, Reset + Apply),
// trimmed to what the live events API can actually answer:
//   • Date      → server-side (GET /events?group_by=month&range_start=&range_end=)
//   • Category  → client-side, options are the categories present in the feed
//   • Popularity→ client-side sort (likes / views / saves)

export type EventSort = 'mostLiked' | 'mostViewed' | 'mostSaved';
export interface EventFilters {
  /** ISO date (YYYY-MM-DD) or null. */
  day: string | null;
  categories: string[];
  sort: EventSort | null;
}
export const EMPTY_EVENT_FILTERS: EventFilters = { day: null, categories: [], sort: null };
export const isFilterActive = (f: EventFilters) => !!f.day || f.categories.length > 0 || !!f.sort;

const SORTS: EventSort[] = ['mostLiked', 'mostViewed', 'mostSaved'];

type Props = {
  visible: boolean;
  initial: EventFilters;
  categories: string[];
  onClose: () => void;
  onApply: (filters: EventFilters) => void;
};

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function ChipGroup<T extends string>({
  options,
  labelOf,
  selected,
  onToggle,
}: {
  options: T[];
  labelOf: (v: T) => string;
  selected: T[];
  onToggle: (v: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable key={opt} style={[styles.chip, active && styles.chipActive]} onPress={() => onToggle(opt)}>
            <Text style={active ? styles.chipTextActive : styles.chipText}>{labelOf(opt)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EventFilterSheet({ visible, initial, categories, onClose, onApply }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState<EventFilters>(initial);
  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });

  // Re-sync with the applied filters each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setF(initial);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(initial.day ?? '');
    setYm(m ? { y: Number(m[1]), m: Number(m[2]) - 1 } : { y: today.getFullYear(), m: today.getMonth() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectedDay = (() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.day ?? '');
    if (!m) return null;
    return Number(m[1]) === ym.y && Number(m[2]) - 1 === ym.m ? Number(m[3]) : null;
  })();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handleRow}>
            <View style={styles.handle} />
            <Pressable style={styles.resetBtn} onPress={() => setF(EMPTY_EVENT_FILTERS)}>
              <Text style={styles.resetText}>{t('vibes.reset')}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Text style={styles.groupTitle}>{t('vibes.filters.date')}</Text>
            <MiniCalendar
              selected={selectedDay}
              year={ym.y}
              month={ym.m}
              disablePast
              onChangeMonth={(d) =>
                setYm((cur) => {
                  const next = new Date(cur.y, cur.m + d, 1);
                  return { y: next.getFullYear(), m: next.getMonth() };
                })
              }
              onSelect={(day) =>
                setF((cur) => {
                  const next = iso(ym.y, ym.m, day);
                  return { ...cur, day: cur.day === next ? null : next };
                })
              }
            />

            {categories.length > 0 && (
              <>
                <Text style={styles.groupTitle}>{t('vibes.filters.category')}</Text>
                <ChipGroup
                  options={categories}
                  labelOf={(c) => c}
                  selected={f.categories}
                  onToggle={(c) =>
                    setF((cur) => ({
                      ...cur,
                      categories: cur.categories.includes(c)
                        ? cur.categories.filter((x) => x !== c)
                        : [...cur.categories, c],
                    }))
                  }
                />
              </>
            )}

            <Text style={styles.groupTitle}>{t('vibes.filters.popularity')}</Text>
            <ChipGroup
              options={SORTS}
              labelOf={(s) => t(`events.sort.${s}`)}
              selected={f.sort ? [f.sort] : []}
              onToggle={(s) => setF((cur) => ({ ...cur, sort: cur.sort === s ? null : s }))}
            />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: spacing[3] + insets.bottom }]}>
            <Pressable style={styles.applyBtn} onPress={() => onApply(f)}>
              <Text style={styles.applyText}>{t('vibes.apply')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(29,25,43,0.4)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '90%',
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
