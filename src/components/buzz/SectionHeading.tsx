import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

type Props = {
  title: string;
  onSeeAll: () => void;
};

// Figma: "Section Heading" (node 10456:70239) — bold 20px title + a blue
// "See all ›" link that opens the section's own full screen.
export function SectionHeading({ title, onSeeAll }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Pressable style={styles.link} hitSlop={8} onPress={onSeeAll}>
        <Text style={styles.linkText}>{t('ping.seeAll')}</Text>
        <Ionicons name="chevron-forward" size={12} color={colors.blue[500]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
  },
  title: {
    flexShrink: 1,
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flexShrink: 0 },
  linkText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.blue[500],
  },
});
