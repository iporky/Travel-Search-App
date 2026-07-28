import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { StoryUser } from '../../types/drops';
import { LoadingImage } from '../LoadingImage';

type Props = {
  users: StoryUser[];
  activeId?: string | null;
  onPress: (user: StoryUser) => void;
};

// Figma: "Story" row (node 11478:75641) — horizontal avatar carousel at the top
// of the Drops feed. One bubble per user with recent Drops; tapping filters the
// grid to that user's Drops. Unseen = accent ring, seen = plain.
export function StoryAvatarList({ users, activeId, onPress }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {users.map((user) => {
        const active = activeId === user.id;
        return (
          <Pressable key={user.id} style={styles.item} onPress={() => onPress(user)}>
            <View
              style={[
                styles.ring,
                (active || !user.seen) && styles.ringUnseen,
                active && styles.ringActive,
              ]}
            >
              <LoadingImage source={{ uri: user.avatar }} style={styles.avatar} showSpinner={false} />
              <View style={styles.badge}>
                <Text style={styles.badgeText}>🇰🇷</Text>
              </View>
            </View>
            <Text style={styles.username} numberOfLines={1}>
              {user.username}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing[3], paddingHorizontal: spacing[5], alignItems: 'center' },
  item: { alignItems: 'center', gap: spacing[1], width: 64 },
  ring: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  ringUnseen: { borderColor: colors.blue[300] },
  ringActive: { borderColor: colors.blue[500] },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  badge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, lineHeight: 16 },
  username: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.22,
    color: colors.gray[700],
  },
});
