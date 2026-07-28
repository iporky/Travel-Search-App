import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { Tip } from '../../types/tips';
import { MomentAvatar } from '../moments/MomentCard';

type Props = {
  tip: Tip;
  liked?: boolean;
  onToggleLike: () => void;
  onPressMore: () => void;
};

// Figma: "Ping feed card" — Tips variant (node 10247:63373, Property 1 = Tips).
// Same shell as the Ask card but with 14px body text and a like-only action row
// (no comment count), since tips aren't threaded discussions.
export function TipCard({ tip, liked, onToggleLike, onPressMore }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.textBlock}>
        <Text style={styles.category}>{tip.category}</Text>
        <Text style={styles.text}>{tip.text}</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.userDetails}>
          <MomentAvatar name={tip.author} />
          <Text style={styles.username} numberOfLines={1}>{tip.author}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{tip.time}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta} numberOfLines={1}>{tip.location}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} hitSlop={4} onPress={onToggleLike}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? colors.red[100] : colors.icon.disabled}
            />
            <Text style={styles.count}>{tip.likes + (liked ? 1 : 0)}</Text>
          </Pressable>
          <Pressable style={styles.moreBtn} hitSlop={6} onPress={onPressMore}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.icon.disabled} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.gray[100],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    borderBottomLeftRadius: 0,
    paddingTop: spacing[4],
    paddingLeft: spacing[4],
    paddingRight: spacing[1],
    paddingBottom: spacing[1],
  },
  textBlock: { gap: spacing[1] },
  category: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[1000],
  },
  text: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
  },
  infoRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userDetails: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flex: 1, minWidth: 0 },
  username: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
    marginLeft: 2,
  },
  dot: { fontSize: 11, color: colors.gray[900] },
  meta: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexShrink: 0 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  moreBtn: { padding: 2 },
  count: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[700],
  },
});
