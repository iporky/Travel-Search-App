import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { Moment } from '../../types/moments';
import { LoadingImage } from '../LoadingImage';

type Props = {
  moment: Moment;
  onPressPhoto: (index: number) => void;
  onPressComments: () => void;
  onPressMore: () => void;
};

/** Small initials avatar used across the Moments feature (offline-safe). */
export function MomentAvatar({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.55 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// Figma: "moment card/L" (node 10553:72227) — category tag, body text,
// photo thumbnail strip, author row with like/comment/more actions.
export function MomentCard({ moment, onPressPhoto, onPressComments, onPressMore }: Props) {
  const [liked, setLiked] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.textBlock}>
          <Text style={styles.category}>{moment.category}</Text>
          <Text style={styles.postText}>{moment.text}</Text>
        </View>

        {moment.photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            {moment.photos.map((uri, i) => (
              <Pressable key={uri} onPress={() => onPressPhoto(i)}>
                <LoadingImage source={{ uri }} style={styles.photo} showSpinner={false} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.userDetails}>
          <MomentAvatar name={moment.author} />
          <Text style={styles.username} numberOfLines={1}>{moment.author}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{moment.time}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta} numberOfLines={1}>{moment.location}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} hitSlop={4} onPress={() => setLiked((v) => !v)}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? colors.red[100] : colors.icon.disabled}
            />
            <Text style={styles.count}>{moment.likes + (liked ? 1 : 0)}</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} hitSlop={4} onPress={onPressComments}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.icon.disabled} />
            <Text style={styles.count}>{moment.comments.length}</Text>
          </Pressable>
          <Pressable style={styles.moreBtn} hitSlop={4} onPress={onPressMore}>
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
    paddingLeft: spacing[4],
    paddingRight: spacing[5],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  body: { gap: spacing[3] },
  textBlock: { paddingHorizontal: spacing[1], gap: spacing[1] },
  category: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[1000],
  },
  postText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  photoRow: { gap: spacing[2] },
  photo: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userDetails: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flex: 1, minWidth: 0 },
  avatar: {
    backgroundColor: colors.blue[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.text.onDark, fontFamily: 'NationalPark_600SemiBold' },
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
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flexShrink: 0 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  moreBtn: { padding: 2 },
  count: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[700],
  },
});
