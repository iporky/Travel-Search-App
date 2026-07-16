import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadows, spacing, typography } from '../theme/tokens';

export type CommunityItem = {
  id: string;
  author: string;
  tag: string;
  title: string;
  preview: string;
  participants: number;
};

type Props = {
  item: CommunityItem;
  selected?: boolean;
  onPress?: () => void;
};

export function CommunityCard({ item, selected, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.shadow, selected && shadows.cardSelected]}>
      <LinearGradient
        colors={gradients.surfaceDim}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, selected && styles.selected]}
      >
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={[typography.caption12Semibold, { color: colors.text.onDark }]}>
              {item.author.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body14Semibold, { color: colors.text.primary }]}>
              {item.author}
            </Text>
            <Text style={[typography.caption12Medium, { color: colors.text.disabled }]}>
              {item.tag}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={[typography.caption12Semibold, { color: colors.text.secondary }]}>
              {item.participants}+
            </Text>
          </View>
        </View>

        <Text style={[typography.body16Medium, styles.title]}>{item.title}</Text>
        <Text style={[typography.body14Medium, styles.preview]} numberOfLines={2}>
          {item.preview}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: { ...shadows.cardDefault, borderRadius: radius['2xl'] },
  card: {
    borderRadius: radius['2xl'],
    padding: spacing[4],
    gap: spacing[3],
  },
  selected: {
    borderWidth: 1,
    borderColor: colors.blue[300],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.blue[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.surface.focus,
  },
  title: { color: colors.text.primary },
  preview: { color: colors.gray[1000] },
});
