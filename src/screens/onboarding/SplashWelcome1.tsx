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
import { BIRD_SMALL_1_SVG, BIRD_SMALL_2_SVG, MAIN_BIRD_SVG } from '../../assets/screen1Birds';

const { width: W, height: H } = Dimensions.get('window');

const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const CLOUD      = onboardingSource(require('../../../assets/onboarding/signup/screen1/cloud.png') as ImageSourcePropType, 'signup-s1-cloud');
// Birds are inline SVGs (screen1Birds.ts) rendered via SvgXml — the raster
// bird PNGs fail to decode through <Image> on release (see project memory).

// The "Birds" frame sits at (23, 129) inside the 375×812 design frame:
// Main Bird Container top 61 + header 24 + gap 44 = 129; centered → left 23.
const BIRDS_X = 23;
const BIRDS_Y = 129;

/**
 * Renders a cropped window into a larger image, reproducing Figma's
 * overflow-hidden + scaled-inner-image technique exactly. `wp/hp/lp/tp` are the
 * inner image's width/height/left/top as fractions of the window (from Figma).
 */
function SpriteCrop({
  source, w, h, wp, hp, lp, tp, blur,
}: {
  source: ImageSourcePropType;
  w: number; h: number;
  wp: number; hp: number; lp: number; tp: number;
  blur?: number;
}) {
  return (
    <View style={{ width: w, height: h, overflow: 'hidden' }}>
      <Image
        source={source}
        blurRadius={blur}
        resizeMode="stretch"
        style={{ position: 'absolute', width: w * wp, height: h * hp, left: w * lp, top: h * tp }}
      />
    </View>
  );
}

// Shared crop for every "Bottom Cloud" instance (they all sample the same region
// of cloud.png). The top cloud uses its own crop, passed inline below.
const CLOUD_CROP = { wp: 2.5347, hp: 4.249, lp: 0, tp: -0.2946 };

interface Props {
  /** index of the active onboarding page (drives pagination dots) */
  activeIndex: number;
  /** advance to the next page */
  onPress: () => void;
  /** run the intro sequence when this screen becomes visible */
  active?: boolean;
}

export function SplashWelcome1({ onPress, active = true }: Props) {
  const { t } = useTranslation();
  const leftOpacity  = useRef(new Animated.Value(0)).current;
  const rightOpacity = useRef(new Animated.Value(0)).current;
  const mainOpacity  = useRef(new Animated.Value(0)).current;
  const mainScale    = useRef(new Animated.Value(0.9)).current;
  const floatA       = useRef(new Animated.Value(0)).current;
  const floatB       = useRef(new Animated.Value(0)).current;
  const floatMain    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    leftOpacity.setValue(0);
    rightOpacity.setValue(0);
    mainOpacity.setValue(0);
    mainScale.setValue(0.9);

    // Sequential reveal: bird 1 flies in then fully fades out, bird 2 flies in
    // then fully fades out, and only the final hero bird settles and stays.
    const seq = Animated.sequence([
      Animated.timing(leftOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(leftOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(rightOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(rightOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(mainOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(mainScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
      ]),
    ]);
    seq.start();
    return () => seq.stop();
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
      {/* Base sky gradient (replaces the old photo background). */}
      <LinearGradient
        colors={['#e6f3fc', '#f3f9fe']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft radial glow behind the hero bird. */}
      <Svg
        style={{ position: 'absolute', left: (W - sx(470)) / 2, top: sy(439) - sy(215), width: sx(470), height: sy(430) }}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#glow)" />
      </Svg>

      {/* Blurred decorative clouds (subtle, layered). */}
      <View style={{ position: 'absolute', left: sx(148), top: sy(72), opacity: 0.30, transform: [{ scaleX: -1 }, { rotate: '0.69deg' }] }} pointerEvents="none">
        <SpriteCrop source={CLOUD} w={sx(379)} h={sy(155)} blur={2} {...CLOUD_CROP} />
      </View>
      <View style={{ position: 'absolute', left: sx(91), top: sy(114), opacity: 0.15 }} pointerEvents="none">
        <SpriteCrop source={CLOUD} w={sx(327)} h={sy(157)} blur={5} wp={3.1736} hp={4.3948} lp={-1.2293} tp={-2.5665} />
      </View>
      <View style={{ position: 'absolute', left: sx(46), top: sy(246), opacity: 0.10, transform: [{ scaleX: -1 }, { rotate: '0.69deg' }] }} pointerEvents="none">
        <SpriteCrop source={CLOUD} w={sx(169)} h={sy(69)} blur={2} {...CLOUD_CROP} />
      </View>
      <View style={{ position: 'absolute', left: sx(-77), top: sy(257), opacity: 0.30, transform: [{ scaleX: -1 }, { rotate: '0.69deg' }] }} pointerEvents="none">
        <SpriteCrop source={CLOUD} w={sx(261)} h={sy(106)} blur={3} {...CLOUD_CROP} />
      </View>
      <View style={{ position: 'absolute', left: sx(127), top: sy(463), opacity: 0.30, transform: [{ scaleX: -1 }, { rotate: '0.69deg' }] }} pointerEvents="none">
        <SpriteCrop source={CLOUD} w={sx(379)} h={sy(155)} blur={2} {...CLOUD_CROP} />
      </View>

      {/* Small bird 1 — flies in, then out (top-left). SVG viewBox is 119×64
          with the bird rect at (6.6,6.6); blur + 0.4 opacity are baked in. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: sx(BIRDS_X + 5 - 6.6), top: sy(BIRDS_Y + 3 - 6.6),
          opacity: leftOpacity,
          transform: [{ translateY: tyA }],
        }}
      >
        <SvgXml xml={BIRD_SMALL_1_SVG} width={sx(119)} height={sy(64)} />
      </Animated.View>

      {/* Small bird 2 — flies in, then out (mid-right). SVG viewBox 152×96 with
          the bird rect at (5,5); the horizontal flip, blur + 0.5 opacity are
          baked into the SVG. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: sx(BIRDS_X + 183 - 5), top: sy(BIRDS_Y + 111 - 5),
          opacity: rightOpacity,
          transform: [{ translateY: tyB }],
        }}
      >
        <SvgXml xml={BIRD_SMALL_2_SVG} width={sx(152)} height={sy(96)} />
      </Animated.View>

      {/* Main hero bird — fades in, settles, and stays (SVG viewBox 230×180). */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: sx(BIRDS_X + 47), top: sy(BIRDS_Y + 224),
          opacity: mainOpacity,
          transform: [{ translateY: tyMain }, { scale: mainScale }],
        }}
      >
        <SvgXml xml={MAIN_BIRD_SVG} width={sx(230)} height={sy(180)} />
      </Animated.View>

      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      {/* Bottom text */}
      <View style={[styles.bottomContent, { bottom: sy(129) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.one.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.one.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.one.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#ebf6fd' },
  bottomContent: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: sx(16) },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { width: sx(270), fontSize: sx(16), fontFamily: 'NationalPark_500Medium', color: '#657586', textAlign: 'center', lineHeight: sy(24), letterSpacing: -0.16 },
});
