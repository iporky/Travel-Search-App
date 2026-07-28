import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, spacing } from '../../theme/tokens';
import { LoadingImage } from '../LoadingImage';
import { VibeEvent } from '../../types/vibes';
import { AvatarStack } from './AvatarStack';

type Props = {
  event: VibeEvent;
  /** Even index → image right; odd → image left (zigzag). */
  index: number;
  onPress: () => void;
  onJoin: () => void;
  onToggleSave: () => void;
};

// Figma: Vibes event card (node 11478:76652 feed) — zigzag layout: time·place,
// title, location, participant avatars, Join button, bookmark. Image side
// alternates per row.
export function EventCard({ event, index, onPress, onJoin, onToggleSave }: Props) {
  const { t } = useTranslation();
  const imageRight = index % 2 === 0;

  const details = (
    <View style={styles.details}>
      <Text style={styles.meta}>
        {event.time} · {event.place}
      </Text>
      <Text style={styles.title} numberOfLines={2}>
        {event.title}
      </Text>
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={13} color={colors.gray[700]} />
        <Text style={styles.location}>{event.place}</Text>
      </View>
      <View style={styles.bottomRow}>
        <AvatarStack names={event.participants} total={event.participantCount} size={22} />
        <Pressable
          style={[styles.joinBtn, event.joined && styles.joinedBtn]}
          onPress={onJoin}
          hitSlop={4}
        >
          <Text style={[styles.joinText, event.joined && styles.joinedText]}>
            {event.joined ? t('vibes.joined') : t('vibes.join')}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  const image = <LoadingImage source={{ uri: event.photos[0] }} style={styles.image} />;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {imageRight ? (
        <>
          {details}
          {image}
        </>
      ) : (
        <>
          {image}
          {details}
        </>
      )}
      <Pressable style={styles.bookmark} hitSlop={6} onPress={onToggleSave}>
        <Ionicons
          name={event.saved ? 'bookmark' : 'bookmark-outline'}
          size={18}
          color={event.saved ? colors.blue[500] : colors.icon.disabled}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.gray[100],
    borderRadius: radius.xl,
    padding: spacing[3],
    ...shadows.cardDefault,
  },
  details: { flex: 1, gap: spacing[1], justifyContent: 'center' },
  meta: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
  title: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  location: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
  joinBtn: {
    backgroundColor: colors.blue[500],
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1] + 2,
  },
  joinedBtn: { backgroundColor: colors.surface.subtle },
  joinText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[100],
  },
  joinedText: { color: colors.gray[700] },
  image: {
    width: 120,
    height: 120,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  bookmark: { position: 'absolute', top: spacing[3], right: spacing[3] },
});
