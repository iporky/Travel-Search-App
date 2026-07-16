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

const LOGO   = onboardingSource(require('../../../assets/onboarding/logo.png') as ImageSourcePropType, 'logo');
const BIRD1  = onboardingSource(require('../../../assets/mascot/bird-buzz-1.png') as ImageSourcePropType, 'bird-buzz-1');
const BIRD2  = onboardingSource(require('../../../assets/mascot/bird-buzz-2.png') as ImageSourcePropType, 'bird-buzz-2');
const BIRD3  = onboardingSource(require('../../../assets/mascot/bird-buzz-3.png') as ImageSourcePropType, 'bird-buzz-3');
const BIRD4  = onboardingSource(require('../../../assets/mascot/bird-buzz-4.png') as ImageSourcePropType, 'bird-buzz-4');

interface Props {
  activeIndex?: number;
  onPress: () => void;
  active?: boolean;
}

export function SplashWelcome3({ onPress, active }: Props) {
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // group entrance values (bird + bubble pairs), fade in staggered 0.4s
  const g1 = useRef(new Animated.Value(0)).current;
  const g2 = useRef(new Animated.Value(0)).current;
  const g3 = useRef(new Animated.Value(0)).current;
  // independent float values — one per element so they drift at different rates
  const fb1 = useRef(new Animated.Value(0)).current; // bird 1
  const fb2 = useRef(new Animated.Value(0)).current; // bird 2
  const fb3 = useRef(new Animated.Value(0)).current; // bird 3
  const fb4 = useRef(new Animated.Value(0)).current; // bird 4
  const fbl1 = useRef(new Animated.Value(0)).current; // bubble 1
  const fbl2 = useRef(new Animated.Value(0)).current; // bubble 2
  const fbl3 = useRef(new Animated.Value(0)).current; // bubble 3

  useEffect(() => {
    if (!active) return;
    fadeAnim.setValue(0);
    [g1, g2, g3].forEach((g) => g.setValue(0));
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
    // Bird+Bubble pairs fade in together, 0.4s apart; bubbles slide up slightly.
    Animated.stagger(400, [g1, g2, g3].map((g) =>
      Animated.timing(g, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    )).start();
  }, [active]);

  // Float loops — always running, each at a different speed so they feel independent
  useEffect(() => {
    const mk = (v: Animated.Value, dur: number, initDelay = 0) =>
      Animated.loop(Animated.sequence([
        Animated.delay(initDelay),
        Animated.timing(v, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
    const anims = [
      mk(fb1,  2000,   0),
      mk(fb2,  2300, 400),
      mk(fb3,  1900, 200),
      mk(fb4,  2200, 700),
      mk(fbl1, 2400, 300),
      mk(fbl2, 2100, 600),
      mk(fbl3, 1950, 100),
    ];
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  const fy = (v: Animated.Value, amp = 7) => v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] });
  // bubble slides up slightly as it fades in
  const slide = (g: Animated.Value) => g.interpolate({ inputRange: [0, 1], outputRange: [sy(12), 0] });

  return (
    <Pressable style={styles.root} onPress={onPress}>
      <LinearGradient
        colors={['#d0e8ff', '#f3f6fe']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Speech bubbles (rendered before birds so birds appear on top) ── */}

      {/* Bubble 1 — "Is Hongdae packed right now?" top-left, rot -9.88° */}
      <Animated.View style={[styles.bubbleOuter, {
        left: sx(19), top: sy(170),
        width: sx(219), height: 54,
        opacity: g1,
        transform: [{ rotate: '-9.88deg' }, { translateY: slide(g1) }, { translateY: fy(fbl1, 6) }],
      }]}>
        <View style={[styles.bubble, styles.bubbleRightTab]}>
          <Text style={styles.bubbleText}>{t('splash.three.bubbles.hongdae')}</Text>
        </View>
      </Animated.View>

      {/* Bubble 2 — "Seongsu cafés are blowing up!" mid-right, rot 7.58° */}
      <Animated.View style={[styles.bubbleOuter, {
        left: sx(110), top: sy(290),
        width: sx(220), height: 54,
        opacity: g2,
        transform: [{ rotate: '7.58deg' }, { translateY: slide(g2) }, { translateY: fy(fbl2, 8) }],
      }]}>
        <View style={[styles.bubble, styles.bubbleLeftTab]}>
          <Text style={styles.bubbleText}>{t('splash.three.bubbles.seongsu')}</Text>
        </View>
      </Animated.View>

      {/* Bubble 3 — "Bring cash for street food" bottom-left, rot -8.88° */}
      <Animated.View style={[styles.bubbleOuter, {
        left: sx(48), top: sy(410),
        width: sx(190), height: 54,
        opacity: g3,
        transform: [{ rotate: '-8.88deg' }, { translateY: slide(g3) }, { translateY: fy(fbl3, 7) }],
      }]}>
        <View style={[styles.bubble, styles.bubbleRightTab]}>
          <Text style={styles.bubbleText}>{t('splash.three.bubbles.streetFood')}</Text>
        </View>
      </Animated.View>

      {/* ── Birds (rendered after bubbles → on top). No movement — fade in with their pair. ── */}

      {/* Bird 1 — top-center */}
      <Animated.Image
        source={BIRD1}
        resizeMode="contain"
        style={{ position: 'absolute', left: sx(147), top: sy(98), width: sx(98), height: sy(80), opacity: g1, transform: [{ translateY: fy(fb1, 7) }] }}
      />

      {/* Bird 2 — mid-right */}
      <Animated.Image
        source={BIRD2}
        resizeMode="contain"
        style={{ position: 'absolute', left: sx(277), top: sy(246), width: sx(101), height: sy(82), opacity: g2, transform: [{ translateY: fy(fb2, 9) }] }}
      />

      {/* Bird 3 — left side */}
      <Animated.Image
        source={BIRD3}
        resizeMode="contain"
        style={{ position: 'absolute', left: sx(2), top: sy(363), width: sx(105), height: sy(85), opacity: g3, transform: [{ translateY: fy(fb3, 6) }] }}
      />

      {/* Bird 4 — bottom-right, large */}
      <Animated.Image
        source={BIRD4}
        resizeMode="contain"
        style={{ position: 'absolute', left: sx(237), top: sy(446), width: sx(133), height: sy(105), opacity: g3, transform: [{ translateY: fy(fb4, 8) }] }}
      />

      {/* Logo */}
      <Image
        source={LOGO}
        style={{ position: 'absolute', left: sx(20), top: sy(66), width: sx(92), height: sy(15) }}
        resizeMode="contain"
      />

      {/* Bottom text & pagination */}
      <View style={[styles.bottomContent, { bottom: sy(136), paddingHorizontal: sx(16) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.three.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.three.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.three.subtitle')}</Text>
        </View>
        <View style={styles.pagination}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === 2 ? '#527dff' : '#c9e3ff' }]} />
          ))}
        </View>

      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: W, height: H, overflow: 'hidden', backgroundColor: '#f3f6fe' },
  bubbleOuter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  bubble: {
    width: '100%',
    backgroundColor: '#f2f9ff',
    paddingLeft : sx(16), paddingRight: sx(12), paddingVertical: sx(8),
    justifyContent: 'center',
    shadowColor: '#B2C5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  bubbleRightTab: { borderTopLeftRadius: 0, borderTopRightRadius: sx(12), borderBottomLeftRadius: sx(12), borderBottomRightRadius: sx(12) },
  bubbleLeftTab:  { borderTopLeftRadius: sx(12), borderTopRightRadius: 0,    borderBottomLeftRadius: sx(12), borderBottomRightRadius: sx(12) },
  bubbleText: { fontFamily: 'NationalPark_500Medium', fontSize: sx(14), color: '#332d41', letterSpacing: sx(-0.14), lineHeight: sy(20) },
  bottomContent: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: sy(21) },
  textBlock: { alignItems: 'center', gap: sy(12) },
  titleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: sx(-1.4), lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: sx(-1.4), lineHeight: sy(44) },
  subtitle: { width: sx(270), fontSize: sx(16), fontFamily: 'NationalPark_500Medium', color: '#657586', textAlign: 'center', lineHeight: sy(24), letterSpacing: sx(-0.16) },
  pagination: { flexDirection: 'row', gap: sx(8) },
  dot: { width: sx(8), height: sx(8), borderRadius: sx(4) },
});
