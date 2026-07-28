import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import { useLanguage } from '../../context/LanguageContext';

type Props = {
  /** Selected day-of-month (1-31), or null. */
  selected: number | null;
  /** Receives the day plus a localized label for display elsewhere. */
  onSelect: (day: number, label: string) => void;
};

/**
 * Formats via Intl, falling back to a plain string if a runtime lacks full ICU
 * data (older Hermes builds ship a reduced Intl).
 */
function safeFormat(locale: string, options: Intl.DateTimeFormatOptions, date: Date, fallback: string) {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return fallback;
  }
}

// Figma: "Select date" calendar (FilterSheet / create date, node 11478:76763).
// Month names, weekday initials and the selected-date label all come from Intl,
// so they follow the app language instead of being hardcoded English.
export function MiniCalendar({ selected, onSelect }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const locale = language.voiceLocale;

  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthLabel = useMemo(
    () =>
      safeFormat(
        locale,
        { month: 'long', year: 'numeric' },
        new Date(year, month, 1),
        `${month + 1} ${year}`,
      ),
    [locale, year, month],
  );

  // Weekday initials, derived from a known Sunday so the order always matches
  // the Sunday-first grid below.
  const weekdays = useMemo(() => {
    const sunday = new Date(2024, 8, 1); // 1 Sep 2024 was a Sunday
    return Array.from({ length: 7 }, (_, i) =>
      safeFormat(
        locale,
        { weekday: 'narrow' },
        new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i),
        '',
      ),
    );
  }, [locale]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const labelFor = (day: number) =>
    safeFormat(
      locale,
      { month: 'long', day: 'numeric' },
      new Date(year, month, day),
      `${month + 1}/${day}`,
    );

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('vibes.selectDate')}</Text>
      <Text style={styles.month}>{monthLabel}</Text>
      <View style={styles.dowRow}>
        {weekdays.map((d, i) => (
          <Text key={i} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          const active = day != null && day === selected;
          return (
            <Pressable
              key={i}
              style={styles.cell}
              disabled={day == null}
              onPress={() => day != null && onSelect(day, labelFor(day))}
            >
              {day != null && (
                <View style={[styles.dayCircle, active && styles.dayActive]}>
                  <Text style={[styles.dayText, active && styles.dayTextActive]}>{day}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL = `${100 / 7}%`;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.xl,
    padding: spacing[5],
    gap: spacing[2],
  },
  label: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.gray[800],
  },
  month: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.gray[1300],
    marginBottom: spacing[1],
  },
  dowRow: { flexDirection: 'row' },
  dow: {
    width: CELL as any,
    textAlign: 'center',
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    color: colors.gray[700],
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL as any, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayActive: { backgroundColor: colors.blue[500] },
  dayText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    color: colors.gray[1300],
  },
  dayTextActive: { color: colors.surface.default, fontFamily: 'NationalPark_600SemiBold' },
});
