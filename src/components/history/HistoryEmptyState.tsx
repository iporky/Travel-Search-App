import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme/tokens';
import { HISTORY_ALERT_SVG, HISTORY_EMPTY_BIRD } from '../../assets/historyAssets';

// Two distinct empty states from the History design annotations:
//   • `noHistory`  — the user has never asked Kiki anything: bird asset,
//                    "Nothing here?" / "Try changing your filters to find more".
//   • `noMatches`  — a search keyword or the selected filters return 0 rows:
//                    Google `error` icon, "No matching results" / "Try a
//                    different keyword". Never the bird for this case.
// Layout (12232:59962 / 12232:60108): 80 top padding, 20 gap to the text
// block, Heading/24/Bold + Body/16/Regular centred with 6 gap, 24 side padding.

type Props = { kind: 'noHistory' | 'noMatches' };

export function HistoryEmptyState({ kind }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      {kind === 'noHistory' ? (
        <Image source={HISTORY_EMPTY_BIRD} style={styles.bird} resizeMode="contain" />
      ) : (
        <SvgXml xml={HISTORY_ALERT_SVG} width={44} height={44} />
      )}
      <View style={styles.textBlock}>
        <Text style={styles.title}>
          {t(kind === 'noHistory' ? 'history.emptyTitle' : 'history.noResultsTitle')}
        </Text>
        <Text style={styles.body}>
          {t(kind === 'noHistory' ? 'history.emptyBody' : 'history.noResultsBody')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 80, gap: spacing[5] },
  bird: { width: 158, height: 117 },
  textBlock: { alignItems: 'center', gap: 6, paddingHorizontal: spacing[6], width: '100%' },
  title: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: colors.gray[1300],
    textAlign: 'center',
  },
  body: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
