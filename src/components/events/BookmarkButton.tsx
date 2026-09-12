import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';

/**
 * Bookmark toggle with a micro-interaction, driven by Reanimated on the UI
 * thread.
 *
 * Saving: the filled icon springs up to 1.35× and settles, while a soft blue
 * ring expands out from behind it and fades. Unsaving: a quick dip and settle,
 * no ring — release should feel lighter than commit.
 *
 * It plays only when `saved` *changes*, so a list of already-saved events
 * does not pop on first render. The Events list holds a saved card in place
 * for half a second before moving it into Wishlist, so the same instance is
 * still mounted when the flip happens and the pop is seen where it was tapped.
 */
export function BookmarkButton({
  saved,
  size,
  idleColor,
  onPress,
  hitSlop = 8,
  style,
}: {
  saved: boolean;
  size: number;
  /** Colour of the outline icon when not saved. */
  idleColor: string;
  onPress: () => void;
  hitSlop?: number;
  style?: object;
}) {
  const scale = useSharedValue(1);
  const ring = useSharedValue(0); // 0 = hidden, 1 = fully expanded
  const prev = useRef(saved);

  const playSave = () => {
    scale.value = withSequence(
      withTiming(1.35, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 9, stiffness: 220 }),
    );
    ring.value = 0;
    ring.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) ring.value = 0;
    });
  };

  const playUnsave = () => {
    scale.value = withSequence(
      withTiming(0.8, { duration: 90, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 10, stiffness: 260 }),
    );
  };

  useEffect(() => {
    if (prev.current === saved) return;
    prev.current = saved;
    if (saved) {
      playSave();
    } else {
      playUnsave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  // The ring starts just larger than the glyph and grows to ~2.4×, fading as
  // it goes so it reads as a pulse rather than a shape.
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ring.value, [0, 0.15, 1], [0, 0.35, 0]),
    transform: [{ scale: interpolate(ring.value, [0, 1], [0.45, 1]) }],
  }));
  const ringSize = size * 2.4;

  return (
    <Pressable style={[styles.root, style]} hitSlop={hitSlop} onPress={onPress}>
      <View style={styles.center} pointerEvents="none">
        <Animated.View
          style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }, ringStyle]}
        />
        <Animated.View style={iconStyle}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={size}
            color={saved ? colors.blue[500] : idleColor}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', backgroundColor: colors.blue[500] },
});
