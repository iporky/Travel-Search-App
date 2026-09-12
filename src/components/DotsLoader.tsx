import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/tokens';

type Props = {
  /** Dot diameter. */
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

function Dot({ delay, size, color }: { delay: number; size: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 340, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 340, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(v);
  }, [delay, v]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * v.value,
    transform: [{ scale: 0.8 + 0.3 * v.value }],
  }));
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />
  );
}

/** Small inline "thinking" indicator — dots pulsing in turn, on the UI thread. */
export function DotsLoader({ size = 8, color = colors.blue[500], style }: Props) {
  return (
    <View style={[styles.row, { gap: size * 0.75, height: size * 2 }, style]}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} delay={i * 160} size={size} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
