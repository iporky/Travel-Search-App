import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { onboardingSource } from '../../assets/onboardingAssets';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const LOGO      = onboardingSource(require('../../../assets/onboarding/logo.png') as ImageSourcePropType, 'logo');
const BIRD_CARD = onboardingSource(require('../../../assets/mascot/bird-card.png') as ImageSourcePropType, 'bird-card');

interface Props {
  activeIndex: number;
  onPress: () => void;
  active?: boolean;
}

export function SplashWelcome4({ onPress, active }: Props) {
  const { t } = useTranslation();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const jump      = useRef(new Animated.Value(0)).current;
  const floatBird = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    fadeAnim.setValue(0); jump.setValue(0); floatBird.setValue(0);
    // Bird jumps upward from ATM area: quick fade, spring up with overshoot + bounce settle
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.spring(jump, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
    ]).start(() => {
      // gentle float loop after entrance settles
      Animated.loop(Animated.sequence([
        Animated.timing(floatBird, { toValue: 1, duration: 1750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatBird, { toValue: 0, duration: 1750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    });
  }, [active]);

  // jump rises from ATM area (down) to final position with a slight horizontal curve
  const jumpY = jump.interpolate({ inputRange: [0, 1], outputRange: [sy(190), 0] });
  const jumpX = jump.interpolate({ inputRange: [0, 0.5, 1], outputRange: [sx(24), sx(-6), 0] });
  const floatY = floatBird.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

  return (
    <Pressable style={styles.root} onPress={onPress}>
      <LinearGradient
        colors={['#f5f7ff', '#e3f4fb']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Hero bird with card — jumps up from ATM area */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: sx(45),
          top: sy(124),
          width: sx(335),
          height: sy(335),
          opacity: fadeAnim,
          transform: [{ translateX: jumpX }, { translateY: jumpY }, { translateY: floatY }],
        }}
      >
        <Image source={BIRD_CARD} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
      </Animated.View>

      {/* Logo */}
      <Image source={LOGO} style={{ position: 'absolute', left: sx(20), top: sy(66), width: sx(92), height: sy(15) }} resizeMode="contain" />

      {/* Bottom text & pagination */}
      <Animated.View style={[styles.contentContainer, { bottom: sy(136), opacity: fadeAnim, paddingHorizontal: sx(16) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.four.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.four.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.four.subtitle')}</Text>
        </View>
        <View style={styles.pagination}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === 3 ? '#527dff' : '#c9e3ff' }]} />
          ))}
        </View>

      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: W, height: H, overflow: 'hidden', backgroundColor: '#e3f4fb' },
  contentContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: sy(21),
  },
  textBlock: { alignItems: 'center', gap: sy(12) },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: '8px', justifyContent: 'center' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: sx(-1.4), lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: sx(-1.4), lineHeight: sy(44) },
  subtitle: { fontFamily: 'NationalPark_500Medium', fontSize: sx(16), color: '#657586', letterSpacing: sx(-0.16), lineHeight: sy(24), textAlign: 'center' },
  pagination: { flexDirection: 'row', gap: sx(8) },
  dot: { width: sx(8), height: sx(8), borderRadius: sx(4) },
});
