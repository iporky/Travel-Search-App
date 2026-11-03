import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme/tokens';
import { useLanguage } from '../../context/LanguageContext';
import { AnimatedModal } from '../AnimatedModal';
import { PressableScale } from '../PressableScale';

// Figma "Profile_DatePicker" → Paper (12276:94793): the MUI date picker with
// only the corner radius adjusted. 335 wide, #fefefe, radius 20, soft shadow.
//   • header (px 24 / py 16): "SELECT DATE" 12/Medium uppercase, ls 1,
//     rgba(0,0,0,.6); picked date "Thu, Dec 2" 32/Medium rgba(0,0,0,.87)
//   • month row "December 2023" 16/Medium (+ ‹ › paging, and tapping it opens
//     the year grid — MUI's year view, needed for birthdays)
//   • weekday initials + 36px round day cells, 14/Medium; selected = #527dff
//     fill + white; today = 1px rgba(0,0,0,.54) ring; out of range = .38
//   • picking a day selects it and closes (no OK/Cancel — per annotation)

type Props = {
  visible: boolean;
  /** ISO YYYY-MM-DD or null. */
  value: string | null;
  onSelect: (iso: string) => void;
  onClose: () => void;
  /** Disallow dates after today (birthdays). */
  maxToday?: boolean;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
export function parseIsoDate(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function fmt(locale: string, opts: Intl.DateTimeFormatOptions, date: Date, fallback: string) {
  try {
    return new Intl.DateTimeFormat(locale, opts).format(date);
  } catch {
    return fallback;
  }
}

export function DatePickerDialog({ visible, value, onSelect, onClose, maxToday = true }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const locale = language.voiceLocale;
  const today = useMemo(() => new Date(), []);
  const todayStamp = today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate();

  const initial = parseIsoDate(value);
  const [view, setView] = useState({ y: initial?.y ?? today.getFullYear(), m: initial?.m ?? today.getMonth() });
  const [picked, setPicked] = useState<{ y: number; m: number; d: number } | null>(initial);
  const [yearMode, setYearMode] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const p = parseIsoDate(value);
    setPicked(p);
    setView({ y: p?.y ?? today.getFullYear(), m: p?.m ?? today.getMonth() });
    setYearMode(false);
  }, [visible, value, today]);

  const headerDate = picked ? new Date(picked.y, picked.m, picked.d) : today;
  const headerLabel = fmt(locale, { weekday: 'short', month: 'short', day: 'numeric' }, headerDate, `${headerDate.getMonth() + 1}/${headerDate.getDate()}`);
  const monthLabel = fmt(locale, { month: 'long', year: 'numeric' }, new Date(view.y, view.m, 1), `${view.m + 1} ${view.y}`);

  const weekdays = useMemo(() => {
    const sunday = new Date(2024, 8, 1); // a Sunday
    return Array.from({ length: 7 }, (_, i) =>
      fmt(locale, { weekday: 'narrow' }, new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i), 'SMTWTFS'[i]),
    );
  }, [locale]);

  const firstDow = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isFuture = (d: number) => maxToday && view.y * 10000 + view.m * 100 + d > todayStamp;
  const isToday = (d: number) => view.y === today.getFullYear() && view.m === today.getMonth() && d === today.getDate();
  const isPicked = (d: number) => !!picked && picked.y === view.y && picked.m === view.m && picked.d === d;

  const shiftMonth = (delta: number) => {
    const next = new Date(view.y, view.m + delta, 1);
    setView({ y: next.getFullYear(), m: next.getMonth() });
  };

  const years = useMemo(() => {
    const max = maxToday ? today.getFullYear() : today.getFullYear() + 10;
    const out: number[] = [];
    for (let y = max; y >= 1900; y--) out.push(y);
    return out;
  }, [maxToday, today]);

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} variant="dialog" scrimColor="rgba(0,0,0,0.6)">
        <View style={styles.paper}>
          <View style={styles.header}>
            <Text style={styles.overline}>{t('profile.selectDate')}</Text>
            <Text style={styles.headerDate}>{headerLabel}</Text>
          </View>

          <View style={styles.monthRow}>
            <PressableScale style={styles.monthLabelBtn} onPress={() => setYearMode((v) => !v)} hitSlop={6}>
              <Text style={styles.monthLabel}>{monthLabel}</Text>
              <MaterialIcons name={yearMode ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color="rgba(0,0,0,0.6)" />
            </PressableScale>
            {!yearMode && (
              <View style={styles.nav}>
                <PressableScale style={styles.navBtn} hitSlop={6} onPress={() => shiftMonth(-1)}>
                  <MaterialIcons name="chevron-left" size={24} color="rgba(0,0,0,0.6)" />
                </PressableScale>
                <PressableScale
                  style={styles.navBtn}
                  hitSlop={6}
                  onPress={() => shiftMonth(1)}
                  disabled={maxToday && view.y === today.getFullYear() && view.m === today.getMonth()}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={24}
                    color={maxToday && view.y === today.getFullYear() && view.m === today.getMonth() ? 'rgba(0,0,0,0.26)' : 'rgba(0,0,0,0.6)'}
                  />
                </PressableScale>
              </View>
            )}
          </View>

          {yearMode ? (
            <ScrollView style={styles.yearScroll} contentContainerStyle={styles.yearGrid} showsVerticalScrollIndicator={false}>
              {years.map((y) => {
                const active = y === view.y;
                return (
                  <PressableScale
                    key={y}
                    style={[styles.yearCell, active && styles.yearCellActive]}
                    onPress={() => {
                      const m = maxToday && y === today.getFullYear() ? Math.min(view.m, today.getMonth()) : view.m;
                      setView({ y, m });
                      setYearMode(false);
                    }}
                  >
                    <Text style={[styles.yearText, active && styles.yearTextActive]}>{y}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          ) : (
            <>
              <View style={styles.weekRow}>
                {weekdays.map((w, i) => (
                  <Text key={i} style={styles.weekday}>
                    {w}
                  </Text>
                ))}
              </View>
              <View style={styles.grid}>
                {cells.map((d, i) => {
                  if (d == null) return <View key={i} style={styles.cell} />;
                  const disabled = isFuture(d);
                  const sel = isPicked(d);
                  return (
                    <PressableScale
                      key={i}
                      style={[styles.cell, sel && styles.cellSelected, !sel && isToday(d) && styles.cellToday]}
                      disabled={disabled}
                      onPress={() => {
                        setPicked({ y: view.y, m: view.m, d });
                        onSelect(toIso(view.y, view.m, d));
                      }}
                    >
                      <Text style={[styles.day, disabled && styles.dayDisabled, sel && styles.daySelected]}>{d}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            </>
          )}
        </View>
    </AnimatedModal>
  );
}

const CELL = 36;

const styles = StyleSheet.create({
  paper: {
    width: 335,
    minHeight: 456,
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#4f73f6',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    paddingBottom: spacing[3],
  },
  header: { paddingHorizontal: spacing[6], paddingVertical: spacing[4], gap: 4 },
  overline: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 32,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(0,0,0,0.6)',
  },
  headerDate: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0.25,
    color: 'rgba(0,0,0,0.87)',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing[6],
    paddingRight: spacing[3],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  monthLabelBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  monthLabel: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    lineHeight: 24,
    color: 'rgba(0,0,0,0.87)',
  },
  nav: { flexDirection: 'row', gap: spacing[1] },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'center', gap: 2, paddingHorizontal: spacing[3] },
  weekday: {
    width: CELL,
    height: CELL,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: CELL,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 2,
    rowGap: 2,
    paddingTop: spacing[3],
    paddingHorizontal: spacing[3],
    width: CELL * 7 + 2 * 6 + spacing[3] * 2,
    alignSelf: 'center',
  },
  cell: { width: CELL, height: CELL, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: colors.blue[500] },
  cellToday: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.54)' },
  day: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(0,0,0,0.87)',
  },
  dayDisabled: { color: 'rgba(0,0,0,0.38)' },
  daySelected: { color: colors.gray[100] },
  yearScroll: { maxHeight: 300 },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  yearCell: { width: 72, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  yearCellActive: { backgroundColor: colors.blue[500] },
  yearText: { fontFamily: 'NationalPark_500Medium', fontSize: 16, color: 'rgba(0,0,0,0.87)' },
  yearTextActive: { color: colors.gray[100] },
});
