import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale as Pressable } from '../PressableScale';
import { BookmarkButton } from './BookmarkButton';
import Svg, { Path } from 'react-native-svg';
import { colors, radius, spacing } from '../../theme/tokens';
import { ApiEvent } from '../../api/events';
import { PressableScale } from '../PressableScale';

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
  // A poster URL that fails to decode falls back to the category art. (The
  // photo is a plain RN <Image> on purpose: rendering remote posters through
  // react-native-svg's <Image> hard-crashed the app with a native NPE
  // whenever Fresco delivered a null bitmap — bad URL, or the card recycled
  // mid-download during the load-more scroll.)
  const [imgFailed, setImgFailed] = useState(false);
  const showPhoto = !!event.image && !imgFailed;

  // The diagonal cut is an overlay: a wedge filled with the panel color drawn
  // over the photo's inner edge, top(x=150) → bottom(x=174) on the left
  // variant (mirrored on the right), plus the divider strokes along it.
  const wedgePath = imageLeft
    ? `M ${IMG_W - SLANT} 0 L ${IMG_W} ${H} L ${IMG_W} 0 Z`
    : `M ${SLANT} 0 L 0 ${H} L 0 0 Z`;
  const edgePath = imageLeft ? `M ${IMG_W - SLANT} 0 L ${IMG_W} ${H}` : `M ${SLANT} 0 L 0 ${H}`;
  const art = categoryArt(event.category);

  // Info column (Buzz/Eventcard 11478:76670): starts 9 past the photo and
  // ends 16 from the card's outer edge — 147 wide on the 346 card, with the
  // text column at 129 (18 reserved for Icon/Save's overlap). Never less than
  // 110 so thin screens shrink the text instead of running it under the photo.
  const infoW = Math.max(110, width - IMG_W - 9 - 16);

  const photo = (
    <View
      style={[
        styles.imageBox,
        imageLeft ? styles.imageLeft : styles.imageRight,
        !showPhoto && { backgroundColor: art.tint },
      ]}
    >
      {showPhoto ? (
        <Image
          source={{ uri: event.image! }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <View style={styles.imageFallbackIcon} pointerEvents="none">
          <Ionicons name={art.icon} size={44} color={colors.blue[500]} />
        </View>
      )}
      <Svg
        width={IMG_W}
        height={H}
        viewBox={`0 0 ${IMG_W} ${H}`}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {/* Panel-colored wedge cuts the slant into the rectangular photo. */}
        <Path d={wedgePath} fill="#fefefe" />
        {/* Divider along the slanted inner edge — soft shade + hairline so a
            white poster still reads as a distinct slab against the panel. */}
        <Path d={edgePath} stroke="rgba(16,24,40,0.10)" strokeWidth={8} fill="none" />
        <Path d={edgePath} stroke="rgba(16,24,40,0.16)" strokeWidth={1.5} fill="none" />
      </Svg>
    </View>
  );

  const info = (
    <View style={[styles.info, { width: infoW }, imageLeft ? styles.infoRight : styles.infoLeft]}>
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
            <Ionicons name="location" size={15} color="#93a5b9" />
            <Text style={styles.location} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.bottomRow}>
        <PressableScale style={styles.likeBtn} hitSlop={6} onPress={onToggleLike}>
          <Ionicons
            name={event.like_status ? 'heart' : 'heart-outline'}
            size={18}
            color={event.like_status ? colors.red[100] : colors.gray[700]}
          />
          <Text style={styles.likeCount}>{event.like_count}</Text>
        </PressableScale>
      </View>
      {/* Icon/Save — top-right of the info block. */}
      <BookmarkButton
        saved={!!event.save_status}
        size={16}
        idleColor={colors.gray[700]}
        onPress={onToggleSave}
        style={styles.save}
      />
    </View>
  );

  return (
    <PressableScale style={[styles.card, { width }]} onPress={onPress}>
      {/* White panel: from x=126 (left variant) / to x=220 (right variant). */}
      <View
        style={[
          styles.panel,
          imageLeft ? { left: IMG_W - 48, right: 0 } : { left: 0, right: IMG_W - 48 },
        ]}
      />
      {photo}
      {info}
    </PressableScale>
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
  imageBox: { position: 'absolute', top: 0, width: IMG_W, height: CARD_H, overflow: 'hidden' },
  imageLeft: { left: 0, borderTopLeftRadius: 20, borderBottomLeftRadius: 20 },
  imageRight: { right: 0, borderTopRightRadius: 20, borderBottomRightRadius: 20 },
  imageFallbackIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    position: 'absolute',
    top: 14,
    height: 115,
    // Design stacks the like row 8 under the text block (no bottom pinning).
    gap: 8,
  },
  infoRight: { right: 16 },
  infoLeft: { left: 16 },
  textInfo: { gap: 4, paddingRight: 18 },
  meta: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    // Semantic/Content/muted — time · place reads quieter than the title.
    color: '#93a5b9',
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
    // Semantic/Content/muted, matching the meta line.
    color: '#93a5b9',
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
  save: { position: 'absolute', top: -4, right: -6, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
});
