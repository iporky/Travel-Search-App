import React, { useCallback, useState } from 'react';
import { GestureResponderEvent, Pressable, PressableProps, PressableStateCallbackType } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  /** How far the control shrinks while held. */
  pressedScale?: number;
};

/**
 * A Pressable with tactile feedback: it eases down to `pressedScale` while
 * held and springs back on release. Drop-in for Pressable — every prop passes
 * straight through, including a function-form `style`.
 *
 * The scale is applied to the Pressable itself rather than a wrapper, so the
 * control keeps whatever layout role it has (a flex:1 tab, an absolutely
 * placed badge). Reanimated runs the transform on the UI thread, so the
 * feedback lands immediately even when the press handler kicks off JS work.
 */
export function PressableScale({
  pressedScale = 0.96,
  style,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  // Function-form styles need the press state; track it here so the resolved
  // style can be merged with the animated one.
  const [pressed, setPressed] = useState(false);

  const handleIn = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(true);
      scale.value = withTiming(pressedScale, { duration: 90 });
      onPressIn?.(e);
    },
    [pressedScale, onPressIn, scale],
  );
  const handleOut = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(false);
      scale.value = withSpring(1, { damping: 12, stiffness: 320 });
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const resolved =
    typeof style === 'function' ? (style as (s: PressableStateCallbackType) => unknown)({ pressed }) : style;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[resolved as object, disabled ? null : animated]}
      onPressIn={disabled ? undefined : handleIn}
      onPressOut={disabled ? undefined : handleOut}
    />
  );
}
