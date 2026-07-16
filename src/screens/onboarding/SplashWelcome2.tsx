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

const LOGO           = onboardingSource(require('../../../assets/onboarding/logo.png') as ImageSourcePropType, 'logo');
const BIRD           = onboardingSource(require('../../../assets/mascot/bird-screen2.png') as ImageSourcePropType, 'bird-screen2');
const ICON_PASSPORT  = onboardingSource(require('../../../assets/services/icon-passport.png') as ImageSourcePropType, 'icon-passport');
const ICON_FOOD      = onboardingSource(require('../../../assets/services/icon-food.png') as ImageSourcePropType, 'icon-food');
const ICON_BUS       = onboardingSource(require('../../../assets/services/icon-bus.png') as ImageSourcePropType, 'icon-bus');
const ICON_PLANE     = onboardingSource(require('../../../assets/services/icon-plane.png') as ImageSourcePropType, 'icon-plane');
const ICON_MAP       = onboardingSource(require('../../../assets/services/icon-map.png') as ImageSourcePropType, 'icon-map');
const ICON_EMERGENCY = onboardingSource(require('../../../assets/services/icon-emergency.png') as ImageSourcePropType, 'icon-emergency');

interface Props {
  activeIndex: number;
  onPress: () => void;
  active?: boolean;
}

