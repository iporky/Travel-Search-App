import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

type Mode = 'fade' | 'push' | 'pop';

type Props = {
  children: React.ReactNode;
  /** Re-runs the animation whenever this changes (screen identity). */
  transitionKey: string;
  /**
   * 'fade' for sibling tabs, 'push' for drilling forward (enters from the
   * right), 'pop' for going back (enters from the left).
   */
  mode?: Mode;
  /** Fires once the enter animation settles. */
  onTransitionEnd?: () => void;
};

const DURATION = 300;

/**
 * Cross-fades and slides its children whenever `transitionKey` changes, so
 * switching tabs or moving between screens never snaps.
 *
 * Uses the native driver, so the animation runs off the JS thread and stays
 * smooth even while the incoming screen is still rendering.
 */
export function ScreenTransition({
  children,
  transitionKey,
  mode = 'fade',
  onTransitionEnd,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      // Slight overshoot-free deceleration — reads as "settling", not "stopping".
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onTransitionEnd?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transitionKey, progress]);

  // Tabs rise slightly; pushed screens come in from the right, popped from the left.
  const distance = mode === 'fade' ? 10 : 36;
  const from = mode === 'pop' ? -distance : distance;
  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });

  return (
    <Animated.View
      style={[
        styles.flex,
        {
          opacity: progress,
          transform:
            mode === 'fade'
              ? [{ translateY: offset }]
              : [{ translateX: offset }, { scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
