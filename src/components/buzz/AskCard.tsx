import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { AskPost } from '../../types/ask';
import { MomentAvatar } from '../moments/MomentCard';

type Props = {
  post: AskPost;
  liked?: boolean;
  onPress: () => void;
  onToggleLike: () => void;
  onPressMore: () => void;
};

// Figma: "Ping feed card" (node 10247:63373) — category tag, question title,
// author·time·location, like/comment counts, overflow menu. Note the asymmetric
// corner radius: rounded except bottom-left.
export function AskCard({ post, liked, onPress, onToggleLike, onPressMore }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.textBlock}>
        <Text style={styles.category}>{post.category}</Text>
        <Text style={styles.title}>{post.title}</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.userDetails}>
          <MomentAvatar name={post.author} />
          <Text style={styles.username} numberOfLines={1}>{post.author}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{post.time}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta} numberOfLines={1}>{post.location}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} hitSlop={4} onPress={onToggleLike}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? colors.red[100] : colors.icon.disabled}
            />
            <Text style={styles.count}>{post.likes + (liked ? 1 : 0)}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} hitSlop={4} onPress={onPress}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.icon.disabled} />
            <Text style={styles.count}>{post.comments.length}</Text>
          </Pressable>
          <Pressable style={styles.moreBtn} hitSlop={6} onPress={onPressMore}>
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.icon.disabled} />
          </Pressable>
        </View>
      </View>
    </Pressable>
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
  title: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
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