export function SplashWelcome2({ activeIndex, onPress, active }: Props) {
  const { t } = useTranslation();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const birdScale = useRef(new Animated.Value(0.92)).current;
  const birdRise  = useRef(new Animated.Value(0)).current;
  const birdFloat = useRef(new Animated.Value(0)).current;
  const birdTilt  = useRef(new Animated.Value(0)).current;
  const f1 = useRef(new Animated.Value(0)).current;
  const f2 = useRef(new Animated.Value(0)).current;
  const f3 = useRef(new Animated.Value(0)).current;
  const f4 = useRef(new Animated.Value(0)).current;
  const f5 = useRef(new Animated.Value(0)).current;
  const f6 = useRef(new Animated.Value(0)).current;
  // icon bloom-from-center entrance (0 -> 1)
  const e1 = useRef(new Animated.Value(0)).current;
  const e2 = useRef(new Animated.Value(0)).current;
  const e3 = useRef(new Animated.Value(0)).current;
  const e4 = useRef(new Animated.Value(0)).current;
  const e5 = useRef(new Animated.Value(0)).current;
  const e6 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    fadeAnim.setValue(0); birdScale.setValue(0.9); birdRise.setValue(0);
    birdFloat.setValue(0); birdTilt.setValue(0);
    [e1, e2, e3, e4, e5, e6].forEach((e) => e.setValue(0));

    // Bird rises up from below, scale 90% -> 100%, settle at center
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(birdRise, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(birdScale, { toValue: 1.0, friction: 6, tension: 70, useNativeDriver: true }),
    ]).start();

    // Icons bloom outward from center, scale 0 -> 100%, fade in while moving, 0.15s stagger
    const bloom = [e1, e2, e3, e4, e5, e6].map((e, i) =>
      Animated.sequence([
        Animated.delay(400 + i * 150),
        Animated.timing(e, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    );
    Animated.parallel(bloom).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(birdFloat, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(birdFloat, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(birdTilt, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(birdTilt, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();

    const mk = (v: Animated.Value, dur: number, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
    mk(f1, 1800, 0).start(); mk(f2, 2200, 300).start(); mk(f3, 2000, 600).start();
    mk(f4, 1900, 150).start(); mk(f5, 2400, 450).start(); mk(f6, 2100, 750).start();
  }, [active]);

  const ty = (v: Animated.Value, amp = sy(10)) => v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] });

  // bloom origin (screen-scaled center)
  const ORIGIN_X = sx(187.5);
  const ORIGIN_Y = sy(300);

  const IconBubble = ({
    icon, left, top, size, rotate, opacity, float, entrance, imgW, imgH,
  }: {
    icon: ImageSourcePropType; left: number; top: number; size: number;
    rotate: string; opacity: number; float: Animated.Value; entrance: Animated.Value; imgW: number; imgH: number;
  }) => {
    const cx = left + size / 2;
    const cy = top + size / 2;
    const startX = ORIGIN_X - cx;
    const startY = ORIGIN_Y - cy;
    const tx = entrance.interpolate({ inputRange: [0, 1], outputRange: [startX, 0] });
    const tyE = entrance.interpolate({ inputRange: [0, 1], outputRange: [startY, 0] });
    const scaleE = entrance.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const opE = entrance.interpolate({ inputRange: [0, 1], outputRange: [0, opacity] });
    return (
      <Animated.View style={{
        position: 'absolute', left, top, width: size, height: size,
        opacity: opE, alignItems: 'center', justifyContent: 'center',
        transform: [{ translateX: tx }, { translateY: tyE }, { rotate }, { translateY: ty(float) }, { scale: scaleE }],
      }}>
        <View style={[styles.bubble, { width: size, height: size }]}>
          <Image source={icon} style={{ width: imgW, height: imgH }} resizeMode="contain" />
        </View>
      </Animated.View>
    );
  };

  const birdTranslateY = birdRise.interpolate({ inputRange: [0, 1], outputRange: [sy(80), 0] });
  const birdFloatY = birdFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -sy(12)] });
  const birdRotate = birdTilt.interpolate({ inputRange: [0, 1], outputRange: ['-1.6deg', '1.6deg'] });

  return (
    <Pressable style={styles.root} onPress={onPress}>
      <LinearGradient
        colors={['#e2defb', '#f3f2fd']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <IconBubble icon={ICON_PASSPORT}  left={sx(56)}  top={sy(122)} size={sx(51)}  rotate="-10.53deg" opacity={0.6} float={f1} entrance={e1} imgW={sx(44)} imgH={sy(51)} />
      <IconBubble icon={ICON_FOOD}      left={sx(248)} top={sy(125)} size={sx(62)}  rotate="24.46deg"  opacity={0.7} float={f2} entrance={e2} imgW={sx(62)} imgH={sy(58)} />
      <IconBubble icon={ICON_EMERGENCY} left={sx(42)}  top={sy(256)} size={sx(60)}  rotate="-16.56deg" opacity={0.7} float={f3} entrance={e3} imgW={sx(60)} imgH={sy(58)} />
      <IconBubble icon={ICON_BUS}       left={sx(55)}  top={sy(409)} size={sx(60)}  rotate="-11.31deg" opacity={0.7} float={f4} entrance={e4} imgW={sx(60)} imgH={sy(56)} />
      <IconBubble icon={ICON_PLANE}     left={sx(180)} top={sy(465)} size={sx(52)}  rotate="-11.31deg" opacity={0.7} float={f5} entrance={e5} imgW={sx(42)} imgH={sy(39)} />
      <IconBubble icon={ICON_MAP}       left={sx(246)} top={sy(374)} size={sx(74)}  rotate="26.3deg"   opacity={0.7} float={f6} entrance={e6} imgW={sx(75)} imgH={sy(69)} />

      <Animated.View pointerEvents="none" style={{
        position: 'absolute', left: sx(72), top: sy(187),
        width: sx(254), height: sy(233), opacity: fadeAnim,
        transform: [{ translateY: birdTranslateY }, { translateY: birdFloatY }, { rotate: birdRotate }, { scale: birdScale }],
      }}>
        <Image source={BIRD} style={{ width: sx(254), height: sy(233) }} resizeMode="cover" />
      </Animated.View>

      <Image source={LOGO} style={{ position: 'absolute', left: sx(20), top: sy(66), width: sx(92), height: sy(15) }} resizeMode="contain" />

      <Animated.View style={[styles.contentContainer, { bottom: sy(136), opacity: fadeAnim, paddingHorizontal: sx(16) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.two.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.two.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.two.subtitle')}</Text>
        </View>
        <View style={styles.pagination}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === 1 ? '#527dff' : '#c9e3ff' }]} />
          ))}
        </View>

      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: W, height: H, overflow: 'hidden', backgroundColor: '#f3f2fd' },
  bubble: { backgroundColor: 'rgba(255,255,255,0.58)', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  contentContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: sy(21) },
  textBlock: { alignItems: 'center', gap: sy(12) },
  titleRow: { flexDirection: 'row', alignItems: 'baseline' },
  titleBold: { fontFamily: 'NationalPark_600SemiBold', fontSize: sx(35), color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontFamily: 'NationalPark_500Medium',   fontSize: sx(35), color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { fontFamily: 'NationalPark_500Medium', fontSize: sx(16), color: '#657586', letterSpacing: -0.16, lineHeight: sy(24), textAlign: 'center', width: sx(270) },
  pagination: { flexDirection: 'row', gap: sx(8) },
  dot: { width: sx(8), height: sx(8), borderRadius: sx(4) },
});
