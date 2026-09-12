import React, { useEffect } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop, SvgXml } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AutoFitTitle } from '../../components/AutoFitTitle';
import {
  BUZZ_BIRD_TOP_SVG,
  BUZZ_BIRD_MID_SVG,
  BUZZ_BIRD_BOTTOM_SVG,
  BUZZ_MAIN_BIRD_SVG,
  BUZZ_LINE_SVG,
  BUZZ_TOP_CLOUD_SVG,
  BUZZ_BOTTOM_CLOUD_SVG,
} from '../../assets/screen3Buzz';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

interface Props {
  activeIndex?: number;
  onPress: (e: GestureResponderEvent) => void;
  active?: boolean;
}

const sine = Easing.inOut(Easing.sin);
// Worklet-safe distance (the sx/sy helpers are JS-thread functions).
const SLIDE_FROM = sy(12);

/** A slow up-and-down float, looping for the life of the value. */
function startFloat(v: SharedValue<number>, dur: number, delay = 0) {
  v.value = withDelay(
    delay,
    withRepeat(withSequence(withTiming(1, { duration: dur / 2, easing: sine }), withTiming(0, { duration: dur / 2, easing: sine })), -1, false),
  );
}

/**
 * An element that fades/slides in with its group (`g`) and then floats on its
 * own loop (`fb`). Bubbles also carry a fixed tilt and a slightly larger
 * slide-in; birds just fade and float.
 */
