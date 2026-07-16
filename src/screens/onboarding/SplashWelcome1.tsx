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

const LOGO       = onboardingSource(require('../../../assets/onboarding/logo.png') as ImageSourcePropType, 'logo');
const BIRD_LEFT  = onboardingSource(require('../../../assets/mascot/bird-bg-left.png') as ImageSourcePropType, 'bird-bg-left');
const BIRD_RIGHT = onboardingSource(require('../../../assets/mascot/bird-bg-right.png') as ImageSourcePropType, 'bird-bg-right');
const BIRD_HERO  = onboardingSource(require('../../../assets/mascot/bird-hero.png') as ImageSourcePropType, 'bird-hero');

interface Props {
  /** index of the active onboarding page (drives pagination dots) */
  activeIndex: number;
  /** advance to the next page */
  onPress: () => void;
  /** run the intro sequence when this screen becomes visible */
  active?: boolean;
}

export function SplashWelcome1({ activeIndex, onPress, active = true }: Props) {
  const { t } = useTranslation();
  const leftOpacity  = useRef(new Animated.Value(0)).current;
  const rightOpacity = useRef(new Animated.Value(0)).current;
  const mainOpacity = useRef(new Animated.Value(0)).current;
  const mainScale   = useRef(new Animated.Value(0.9)).current;
  const floatA      = useRef(new Animated.Value(0)).current;
  const floatB      = useRef(new Animated.Value(0)).current;
  const floatMain   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    leftOpacity.setValue(0);
    rightOpacity.setValue(0);
    mainOpacity.setValue(0);
    mainScale.setValue(0.9);

    // Bird 1 (left, background) appears first
    Animated.timing(leftOpacity, { toValue: 0.55, duration: 600, useNativeDriver: true }).start();

    // Bird 2 (right, closer) appears ~0.8s later
    Animated.sequence([
      Animated.delay(800),
      Animated.timing(rightOpacity, { toValue: 0.7, duration: 600, useNativeDriver: true }),
    ]).start();

    // Main bird (foreground) appears ~1.6s, scale 90% -> 100% natural settle
    Animated.sequence([
      Animated.delay(1600),
      Animated.parallel([
        Animated.timing(mainOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(mainScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]),
    ]).start();
  }, [active]);

  useEffect(() => {
    const mk = (v: Animated.Value, dur: number) =>
      Animated.loop(Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
    const a = mk(floatA, 2000); const b = mk(floatB, 2400); const c = mk(floatMain, 1800);
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, []);

  const tyA    = floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const tyB    = floatB.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const tyMain = floatMain.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  return (
    <Pressable onPress={onPress} style={styles.root}>
      <LinearGradient
        colors={['#c9e3ff', '#eaefff']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Background bird — left */}
      <Animated.Image
        source={BIRD_LEFT}
        resizeMode="cover"
        style={{
          position: 'absolute',
          left: sx(26), top: sy(124),
          width: sx(119), height: sy(64),
          opacity: leftOpacity,
          transform: [{ translateY: tyA }],
        }}
      />

      {/* Background bird — right */}
      <Animated.Image
        source={BIRD_RIGHT}
        resizeMode="cover"
        style={{
          position: 'absolute',
          left: sx(203), top: sy(225),
          width: sx(152), height: sy(96),
          opacity: rightOpacity,
          transform: [{ translateY: tyB }],
        }}
      />

      {/* Main hero bird */}
      <Animated.Image
        source={BIRD_HERO}
        resizeMode="cover"
        style={{
          position: 'absolute',
          left: sx(70), top: sy(350),
          width: sx(230), height: sy(180),
          opacity: mainOpacity,
          transform: [{ translateY: tyMain }],
        }}
      />

      {/* Logo */}
      <Image
        source={LOGO}
        resizeMode="contain"
        style={{ position: 'absolute', left: sx(20), top: sy(66), width: sx(92), height: sy(15), zIndex: 10 }}
      />

      {/* Bottom content */}
      <View style={[styles.bottomContent, { bottom: sy(136), paddingHorizontal: sx(16) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.one.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.one.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.one.subtitle')}</Text>
        </View>
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: W, height: H, overflow: 'hidden', backgroundColor: '#eaf4ff' },
  bottomContent: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: sy(21) },
  textBlock: { alignItems: 'center', gap: sy(12) },
  titleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { width: sx(270), fontSize: sx(16), fontFamily: 'NationalPark_500Medium', color: '#657586', textAlign: 'center', lineHeight: sy(24), letterSpacing: -0.16 },
  dotsRow: { flexDirection: 'row', gap: sx(8) },
  dot: { width: sx(8), height: sx(8), borderRadius: 9999 },
  dotActive:   { backgroundColor: '#527dff' },
  dotInactive: { backgroundColor: '#c9e3ff' },
});
