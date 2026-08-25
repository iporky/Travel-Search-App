import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';
import { HistorySource, SearchHistoryItem } from '../../types/history';
import { FormattedSummary } from '../FormattedAnswer';

// Figma `Suggestion Chip/L`, Aug revision (History_Default 12354:55698 /
// History_Expanded 12354:55779): every History card is an accordion. Collapsed
// (56 tall): category chip (#c9e3ff, radius 8, px8/py4, Caption/12/Bold) +
// one-line question (Body/14/SemiBold) + a down chevron. Tapping expands IN
// PLACE — no navigation — showing the answer stored by the History API
// (Body/14/Medium), a hairline divider, then the numbered source links
// (Caption/12/Medium content-tertiary, chain icon right, opens the URL).
// Card: #FEFEFE (pressed #C9E3FF), radius 16, pl 16 / pr 12 / py 16; the
// header keeps gap 12 and the expanded body follows at gap 8, inner gap 16.

type Props = {
  item: SearchHistoryItem;
  /** Chip fallback when the row has no stored category (e.g. old rows). */
  emoji: string;
  expanded: boolean;
  onToggle: () => void;
};

/** "visa" / "public_transport" → "Visa" / "Public transport". */
function categoryLabel(raw: string): string {
  const s = raw.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sourceLabel(s: HistorySource, i: number): string {
  // Prefer a real name; a bare "[Source 1]" tag is redundant next to the
  // number, so the URL's host outranks it.
  const title = (s.title ?? '').trim() || hostOf(s.url) || (s.tag ?? '').trim() || '';
  return `${s.index ?? i + 1}. ${title}`;
}

function hostOf(url?: string): string {
  if (!url) return '';
  const m = /^[a-z]+:\/\/([^/]+)/i.exec(url);
  return (m?.[1] ?? url).replace(/^www\./, '');
}

export function HistoryRow({ item, emoji, expanded, onToggle }: Props) {
  const sources = (item.sources ?? []).filter((s) => s && (s.title || s.tag || s.url));
  const answer = (item.answer ?? '').trim();
  // Rows the pipeline stored nothing for (e.g. rejected/gibberish queries)
  // have nothing to reveal — no chevron, tap does nothing.
  const expandable = !!answer || sources.length > 0;
  const open = expanded && expandable;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && expandable && styles.cardPressed]}
      onPress={expandable ? onToggle : undefined}
      disabled={!expandable}
    >
      <View style={styles.headerRow}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>
            {item.category ? categoryLabel(item.category) : emoji}
          </Text>
        </View>
        <Text style={styles.question} numberOfLines={open ? undefined : 1}>
          {item.user_query}
        </Text>
        {expandable && (
          <MaterialIcons
            name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={colors.gray[1200]}
            style={styles.chevron}
          />
        )}
      </View>

      {open && (
        <View style={styles.body}>
          {!!answer && <FormattedSummary text={answer} compact />}
          {!!answer && sources.length > 0 && <View style={styles.divider} />}
          {sources.length > 0 && (
            <View style={styles.sourceList}>
              {sources.map((s, i) => (
                <Pressable
                  key={`${s.url ?? s.tag ?? i}`}
                  style={styles.sourceRow}
                  hitSlop={4}
                  onPress={s.url ? () => Linking.openURL(s.url!).catch(() => {}) : undefined}
                  disabled={!s.url}
                >
                  <Text style={styles.sourceText} numberOfLines={1}>
                    {sourceLabel(s, i)}
                  </Text>
                  <MaterialIcons name="link" size={16} color={colors.gray[900]} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const EMOJI_RULES: [RegExp, string][] = [
  [/visa|immigration|arc|residence|passport|embassy/, '🛂'],
  [/legal|\blaw\b/, '⚖️'],
  [/flight|airport|airline|plane|fly/, '✈️'],
  [/taxi|cab|kakao t|uber/, '🚕'],
  [/bus|subway|metro|train|ktx|transport|t-money|tmoney/, '🚇'],
  [/hospital|doctor|pharmacy|clinic|medicine|dentist|health|insurance/, '🏥'],
  [/apartment|lease|rent|house|housing|deposit|jeonse|wolse|officetel|realtor/, '🏠'],
  [/bank|account|card|money|won|exchange|atm|transfer|pay|tax|finance/, '💳'],
  [/phone|sim|number|carrier|kt|skt|lg u\+|wifi|internet|connectivity/, '📱'],
  [/food|restaurant|eat|cafe|coffee|kimchi|bbq|chicken|delivery|baemin|halal|vegan|dining/, '🍜'],
  [/shop|market|mall|buy|coupang|olive young|daiso/, '🛍️'],
  [/job|work|salary|contract|employ|resume|interview|hire/, '💼'],
  [/school|university|study|class|korean|language|topik|learn|education/, '📚'],
  [/hik|mountain|park|beach|trip|travel|tour|island|jeju|busan|weekend/, '🏞️'],
  [/concert|event|festival|show|ticket|k-pop|kpop|museum|exhibit|entertainment/, '🎟️'],
  [/police|emergency|lost|help|fire|119|112/, '🚨'],
  [/weather|rain|snow|typhoon|hot|cold/, '🌤️'],
];

/**
 * Chip fallback for rows with no stored `category`: guess an emoji from the
 * question text (the pre-Aug behavior). Rows WITH a category render its name
 * in the chip instead, so the category arg short-circuits to '' → unused.
 */
export function emojiForQuery(q: string, category?: string | null): string {
  if (category) {
    const c = category.toLowerCase().replace(/_/g, ' ');
    for (const [re, e] of EMOJI_RULES) if (re.test(c)) return e;
  }
  const s = q.toLowerCase();
  for (const [re, e] of EMOJI_RULES) if (re.test(s)) return e;
  return '💬';
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing[4],
    paddingLeft: spacing[4],
    paddingRight: spacing[3],
    borderRadius: 16,
    backgroundColor: '#fefefe',
  },
  cardPressed: { backgroundColor: colors.blue[170] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  categoryChip: {
    backgroundColor: colors.blue[170],
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  categoryText: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.text.primary,
    textAlign: 'center',
  },
  question: {
    flex: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
    marginTop: 2,
  },
  chevron: { marginTop: 0 },
  body: { marginTop: spacing[2], gap: spacing[4] },
  answer: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
  },
  divider: { height: 1, backgroundColor: colors.surface.line, width: '100%' },
  sourceList: { gap: spacing[1] },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  sourceText: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[900],
  },
});
