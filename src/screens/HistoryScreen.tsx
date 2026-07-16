import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';
import { getHistory, HistoryItem } from '../api/content';

export function HistoryScreen() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getHistory().then(setHistory).catch(() => setHistory([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[typography.heading32Medium, styles.title]}>{t('history.title')}</Text>
      <Text style={[typography.body16Regular, styles.subtitle]}>
        {t('history.subtitle')}
      </Text>

      <View style={{ gap: spacing[2], marginTop: spacing[5] }}>
        {history.map((h) => (
          <Pressable key={h.id} style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.icon.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body16Medium, { color: colors.text.primary }]}>
                {h.title}
              </Text>
              <Text style={[typography.caption12Medium, { color: colors.text.disabled }]}>
                {h.when}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.icon.disabled} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[5], paddingBottom: spacing[16] },
  title: { color: colors.text.primary },
  subtitle: { color: colors.gray[1000], marginTop: spacing[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[3],
    ...shadows.cardDefault,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.focus,
  },
});
