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
  onPress: () => void;
  active?: boolean;
}

export function SplashWelcome3({ onPress, active }: Props) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // group entrances: bird+bubble pairs (g1-g3) then the main bird (g4)
  const g1 = useRef(new Animated.Value(0)).current;
  const g2 = useRef(new Animated.Value(0)).current;
  const g3 = useRef(new Animated.Value(0)).current;
  const g4 = useRef(new Animated.Value(0)).current;
  // independent float loops
  const fb1 = useRef(new Animated.Value(0)).current;
  const fb2 = useRef(new Animated.Value(0)).current;
  const fb3 = useRef(new Animated.Value(0)).current;
  const fb4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    fadeAnim.setValue(0);
    [g1, g2, g3, g4].forEach((g) => g.setValue(0));
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
    Animated.stagger(380, [g1, g2, g3, g4].map((g) =>
      Animated.timing(g, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    )).start();
  }, [active]);

  useEffect(() => {
    const mk = (v: Animated.Value, dur: number, delay = 0) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
    const anims = [mk(fb1, 2000, 0), mk(fb2, 2300, 400), mk(fb3, 1900, 200), mk(fb4, 2200, 600)];
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  const fy = (v: Animated.Value, amp = 7) => v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] });
  const slide = (g: Animated.Value) => g.interpolate({ inputRange: [0, 1], outputRange: [sy(12), 0] });

  return (
    <Pressable style={styles.root} onPress={onPress}>
      {/* Base gradient — absoluteFill covers the whole screen on any size. */}
      <LinearGradient
        colors={['#cfe6ff', '#e4f0ff', '#f3f6fe']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

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
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: sx(40), top: sy(182), width: sx(237), height: sy(342), opacity: fadeAnim }}>
        <SvgXml xml={BUZZ_LINE_SVG} width={sx(237)} height={sy(342)} />
      </Animated.View>

      {/* ── Speech bubbles (behind birds) ── */}
      {/* Bubble 1 — "Is Hongdae packed right now?" (top, rot -9.88).
          Sits just under the top bird so its corner touches it. */}
      <Animated.View style={[styles.bubbleOuter, {
        left: sx(16), top: sy(182),
        opacity: g1, transform: [{ rotate: '-9.88deg' }, { translateY: slide(g1) }, { translateY: fy(fb1, 6) }],
      }]}>
        <View style={[styles.bubble, styles.bubbleRightTab]}>
          <Text style={styles.bubbleText}>{t('splash.three.bubbles.hongdae')}</Text>
        </View>
      </Animated.View>

      {/* Bubble 2 — "Seongsu cafes are blowing up!" (mid, rot 7.58). Anchored by
          its right edge (where the bird perches) so it grows leftward / wraps to
          fit longer translations instead of truncating. */}
      <Animated.View style={[styles.bubbleOuter, {
        right: sx(42), top: sy(286), alignItems: 'flex-end',
        opacity: g2, transform: [{ rotate: '7.58deg' }, { translateY: slide(g2) }, { translateY: fy(fb2, 8) }],
      }]}>
        <View style={[styles.bubble, styles.bubbleLeftTab, { alignItems: 'flex-start' }]}>
          <Text style={[styles.bubbleText, { textAlign: 'left' }]}>{t('splash.three.bubbles.seongsu')}</Text>
        </View>
      </Animated.View>

      {/* Bubble 3 — "Bring cash for street food" (bottom, rot -8.88) */}
      <Animated.View style={[styles.bubbleOuter, {
        left: sx(45), top: sy(436),
        opacity: g3, transform: [{ rotate: '-8.88deg' }, { translateY: slide(g3) }, { translateY: fy(fb3, 7) }],
      }]}>
        <View style={[styles.bubble, styles.bubbleRightTab]}>
          <Text style={styles.bubbleText}>{t('splash.three.bubbles.streetFood')}</Text>
        </View>
      </Animated.View>

      {/* ── Birds (SVG, on top of bubbles) ── */}
      {/* Bird top */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: sx(145), top: sy(111), width: sx(85), height: sy(71), opacity: g1, transform: [{ translateY: fy(fb1, 7) }] }}>
        <SvgXml xml={BUZZ_BIRD_TOP_SVG} width={sx(85)} height={sy(71)} />
      </Animated.View>
      {/* Bird mid — perches on the bubble's top-right corner (touching it). */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: sx(272), top: sy(238), width: sx(90), height: sy(77), opacity: g2, transform: [{ translateY: fy(fb2, 9) }] }}>
        <SvgXml xml={BUZZ_BIRD_MID_SVG} width={sx(90)} height={sy(77)} />
      </Animated.View>
      {/* Bird bottom-left — sits on the bubble's top-left corner (touching it). */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: sx(20), top: sy(400), width: sx(87), height: sy(59), opacity: g3, transform: [{ translateY: fy(fb3, 6) }] }}>
        <SvgXml xml={BUZZ_BIRD_BOTTOM_SVG} width={sx(87)} height={sy(59)} />
      </Animated.View>
      {/* Main bird bottom-right */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: sx(214), top: sy(440), width: sx(152), height: sy(120), opacity: g4, transform: [{ translateY: fy(fb4, 8) }] }}>
        <SvgXml xml={BUZZ_MAIN_BIRD_SVG} width={sx(152)} height={sy(120)} />
      </Animated.View>

      {/* Logo */}
      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      {/* Bottom text */}
      <View style={[styles.bottomContent, { bottom: sy(129), paddingHorizontal: sx(16) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.three.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.three.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.three.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#f3f6fe' },
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
