import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors, spacing } from '../../theme/tokens';
import { HISTORY_ROW_ARROW_SVG } from '../../assets/historyAssets';

// Figma `Suggestion Chip/L` (1186:9664), used as-is for every History card
// per the design annotation: 335 wide (full width inside 20px margins),
// hug height (56 for one line), padding 16/20/16/16, radius 16, fill
// #FEFEFE (pressed #C9E3FF), emoji + Body/14/Semibold label, 12×24
// `weui:arrow-filled` chevron. Labels stay on one line — the component has no
// wrapping spec, so overflow ellipsises (flagged in the spec as an explicit
// engineering choice).

type Props = {
  label: string;
  emoji: string;
  onPress: () => void;
};

export function HistoryRow({ label, emoji, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <SvgXml xml={HISTORY_ROW_ARROW_SVG} width={12} height={24} />
    </Pressable>
  );
}

/**
 * The design pairs each row with an emoji "that directly relates to the
 * suggestion". Kiki questions carry no category, so pick one from the text.
 */
export function emojiForQuery(q: string): string {
  const s = q.toLowerCase();
  const rules: [RegExp, string][] = [
    [/visa|immigration|arc|residence|passport|embassy/, '🛂'],
    [/flight|airport|airline|plane|fly/, '✈️'],
    [/taxi|cab|kakao t|uber/, '🚕'],
    [/bus|subway|metro|train|ktx|transport|t-money|tmoney/, '🚇'],
    [/hospital|doctor|pharmacy|clinic|medicine|dentist|health|insurance/, '🏥'],
    [/apartment|lease|rent|house|housing|deposit|jeonse|wolse|officetel|realtor/, '🏠'],
    [/bank|account|card|money|won|exchange|atm|transfer|pay|tax/, '💳'],
    [/phone|sim|number|carrier|kt|skt|lg u\+|wifi|internet/, '📱'],
    [/food|restaurant|eat|cafe|coffee|kimchi|bbq|chicken|delivery|baemin|halal|vegan/, '🍜'],
    [/shop|market|mall|buy|coupang|olive young|daiso/, '🛍️'],
    [/job|work|salary|contract|employ|resume|interview|hire/, '💼'],
    [/school|university|study|class|korean|language|topik|learn/, '📚'],
    [/hik|mountain|park|beach|trip|travel|tour|island|jeju|busan|weekend/, '🏞️'],
    [/concert|event|festival|show|ticket|k-pop|kpop|museum|exhibit/, '🎟️'],
    [/police|emergency|lost|help|fire|119|112/, '🚨'],
    [/weather|rain|snow|typhoon|hot|cold/, '🌤️'],
  ];
  for (const [re, e] of rules) if (re.test(s)) return e;
  return '💬';
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    paddingLeft: spacing[4],
    paddingRight: spacing[5],
    borderRadius: 16,
    backgroundColor: '#fefefe',
  },
  rowPressed: { backgroundColor: colors.blue[170] },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[3], minWidth: 0 },
  emoji: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
    marginRight: spacing[2],
  },
});
