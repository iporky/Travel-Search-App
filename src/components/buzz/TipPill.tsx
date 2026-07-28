import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { MomentAvatar } from '../moments/MomentCard';

type Props = {
  category: string;
  text: string;
  author: string;
  onPress?: () => void;
};

// Figma: "Tips" (node 10100:51226) — compact tip row: category tag, a divider,
// one line of blue text, and the author avatar.
export function TipPill({ category, text, author, onPress }: Props) {
  return (
    <Pressable style={styles.pill} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.category}>{category}</Text>
        <View style={styles.divider} />
        <Text style={styles.text} numberOfLines={1}>
          {text}
        </Text>
      </View>
      <MomentAvatar name={author} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    backgroundColor: colors.surface.soft,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    marginHorizontal: spacing[5],
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 },
  category: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[1000],
  },
  divider: { width: 1, height: 20, backgroundColor: colors.gray[500] },
  text: {
    flex: 1,
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.blue[500],
  },
});
