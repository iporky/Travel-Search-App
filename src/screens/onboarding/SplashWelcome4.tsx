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
import { PAY_CARD_BIRD_SVG, PAY_JUMP_SVG, PAY_ATM_SVG } from '../../assets/screen4Pay';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const LOGO = onboardingSource(require('../../../assets/onboarding/logo.png') as ImageSourcePropType, 'logo');

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
    // Bird jumps upward from the ATM area: quick fade, spring up with overshoot.
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.spring(jump, { toValue: 1, friction: 5, tension: 45, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(floatBird, { toValue: 1, duration: 1750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatBird, { toValue: 0, duration: 1750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    });
  }, [active]);

  const jumpY = jump.interpolate({ inputRange: [0, 1], outputRange: [sy(180), 0] });
  const jumpX = jump.interpolate({ inputRange: [0, 0.5, 1], outputRange: [sx(20), sx(-6), 0] });
  const floatY = floatBird.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

  return (
    <Pressable style={styles.root} onPress={onPress}>
      {/* Base gradient — absoluteFill covers the whole screen on any size. */}
      <LinearGradient
        colors={['#f5f7ff', '#eaf4fb', '#e3f4fb']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft radial glow behind the scene. */}
      <Svg style={{ position: 'absolute', left: (W - sx(470)) / 2, top: sy(362) - sy(215), width: sx(470), height: sy(430) }} pointerEvents="none">
        <Defs>
          <RadialGradient id="s4glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#s4glow)" />
      </Svg>

      {/* Blurred ATM queue backdrop (the "waiting" you skip). SVG bakes the
          0.6 opacity + blur; rect content sits at (3,3) inside a 189×128 box. */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: sx(42), top: sy(418), width: sx(189), height: sy(128), opacity: fadeAnim }}>
        <SvgXml xml={PAY_ATM_SVG} width={sx(189)} height={sy(128)} />
      </Animated.View>

      {/* Motion trail of the jump. */}
      <Animated.View pointerEvents="none" style={{ position: 'absolute', left: sx(53), top: sy(311), width: sx(185), height: sy(178), opacity: fadeAnim }}>
        <SvgXml xml={PAY_JUMP_SVG} width={sx(185)} height={sy(178)} />
      </Animated.View>

      {/* Hero bird holding a card — jumps up from the ATM area. */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', left: sx(105), top: sy(189), width: sx(246), height: sy(178),
          opacity: fadeAnim,
          transform: [{ translateX: jumpX }, { translateY: jumpY }, { translateY: floatY }],
        }}
      >
        <SvgXml xml={PAY_CARD_BIRD_SVG} width={sx(246)} height={sy(178)} />
      </Animated.View>

      {/* Logo */}
      <Image source={LOGO} style={{ position: 'absolute', left: sx(32), top: sy(70), width: sx(92), height: sy(15) }} resizeMode="contain" />

      {/* Bottom text */}
      <Animated.View style={[styles.contentContainer, { bottom: sy(129), opacity: fadeAnim, paddingHorizontal: sx(16) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.four.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.four.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.four.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#e3f4fb' },
  contentContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { fontFamily: 'NationalPark_500Medium', fontSize: sx(16), color: '#657586', letterSpacing: -0.16, lineHeight: sy(24), textAlign: 'center', width: sx(270) },
});
