import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { MomentAvatar } from '../moments/MomentCard';
import { LoadingImage } from '../LoadingImage';

type Props = {
  photo?: string;
  text: string;
  author: string;
  likes: number;
  comments: number;
  time: string;
  onPress: () => void;
};

export const MOMENT_SMALL_WIDTH = 210;

// Figma: "moment card/s" (node 10122:51379) — compact feed card: cover image with
// the white body overlapping its lower edge, truncated text, author, stats.
export function MomentSmallCard({
  photo,
  text,
  author,
  likes,
  comments,
  time,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <LoadingImage source={{ uri: photo }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={4}>
          {text}
        </Text>
        <View style={styles.meta}>
          <View style={styles.userRow}>
            <MomentAvatar name={author} size={19} />
            <Text style={styles.username}>{author}</Text>
          </View>
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={16} color={colors.icon.disabled} />
              <Text style={styles.statText}>{likes}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={14} color={colors.icon.disabled} />
              <Text style={styles.statText}>{comments}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={14} color={colors.icon.disabled} />
              <Text style={styles.statText}>{time}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: MOMENT_SMALL_WIDTH, height: 240 },
  image: {
    width: MOMENT_SMALL_WIDTH,
    height: 85,
    borderRadius: radius.lg,
    backgroundColor: colors.gray[400],
  },
  body: {
    position: 'absolute',
    left: 0,
    top: 71,
    width: 208,
    height: 169,
    backgroundColor: colors.gray[100],
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingTop: 21,
    justifyContent: 'space-between',
    paddingBottom: spacing[4],
  },
  text: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  meta: { gap: spacing[1] },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] + 2 },
  username: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[1300],
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  statText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
});
