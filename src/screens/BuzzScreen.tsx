import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CommunityCard, CommunityItem } from '../components/CommunityCard';
import { SuggestionChip } from '../components/SuggestionChip';
import { colors, spacing, typography } from '../theme/tokens';
import { getCommunityFeed } from '../api/community';

const filters = ['Trending', 'New', 'Following', 'Design', 'AI', 'Mobile'];

export function BuzzScreen() {
  const { t } = useTranslation();
  const [communityFeed, setCommunityFeed] = useState<CommunityItem[]>([]);

  useEffect(() => {
    getCommunityFeed().then(setCommunityFeed).catch(() => setCommunityFeed([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[typography.heading32Medium, styles.title]}>{t('buzz.title')}</Text>
      <Text style={[typography.body16Regular, styles.subtitle]}>
        {t('buzz.subtitle')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {filters.map((f) => (
          <SuggestionChip key={f} label={f} size="sm" />
        ))}
      </ScrollView>

      <View style={{ gap: spacing[3], marginTop: spacing[4] }}>
        {[...communityFeed, ...communityFeed].map((item, i) => (
          <CommunityCard key={`${item.id}-${i}`} item={item} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[5], paddingBottom: spacing[16] },
  title: { color: colors.text.primary },
  subtitle: { color: colors.gray[1000], marginTop: spacing[1] },
  chipRow: { gap: spacing[2], marginTop: spacing[5], paddingRight: spacing[4] },
});
