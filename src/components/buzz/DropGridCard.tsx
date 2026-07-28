import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { LoadingImage } from '../LoadingImage';

type Props = {
  photo: string;
  views: number;
  /** Flat index in the grid — drives the woven corner-radius pattern. */
  index: number;
  width: number;
  onPress: () => void;
};

const R = 28;
const r = 4;

/** Figma "MediaCard" corners: within each 2-row block the top row is rounded on
 *  the bottom and the bottom row on top, with the extreme outer corners squared,
 *  giving the woven-brick look. */
function corners(index: number) {
  const col = index % 3;
  const roundBottom = Math.floor(index / 3) % 2 === 0;
  if (roundBottom) {
    return {
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      borderBottomLeftRadius: col === 0 ? r : R,
      borderBottomRightRadius: col === 2 ? r : R,
    };
  }
  return {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: col === 0 ? r : R,
    borderTopRightRadius: col === 2 ? r : R,
  };
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return `${n}`;
}

// Figma: "MediaCard" (node 10338:30195) — grid tile with a bottom black gradient
// carrying the view count (eye icon + count).
export function DropGridCard({ photo, views, index, width, onPress }: Props) {
  const height = Math.round(width * 1.53);
  return (
    <Pressable onPress={onPress} style={[styles.card, { width, height }, corners(index)]}>
      <LoadingImage source={{ uri: photo }} style={[styles.image, corners(index)]} />
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.views}>
          <Ionicons name="eye-outline" size={16} color={colors.gray[100]} />
          <Text style={styles.viewsText}>{formatCount(views)}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', backgroundColor: colors.gray[400] },
  image: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: spacing[2],
  },
  views: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  viewsText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.22,
    color: colors.gray[100],
  },
});