function Rise({
  g,
  fb,
  amp,
  slideIn = false,
  rotate,
  style,
  children,
}: {
  g: SharedValue<number>;
  fb: SharedValue<number>;
  amp: number;
  slideIn?: boolean;
  rotate?: string;
  style: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const animated = useAnimatedStyle(() => {
    const transform: ({ rotate: string } | { translateY: number })[] = [];
    if (rotate) transform.push({ rotate });
    if (slideIn) transform.push({ translateY: interpolate(g.value, [0, 1], [SLIDE_FROM, 0]) });
    transform.push({ translateY: interpolate(fb.value, [0, 1], [0, -amp]) });
    return { opacity: g.value, transform };
  });
  return (
    <Animated.View pointerEvents="none" style={[style, animated]}>
      {children}
    </Animated.View>
  );
}

export function SplashWelcome3({ onPress, active }: Props) {
  const { t } = useTranslation();
  const fade = useSharedValue(0);
  // group entrances: bird+bubble pairs (g1-g3) then the main bird (g4)
  const g1 = useSharedValue(0);
  const g2 = useSharedValue(0);
  const g3 = useSharedValue(0);
  const g4 = useSharedValue(0);
  // independent float loops
  const fb1 = useSharedValue(0);
  const fb2 = useSharedValue(0);
  const fb3 = useSharedValue(0);
  const fb4 = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    fade.value = 0;
    fade.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    // The groups arrive one after another, 380 ms apart.
    [g1, g2, g3, g4].forEach((g, i) => {
      g.value = 0;
      g.value = withDelay(i * 380, withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }));
    });
  }, [active, fade, g1, g2, g3, g4]);

  useEffect(() => {
    startFloat(fb1, 2000, 0);
    startFloat(fb2, 2300, 400);
    startFloat(fb3, 1900, 200);
    startFloat(fb4, 2200, 600);
  }, [fb1, fb2, fb3, fb4]);

  const lineStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Pressable style={styles.root} onPress={onPress}>
      {/* Soft radial glow. */}
      <Svg style={{ position: 'absolute', left: (W - sx(470)) / 2, top: sy(360) - sy(215), width: sx(470), height: sy(430) }} pointerEvents="none">
        <Defs>
          <RadialGradient id="s3glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#s3glow)" />
      </Svg>

      {/* Subtle clouds (SVGs bake in blur + opacity + flip). */}
      <View pointerEvents="none" style={{ position: 'absolute', left: sx(221), top: sy(84), width: sx(180), height: sy(123) }}>
        <SvgXml xml={BUZZ_TOP_CLOUD_SVG} width={sx(180)} height={sy(123)} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: sx(-69), top: sy(248), width: sx(249), height: sy(163) }}>
        <SvgXml xml={BUZZ_BOTTOM_CLOUD_SVG} width={sx(249)} height={sy(163)} />
      </View>

      {/* Dashed connector line between the birds. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: sx(40), top: sy(182), width: sx(237), height: sy(342) }, lineStyle]}>
        <SvgXml xml={BUZZ_LINE_SVG} width={sx(237)} height={sy(342)} />
      </Animated.View>

      {/* ── Speech bubbles (behind birds) ── */}
      {/* Bubble 1 — "Is Hongdae packed right now?" (top, rot -9.88).
          Sits just under the top bird so its corner touches it. */}
      <Rise g={g1} fb={fb1} amp={6} slideIn rotate="-9.88deg" style={[styles.bubbleOuter, { left: sx(16), top: sy(182) }]}>
        <View style={[styles.bubble, styles.bubbleRightTab]}>
          <Text style={styles.bubbleText}>{t('splash.three.bubbles.hongdae')}</Text>
        </View>
      </Rise>

      {/* Bubble 2 — "Seongsu cafes are blowing up!" (mid, rot 7.58). Anchored by
          its right edge (where the bird perches) so it grows leftward / wraps to
          fit longer translations instead of truncating. */}
      <Rise g={g2} fb={fb2} amp={8} slideIn rotate="7.58deg" style={[styles.bubbleOuter, { right: sx(42), top: sy(286), alignItems: 'flex-end' }]}>
        <View style={[styles.bubble, styles.bubbleLeftTab, { alignItems: 'flex-start' }]}>
          <Text style={[styles.bubbleText, { textAlign: 'left' }]}>{t('splash.three.bubbles.seongsu')}</Text>
        </View>
      </Rise>

      {/* Bubble 3 — "Bring cash for street food" (bottom, rot -8.88) */}
      <Rise g={g3} fb={fb3} amp={7} slideIn rotate="-8.88deg" style={[styles.bubbleOuter, { left: sx(45), top: sy(436) }]}>
        <View style={[styles.bubble, styles.bubbleRightTab]}>
          <Text style={styles.bubbleText}>{t('splash.three.bubbles.streetFood')}</Text>
        </View>
      </Rise>

      {/* ── Birds (SVG, on top of bubbles) ── */}
      <Rise g={g1} fb={fb1} amp={7} style={{ position: 'absolute', left: sx(145), top: sy(111), width: sx(85), height: sy(71) }}>
        <SvgXml xml={BUZZ_BIRD_TOP_SVG} width={sx(85)} height={sy(71)} />
      </Rise>
      {/* Bird mid — perches on the bubble's top-right corner (touching it). */}
      <Rise g={g2} fb={fb2} amp={9} style={{ position: 'absolute', left: sx(272), top: sy(238), width: sx(90), height: sy(77) }}>
        <SvgXml xml={BUZZ_BIRD_MID_SVG} width={sx(90)} height={sy(77)} />
      </Rise>
      {/* Bird bottom-left — sits on the bubble's top-left corner (touching it). */}
      <Rise g={g3} fb={fb3} amp={6} style={{ position: 'absolute', left: sx(20), top: sy(400), width: sx(87), height: sy(59) }}>
        <SvgXml xml={BUZZ_BIRD_BOTTOM_SVG} width={sx(87)} height={sy(59)} />
      </Rise>
      {/* Main bird bottom-right */}
      <Rise g={g4} fb={fb4} amp={8} style={{ position: 'absolute', left: sx(214), top: sy(440), width: sx(152), height: sy(120) }}>
        <SvgXml xml={BUZZ_MAIN_BIRD_SVG} width={sx(152)} height={sy(120)} />
      </Rise>

      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      {/* Bottom text */}
      <View style={[styles.bottomContent, { bottom: sy(129), paddingHorizontal: sx(16) }]}>
        <View style={styles.textBlock}>
          {/* Long translations shrink uniformly to fit one line. */}
          <AutoFitTitle maxWidth={W - sx(40)}>
            <Text style={styles.titleBold}>{t('splash.three.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.three.titleMed')}</Text>
          </AutoFitTitle>
          <Text style={styles.subtitle}>{t('splash.three.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  bubbleOuter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bubble: {
    maxWidth: sx(245),
    backgroundColor: '#f2f9ff',
    paddingLeft: sx(16), paddingRight: sx(12), paddingVertical: sx(8),
    justifyContent: 'center',
    shadowColor: '#B2C5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  bubbleRightTab: { borderTopLeftRadius: 0, borderTopRightRadius: sx(12), borderBottomLeftRadius: sx(12), borderBottomRightRadius: sx(12) },
  bubbleLeftTab:  { borderTopLeftRadius: sx(12), borderTopRightRadius: 0,    borderBottomLeftRadius: sx(12), borderBottomRightRadius: sx(12) },
  bubbleText: { fontFamily: 'NationalPark_500Medium', fontSize: sx(14), color: '#332d41', letterSpacing: -0.14, lineHeight: sy(20) },
  bottomContent: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { width: sx(270), fontSize: sx(16), fontFamily: 'NationalPark_500Medium', color: '#657586', textAlign: 'center', lineHeight: sy(24), letterSpacing: -0.16 },
});
