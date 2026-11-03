import React, { useEffect } from 'react';
import { Dimensions, GestureResponderEvent, StyleSheet, Text, View } from 'react-native';
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
import { PAY_CARD_BIRD_SVG, PAY_JUMP_SVG, PAY_ATM_SVG } from '../../assets/screen4Pay';
import { PressableScale } from '../../components/PressableScale';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

interface Props {
  activeIndex: number;
  onPress: (e: GestureResponderEvent) => void;
  active?: boolean;
}

const sine = Easing.inOut(Easing.sin);
// Worklet-safe distances (the sx/sy helpers are JS-thread functions).
const JUMP_X_FROM = sx(20);
const JUMP_X_OVERSHOOT = sx(-6);
const JUMP_Y_FROM = sy(180);

export function SplashWelcome4({ onPress, active }: Props) {
  const { t } = useTranslation();
  const fade = useSharedValue(0);
  const jump = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    fade.value = 0;
    jump.value = 0;
    float.value = 0;
    // Bird jumps upward from the ATM area: quick fade, spring up with
    // overshoot, then a slow float once it has landed.
    fade.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
    jump.value = withSpring(1, { damping: 9, stiffness: 60 });
    float.value = withDelay(
      700,
      withRepeat(withSequence(withTiming(1, { duration: 1750, easing: sine }), withTiming(0, { duration: 1750, easing: sine })), -1, false),
    );
  }, [active, fade, jump, float]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateX: interpolate(jump.value, [0, 0.5, 1], [JUMP_X_FROM, JUMP_X_OVERSHOOT, 0]) },
      { translateY: interpolate(jump.value, [0, 1], [JUMP_Y_FROM, 0]) },
      { translateY: interpolate(float.value, [0, 1], [0, -7]) },
    ],
  }));

  return (
    <PressableScale style={styles.root} onPress={onPress}>
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
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: sx(42), top: sy(418), width: sx(189), height: sy(128) }, fadeStyle]}>
        <SvgXml xml={PAY_ATM_SVG} width={sx(189)} height={sy(128)} />
      </Animated.View>

      {/* Motion trail of the jump. */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: sx(53), top: sy(311), width: sx(185), height: sy(178) }, fadeStyle]}>
        <SvgXml xml={PAY_JUMP_SVG} width={sx(185)} height={sy(178)} />
      </Animated.View>

      {/* Hero bird holding a card — jumps up from the ATM area. */}
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: sx(105), top: sy(189), width: sx(246), height: sy(178) }, heroStyle]}
      >
        <SvgXml xml={PAY_CARD_BIRD_SVG} width={sx(246)} height={sy(178)} />
      </Animated.View>

      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      {/* Bottom text */}
      <Animated.View style={[styles.contentContainer, { bottom: sy(129), paddingHorizontal: sx(16) }, fadeStyle]}>
        <View style={styles.textBlock}>
          {/* Long translations shrink uniformly to fit one line. */}
          <AutoFitTitle maxWidth={W - sx(40)}>
            <Text style={styles.titleBold}>{t('splash.four.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.four.titleMed')}</Text>
          </AutoFitTitle>
          <Text style={styles.subtitle}>{t('splash.four.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  contentContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { fontFamily: 'NationalPark_500Medium', fontSize: sx(16), color: '#657586', letterSpacing: -0.16, lineHeight: sy(24), textAlign: 'center', width: sx(270) },
});
