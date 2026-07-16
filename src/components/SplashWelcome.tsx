import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Mascot } from './Mascot';
import { colors, gradients, spacing, typography } from '../theme/tokens';

type Props = {
  onDone: () => void;
};

/**
 * Splash + Welcoming. Shows "Konnect" wordmark, then greeting "안녕하세요" with mascot,
 * then transitions to home.
 */
export function SplashWelcome({ onDone }: Props) {
  const stage = useRef(new Animated.Value(0)).current; // 0 splash -> 1 welcome -> 2 done
  const fade = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(stage, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(bounce, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.delay(1400),
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [stage, fade, bounce, onDone]);

  const splashOpacity = stage.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const welcomeOpacity = stage.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const mascotTranslate = bounce.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.overlay, { opacity: fade }]}
    >
      <LinearGradient colors={gradients.surfaceDim} style={StyleSheet.absoluteFill} />

      {/* Splash */}
      <Animated.View style={[styles.center, StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
        <Text style={styles.wordmark}>Konnect</Text>
        <View style={{ height: spacing[8] }} />
        <Mascot size={180} />
      </Animated.View>

      {/* Welcoming */}
      <Animated.View style={[styles.center, StyleSheet.absoluteFill, { opacity: welcomeOpacity }]}>
        <Text style={[typography.heading32Medium, styles.greeting]}>안녕하세요</Text>
        <View style={{ height: spacing[6] }} />
        <Animated.View style={{ transform: [{ translateY: mascotTranslate }] }}>
          <Mascot size={200} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { zIndex: 1000, elevation: 1000 },
  center: { alignItems: 'center', justifyContent: 'center' },
  wordmark: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.blue[600],
    letterSpacing: -1.5,
  },
  greeting: {
    color: colors.text.primary,
    fontSize: 36,
  },
});
