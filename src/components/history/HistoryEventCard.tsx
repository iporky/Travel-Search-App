import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/tokens';

// Figma "Event Card" (10936:78073 wireframe): white card, 1px #c5c6cc60 border,
// radius 8, soft shadow, 12px padding. Left 80×80 thumb box, content column with
// small caption + heart, one-line title, then a pin/clock meta row.

type Props = {
  /** Small caption above the title (category or chat label). */
  caption: string;
  title: string;
  /** Icon rendered in the 80×80 thumb box. */
  thumbIcon: keyof typeof Ionicons.glyphMap;
  location?: string;
  time: string;
  liked: boolean;
  saved?: boolean;
  /** Fade slightly for older groups (Figma: Last Week card is 90% opacity). */
  faded?: boolean;
  onPress: () => void;
  onToggleLike: () => void;
  onLongPress?: () => void;
};

export function HistoryEventCard({
  caption,
  title,
  thumbIcon,
  location,
  time,
  liked,
  saved,
  faded,
  onPress,
  onToggleLike,
  onLongPress,
}: Props) {
  return (
    <Pressable
      style={[styles.card, faded && { opacity: 0.9 }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
      <View style={styles.thumb}>
        <Ionicons name={thumbIcon} size={22} color={colors.gray[600]} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.captionRow}>
            <Text style={styles.caption} numberOfLines={1}>
              {caption}
            </Text>
            {saved ? (
              <Ionicons name="bookmark" size={11} color={colors.blue[500]} />
            ) : null}
          </View>
          <Pressable hitSlop={8} onPress={onToggleLike}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={17}
              color={liked ? colors.red[100] : colors.icon.disabled}
            />
          </Pressable>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.metaRow}>
          {location ? (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={META} />
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={META} />
            <Text style={styles.metaText} numberOfLines={1}>
              {time}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const META = '#93a5b9';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 12,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: 'rgba(197,198,204,0.6)',
    borderRadius: radius.sm,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 },
  caption: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[1000],
  },
  title: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.15,
    color: '#0a1422',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  metaText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: META,
  },
});
