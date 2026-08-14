import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme/tokens';
import { P, SubHeader } from '../../components/profile/ProfileUI';

// Figma: screen-5-terms (10978:93909) / screen-6-privacy (10978:93968).
// Read-only legal document: bold title, "Last updated" line, numbered sections.

type Props = {
  kind: 'terms' | 'privacyPolicy';
  onBack: () => void;
};

const SECTION_COUNT = 4;

export function LegalScreen({ kind, onBack }: Props) {
  const { t } = useTranslation();
  const base = kind === 'terms' ? 'terms' : 'privacyPolicy';

  return (
    <View style={styles.screen}>
      <SubHeader title={t(`${base}.title`)} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>{t(`${base}.lastUpdated`)}</Text>
        {Array.from({ length: SECTION_COUNT }, (_, i) => i + 1).map((n) => (
          <View key={n} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {n}. {t(`${base}.s${n}.title`)}
            </Text>
            <Text style={styles.sectionBody}>{t(`${base}.s${n}.body`)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray[100] },
  content: { paddingHorizontal: spacing[5], paddingBottom: 96, gap: spacing[5] },
  updated: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: P.textFaint,
  },
  section: { gap: spacing[2] },
  sectionTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: P.textDark,
  },
  sectionBody: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: P.textMuted,
  },
});
