import React, { useEffect } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop, SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AutoFitTitle } from '../../components/AutoFitTitle';
import { onboardingSource } from '../../assets/onboardingAssets';
import { SCREEN2_BIRD_SVG } from '../../assets/screen2BirdSvg';
import { PressableScale } from '../../components/PressableScale';

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
  onPress: (e: GestureResponderEvent) => void;
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
const ORIGIN_X = sx(BIRD_CX);
const ORIGIN_Y = sy(BIRD_CY);

const sine = Easing.inOut(Easing.sin);
// Worklet-safe distances (the sx/sy helpers are JS-thread functions).
const BUBBLE_FLOAT_AMP = sy(10);
const BIRD_RISE_FROM = sy(80);
const BIRD_FLOAT_AMP = sy(12);

/**
 * One service-icon bubble: blooms out from the bird's centre when the slide
 * becomes active (scale 0→1, fade in, 150 ms stagger), then floats gently
 * for as long as it is mounted. All on the UI thread.
 */
function IconBubble({ it, i, active }: { it: (typeof ICONS)[number]; i: number; active: boolean }) {
  const entrance = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    const dur = 1000 + i * 100;
    float.value = withDelay(
      i * 150,
      withRepeat(withSequence(withTiming(1, { duration: dur, easing: sine }), withTiming(0, { duration: dur, easing: sine })), -1, false),
    );
  }, [float, i]);

  useEffect(() => {
    if (!active) return;
    entrance.value = 0;
    entrance.value = withDelay(400 + i * 150, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [active, entrance, i]);

  const left = sx(it.cx - it.size / 2);
  const top = sy(it.cy - it.size / 2);
  const size = sx(it.size);
  const cx = left + size / 2;
  const cy = top + size / 2;
  const rotate = it.rotate;
  const restOpacity = it.opacity;

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0, 1], [0, restOpacity]),
    transform: [
      { translateX: interpolate(entrance.value, [0, 1], [ORIGIN_X - cx, 0]) },
      { translateY: interpolate(entrance.value, [0, 1], [ORIGIN_Y - cy, 0]) },
      { rotate },
      { translateY: interpolate(float.value, [0, 1], [0, -BUBBLE_FLOAT_AMP]) },
      { scale: entrance.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left, top, width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image source={it.icon} style={{ width: sx(it.imgW), height: sy(it.imgH) }} resizeMode="contain" />
      </View>
    </Animated.View>
  );
}

export function SplashWelcome2({ onPress, active }: Props) {
  const { t } = useTranslation();
  const fade = useSharedValue(0);
  const birdScale = useSharedValue(0.92);
  const birdRise = useSharedValue(0);
  const birdFloat = useSharedValue(0);
  const birdTilt = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    fade.value = 0;
    birdScale.value = 0.9;
    birdRise.value = 0;
    birdFloat.value = 0;
    birdTilt.value = 0;

    // Bird rises up from below, scale 90% → 100%, settles at centre.
    fade.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    birdRise.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
    birdScale.value = withSpring(1, { damping: 11, stiffness: 90 });

    birdFloat.value = withRepeat(
      withSequence(withTiming(1, { duration: 1700, easing: sine }), withTiming(0, { duration: 1700, easing: sine })),
      -1,
      false,
    );
    birdTilt.value = withRepeat(
      withSequence(withTiming(1, { duration: 2200, easing: sine }), withTiming(0, { duration: 2200, easing: sine })),
      -1,
      false,
    );
  }, [active, fade, birdScale, birdRise, birdFloat, birdTilt]);

  const birdStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateY: interpolate(birdRise.value, [0, 1], [BIRD_RISE_FROM, 0]) },
      { translateY: interpolate(birdFloat.value, [0, 1], [0, -BIRD_FLOAT_AMP]) },
      { rotate: `${interpolate(birdTilt.value, [0, 1], [-1.6, 1.6])}deg` },
      { scale: birdScale.value },
    ],
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <PressableScale style={styles.root} onPress={onPress}>
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
      {ICONS.map((it, i) => (
        <IconBubble key={i} it={it} i={i} active={!!active} />
      ))}

      {/* Hero bird — rises from below and settles at centre. Rendered via SvgXml
          (react-native-svg) instead of <Image>: the embedded raster decodes
          through react-native-svg's own path, which renders reliably here. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute', left: sx(BIRD_CX - BIRD_W / 2), top: sy(BIRD_CY - BIRD_H / 2),
            width: sx(BIRD_W), height: sy(BIRD_H),
          },
          birdStyle,
        ]}
      >
        <SvgXml xml={SCREEN2_BIRD_SVG} width={sx(BIRD_W)} height={sy(BIRD_H)} />
      </Animated.View>

      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      <Animated.View style={[styles.contentContainer, { bottom: sy(129), paddingHorizontal: sx(16) }, fadeStyle]}>
        <View style={styles.textBlock}>
          {/* Long translations shrink uniformly to fit one line. */}
          <AutoFitTitle maxWidth={W - sx(40)}>
            <Text style={styles.titleBold}>{t('splash.two.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.two.titleMed')}</Text>
          </AutoFitTitle>
          <Text style={styles.subtitle}>{t('splash.two.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  bubble: { backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  contentContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  titleBold: { fontFamily: 'NationalPark_600SemiBold', fontSize: sx(35), color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontFamily: 'NationalPark_500Medium',   fontSize: sx(35), color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { fontFamily: 'NationalPark_500Medium', fontSize: sx(16), color: '#657586', letterSpacing: -0.16, lineHeight: sy(24), textAlign: 'center', width: sx(270) },
});
