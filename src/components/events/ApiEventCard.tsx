import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from 'react-native-svg';
import { colors, radius, spacing } from '../../theme/tokens';
import { ApiEvent } from '../../api/events';

// Figma "Buzz/Eventcard" (node 10352:31688), as laid out in the Vibes feed
// (11478:76666). 346×142 unit:
//   • white info panel, radius 20, spanning from x=126 to the right edge
//   • photo slab 174px wide, full height, rounded on its OUTER corners only,
//     with a diagonal inner edge running from x=150 (top) to x=174 (bottom)
//     — measured off the design render — so the photo cuts into the panel
//   • info: "time · place" (12/SemiBold muted), title (16/SemiBold strong,
//     2 lines), location row (mdi:location + 12/Medium muted), then avatars
//     + Join at the bottom. Save icon top-right of the info block.
// left/right variant mirrors the whole card. Join/avatars are dropped here —
// only Like + Wishlist survive from the web feature set.

export const CARD_H = 142;

// Design annotation on the image slot: "when there is no picture for events
// let's put random default image sth related to the event". No stock art in
// the repo, so the fallback is a category-keyed illustration: a tinted slab
// with the category's glyph, so a concert, exhibition, sports match etc. each
// read differently and the card keeps its full 174px photo footprint.
function categoryArt(category: string | null): { icon: keyof typeof Ionicons.glyphMap; tint: string } {
  const c = (category ?? '').toLowerCase();
  if (/music|concert|classical|jazz|band|dance|performance/.test(c)) return { icon: 'musical-notes', tint: '#dbe4ff' };
  if (/exhibit|art|gallery|museum|design|photo/.test(c)) return { icon: 'color-palette', tint: '#ffe3ea' };
  if (/theat|play|musical|drama|opera/.test(c)) return { icon: 'film', tint: '#f3e3ff' };
  if (/sport|match|game|marathon|run/.test(c)) return { icon: 'trophy', tint: '#e0f5ec' };
  if (/food|market|festival|fair/.test(c)) return { icon: 'restaurant', tint: '#fff0d6' };
  if (/edu|class|lecture|workshop|academy|experience|talk/.test(c)) return { icon: 'school', tint: '#e2f0ff' };
  if (/kid|child|family/.test(c)) return { icon: 'happy', tint: '#fff5d6' };
  return { icon: 'calendar', tint: colors.surface.focus };
}
const IMG_W = 174;
const SLANT = 24; // x=150 → x=174 across the card height

type Props = {
  event: ApiEvent;
  /** Even index → image left (design's first card); odd → image right. */
  index: number;
  width: number;
  onPress: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
};

