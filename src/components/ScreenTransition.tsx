import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

type Mode = 'fade' | 'push';

type Props = {
  children: React.ReactNode;
  /** Re-runs the animation whenever this changes (screen identity). */
  transitionKey: string;
  /** 'fade' for sibling tabs, 'push' for drilling into a detail screen. */
  mode?: Mode;
};

const DURATION = 260;

/**
 * Cross-fades (and gently slides) its children whenever `transitionKey`
 * changes, so switching tabs or pushing a detail screen doesn't snap.
 *
 * Uses the native driver, so the animation runs off the JS thread and stays
 * smooth even while a feed is still rendering.
 */
export function ScreenTransition({ children, transitionKey, mode = 'fade' }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [transitionKey, progress]);

  // Tabs rise slightly; pushed screens come in from the right.
  const offset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: mode === 'push' ? [28, 0] : [10, 0],
  });

  return (
    <Animated.View
      style={[
        styles.flex,
        {
          opacity: progress,
          transform: mode === 'push' ? [{ translateX: offset }] : [{ translateY: offset }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
