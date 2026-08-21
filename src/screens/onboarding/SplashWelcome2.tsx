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
import Svg, { Defs, Ellipse, RadialGradient, Stop, SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { onboardingSource } from '../../assets/onboardingAssets';
import { SCREEN2_BIRD_SVG } from '../../assets/screen2BirdSvg';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const ICON_PASSPORT  = onboardingSource(require('../../../assets/onboarding/signup/screen2/icon-passport.png') as ImageSourcePropType, 'signup-s2-icon-passport');
const ICON_FOOD      = onboardingSource(require('../../../assets/onboarding/signup/screen2/icon-food.png') as ImageSourcePropType, 'signup-s2-icon-food');
const ICON_BUS       = onboardingSource(require('../../../assets/onboarding/signup/screen2/icon-bus.png') as ImageSourcePropType, 'signup-s2-icon-bus');
const ICON_PLANE     = onboardingSource(require('../../../assets/onboarding/signup/screen2/icon-plane.png') as ImageSourcePropType, 'signup-s2-icon-plane');
const ICON_MAP       = onboardingSource(require('../../../assets/onboarding/signup/screen2/icon-map.png') as ImageSourcePropType, 'signup-s2-icon-map');
const ICON_EMERGENCY = onboardingSource(require('../../../assets/onboarding/signup/screen2/icon-emergency.png') as ImageSourcePropType, 'signup-s2-icon-emergency');

interface Props {
  activeIndex: number;
  onPress: () => void;
  active?: boolean;
}

// Each floating service icon: bubble centre (design coords, 375×812), bubble
// diameter, tilt, resting opacity, and the inner icon size.
const ICONS = [
  { icon: ICON_PASSPORT,  cx: 114.63, cy: 186.63, size: 80, rotate: '-10.53deg', opacity: 0.6, imgW: 44, imgH: 51 },
  { icon: ICON_FOOD,      cx: 287.46, cy: 203.96, size: 95, rotate: '24.46deg',  opacity: 0.6, imgW: 62, imgH: 58 },
  { icon: ICON_EMERGENCY, cx: 71.75,  cy: 313.96, size: 76, rotate: '-16.56deg', opacity: 1.0, imgW: 60, imgH: 59 },
  { icon: ICON_MAP,       cx: 283.08, cy: 408.92, size: 100, rotate: '26.3deg',  opacity: 0.6, imgW: 75, imgH: 69 },
  { icon: ICON_BUS,       cx: 85.92,  cy: 458.84, size: 84, rotate: '-11.31deg', opacity: 0.6, imgW: 60, imgH: 56 },
  { icon: ICON_PLANE,     cx: 200.5,  cy: 485.1,  size: 68, rotate: '-11.31deg', opacity: 0.6, imgW: 42, imgH: 39 },
] as const;

// Bird centre in design coords.
const BIRD_CX = 188;
const BIRD_CY = 342;
const BIRD_W = 240;
const BIRD_H = 176;

export function SplashWelcome2({ onPress, active }: Props) {
  const { t } = useTranslation();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const birdScale = useRef(new Animated.Value(0.92)).current;
  const birdRise  = useRef(new Animated.Value(0)).current;
  const birdFloat = useRef(new Animated.Value(0)).current;
  const birdTilt  = useRef(new Animated.Value(0)).current;
  // per-icon entrance (bloom from centre) + gentle float
  const entrances = useRef(ICONS.map(() => new Animated.Value(0))).current;
  const floats    = useRef(ICONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!active) return;
    fadeAnim.setValue(0); birdScale.setValue(0.9); birdRise.setValue(0);
    birdFloat.setValue(0); birdTilt.setValue(0);
    entrances.forEach((e) => e.setValue(0));

    // Bird rises up from below, scale 90% → 100%, settle at centre.
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(birdRise, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(birdScale, { toValue: 1.0, friction: 6, tension: 70, useNativeDriver: true }),
    ]).start();

    // Icons bloom outward from centre, scale 0 → 100%, fade in, 0.15s stagger.
    Animated.parallel(
      entrances.map((e, i) =>
        Animated.sequence([
          Animated.delay(400 + i * 150),
          Animated.timing(e, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ),
    ).start();

    Animated.loop(Animated.sequence([
      Animated.timing(birdFloat, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(birdFloat, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    Animated.loop(Animated.sequence([
      Animated.timing(birdTilt, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(birdTilt, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [active]);

  useEffect(() => {
    const anims = floats.map((v, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 150),
        Animated.timing(v, { toValue: 1, duration: 1000 + i * 100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1000 + i * 100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])));
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  const ty = (v: Animated.Value, amp = sy(10)) => v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] });

  const birdTranslateY = birdRise.interpolate({ inputRange: [0, 1], outputRange: [sy(80), 0] });
  const birdFloatY = birdFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -sy(12)] });
  const birdRotate = birdTilt.interpolate({ inputRange: [0, 1], outputRange: ['-1.6deg', '1.6deg'] });

  const ORIGIN_X = sx(BIRD_CX);
  const ORIGIN_Y = sy(BIRD_CY);

  return (
    <Pressable style={styles.root} onPress={onPress}>
      {/* Base gradient — expo-linear-gradient with absoluteFill always covers the
          whole screen on any size (phone, foldable, tablet). */}
      <LinearGradient
        colors={['#cfe6ff', '#e4f0ff', '#f3f6fe']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft radial glow behind the hero bird (small positioned SVG). */}
      <Svg
        style={{ position: 'absolute', left: (W - sx(470)) / 2, top: sy(BIRD_CY) - sy(215), width: sx(470), height: sy(430) }}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="s2glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#s2glow)" />
      </Svg>

      {/* Floating service-icon bubbles */}
      {ICONS.map((it, i) => {
        const left = sx(it.cx - it.size / 2);
        const top = sy(it.cy - it.size / 2);
        const size = sx(it.size);
        const cx = left + size / 2;
        const cy = top + size / 2;
        const e = entrances[i];
        const tx = e.interpolate({ inputRange: [0, 1], outputRange: [ORIGIN_X - cx, 0] });
        const tyE = e.interpolate({ inputRange: [0, 1], outputRange: [ORIGIN_Y - cy, 0] });
        const scaleE = e.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
        const opE = e.interpolate({ inputRange: [0, 1], outputRange: [0, it.opacity] });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute', left, top, width: size, height: size,
              opacity: opE, alignItems: 'center', justifyContent: 'center',
              transform: [{ translateX: tx }, { translateY: tyE }, { rotate: it.rotate }, { translateY: ty(floats[i]) }, { scale: scaleE }],
            }}
          >
            <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }]}>
              <Image source={it.icon} style={{ width: sx(it.imgW), height: sy(it.imgH) }} resizeMode="contain" />
            </View>
          </Animated.View>
        );
      })}

      {/* Hero bird — rises from below and settles at centre. Rendered via SvgXml
          (react-native-svg) instead of <Image>: the embedded raster decodes
          through react-native-svg's own path, which renders reliably here. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', left: sx(BIRD_CX - BIRD_W / 2), top: sy(BIRD_CY - BIRD_H / 2),
          width: sx(BIRD_W), height: sy(BIRD_H), opacity: fadeAnim,
          transform: [{ translateY: birdTranslateY }, { translateY: birdFloatY }, { rotate: birdRotate }, { scale: birdScale }],
        }}
      >
        <SvgXml xml={SCREEN2_BIRD_SVG} width={sx(BIRD_W)} height={sy(BIRD_H)} />
      </Animated.View>

      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      <Animated.View style={[styles.contentContainer, { bottom: sy(129), opacity: fadeAnim, paddingHorizontal: sx(16) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.two.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.two.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.two.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#eef4ff' },
  bubble: { backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  contentContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  titleBold: { fontFamily: 'NationalPark_600SemiBold', fontSize: sx(35), color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontFamily: 'NationalPark_500Medium',   fontSize: sx(35), color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { fontFamily: 'NationalPark_500Medium', fontSize: sx(16), color: '#657586', letterSpacing: -0.16, lineHeight: sy(24), textAlign: 'center', width: sx(270) },
});