export function ApiEventCard({ event, index, width, onPress, onToggleLike, onToggleSave }: Props) {
  const imageLeft = index % 2 === 0;
  const meta = [event.schedule ?? event.date, event.category].filter(Boolean).join(' · ');
  const H = CARD_H;
  const R = 20;

  // Slanted photo silhouette (in image-local coords, 174 wide × 142 tall).
  // Left variant: outer edge on the left is rounded; inner edge slants
  // top(x=150) → bottom(x=174). Right variant is the mirror image.
  const leftPath = `M ${R} 0 H ${IMG_W - SLANT} L ${IMG_W} ${H} H ${R} A ${R} ${R} 0 0 1 0 ${H - R} V ${R} A ${R} ${R} 0 0 1 ${R} 0 Z`;
  const rightPath = `M 0 ${H} L ${SLANT} 0 H ${IMG_W - R} A ${R} ${R} 0 0 1 ${IMG_W} ${R} V ${H - R} A ${R} ${R} 0 0 1 ${IMG_W - R} ${H} Z`;
  // The slanted inner edge on its own (for the divider strokes).
  const edgePath = imageLeft ? `M ${IMG_W - SLANT} 0 L ${IMG_W} ${H}` : `M ${SLANT} 0 L 0 ${H}`;
  const clipId = `evclip-${event.id}-${imageLeft ? 'l' : 'r'}`;
  const art = categoryArt(event.category);

  const photo = (
    <View style={[styles.imageBox, imageLeft ? styles.imageLeft : styles.imageRight]}>
      <Svg width={IMG_W} height={H} viewBox={`0 0 ${IMG_W} ${H}`}>
        <Defs>
          <ClipPath id={clipId}>
            <Path d={imageLeft ? leftPath : rightPath} />
          </ClipPath>
        </Defs>
        {event.image ? (
          <SvgImage
            href={{ uri: event.image }}
            width={IMG_W}
            height={H}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
        ) : (
          <Path d={imageLeft ? leftPath : rightPath} fill={art.tint} />
        )}
        {/* Divider along the slanted inner edge — a soft inner shadow plus a
            hairline, both clipped to the photo so a white poster still reads
            as a distinct slab against the white info panel. */}
        <Path
          d={edgePath}
          stroke="rgba(16,24,40,0.10)"
          strokeWidth={8}
          fill="none"
          clipPath={`url(#${clipId})`}
        />
        <Path
          d={edgePath}
          stroke="rgba(16,24,40,0.16)"
          strokeWidth={1.5}
          fill="none"
          clipPath={`url(#${clipId})`}
        />
        {/* Faint outline on the outer silhouette so pale photos keep their shape. */}
        <Path
          d={imageLeft ? leftPath : rightPath}
          stroke="rgba(16,24,40,0.07)"
          strokeWidth={2}
          fill="none"
          clipPath={`url(#${clipId})`}
        />
      </Svg>
      {!event.image && (
        <View style={styles.imageFallbackIcon} pointerEvents="none">
          <Ionicons name={art.icon} size={44} color={colors.blue[500]} />
        </View>
      )}
    </View>
  );

  const info = (
    <View style={[styles.info, imageLeft ? styles.infoRight : styles.infoLeft]}>
      <View style={styles.textInfo}>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>
          {event.text}
        </Text>
        {event.location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={15} color={colors.gray[700]} />
            <Text style={styles.location} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.bottomRow}>
        <Pressable style={styles.likeBtn} hitSlop={6} onPress={onToggleLike}>
          <Ionicons
            name={event.like_status ? 'heart' : 'heart-outline'}
            size={18}
            color={event.like_status ? colors.red[100] : colors.gray[700]}
          />
          <Text style={styles.likeCount}>{event.like_count}</Text>
        </Pressable>
      </View>
      {/* Icon/Save — top-right of the info block. */}
      <Pressable style={styles.save} hitSlop={8} onPress={onToggleSave}>
        <Ionicons
          name={event.save_status ? 'bookmark' : 'bookmark-outline'}
          size={16}
          color={event.save_status ? colors.blue[500] : colors.gray[700]}
        />
      </Pressable>
    </View>
  );

  return (
    <Pressable style={[styles.card, { width }]} onPress={onPress}>
      {/* White panel: from x=126 (left variant) / to x=220 (right variant). */}
      <View
        style={[
          styles.panel,
          imageLeft ? { left: IMG_W - 48, right: 0 } : { left: 0, right: IMG_W - 48 },
        ]}
      />
      {photo}
      {info}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { height: CARD_H, position: 'relative' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#fefefe',
    borderRadius: 20,
  },
  imageBox: { position: 'absolute', top: 0, width: IMG_W, height: CARD_H },
  imageLeft: { left: 0 },
  imageRight: { right: 0 },
  imageFallbackIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    width: 158,
    justifyContent: 'space-between',
  },
  infoRight: { right: 12 },
  infoLeft: { left: 14 },
  textInfo: { gap: 4, paddingRight: 24 },
  meta: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[700],
  },
  title: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeCount: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[900],
    backgroundColor: colors.surface.default,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  save: { position: 'absolute', top: -4, right: 0, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
