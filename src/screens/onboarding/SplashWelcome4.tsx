import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  GestureResponderEvent,
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
import LottieView from 'lottie-react-native';
import { AutoFitTitle } from '../../components/AutoFitTitle';
import { onboardingSource } from '../../assets/onboardingAssets';
import { PAY_JUMP_SVG, PAY_ATM_SVG } from '../../assets/screen4Pay';

// Designer's card Kiki in two parts, both 544x544 transparent-WebP at 20fps.
// She reaches for her card and holds it up, then stands and blinks. The two
// are cut to butt together: the blink's first five frames carry the same
// happy-eye images the reveal ends on, so the composite at its frame 0 is the
// reveal's closing frame and the switch is a straight cut — no cross-fade. The
// blink returns to that same state at the end, so it wraps invisibly too, and
// it costs almost nothing: one static base plus two small eye layers that
// scale, rather than a frame per tick.
const CARD_REVEAL = require('../../../assets/lottie/card-reveal.json');
const CARD_BLINK = require('../../../assets/lottie/card-blink.json');

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

export function SplashWelcome4({ onPress, active }: Props) {
  const { t } = useTranslation();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  // The blink sits mounted underneath from the start, parked on frame 0 — the
  // reveal's closing frame — so it is already drawn when the switch happens.
  const blinkRef = useRef<LottieView>(null);
  const [blinking, setBlinking] = useState(false);
  // Bumped when the slide comes back into view, so she reveals the card again
  // rather than resuming mid-blink.
  const [run, setRun] = useState(0);
  const wasActive = useRef(active);

  useEffect(() => {
    if (!active) return;
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
  }, [active]);

  useEffect(() => {
    if (active && !wasActive.current) {
      blinkRef.current?.reset(); // park the blink back on frame 0
      setBlinking(false);
      setRun((r) => r + 1);
    }
    wasActive.current = active;
  }, [active]);

  // One commit: the blink becomes visible and the reveal goes away together,
  // so no frame is ever drawn without one of them on screen.
  const handleRevealEnd = () => {
    blinkRef.current?.play();
    setBlinking(true);
  };

  return (
    <Pressable style={styles.root} onPress={onPress}>

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

      {/* Hero Kiki reaching for her card, then standing and blinking. The box
          takes the animation's square canvas and is placed so she lands on the
          same centre point as the still art she replaces. */}
      <Animated.View pointerEvents="none" style={[styles.heroBox, { opacity: fadeAnim }]}>
        <View style={[styles.stack, { opacity: blinking ? 1 : 0 }]}>
          <LottieView
            ref={blinkRef}
            source={CARD_BLINK}
            autoPlay={false}
            loop
            style={styles.hero}
            resizeMode="contain"
          />
        </View>
        {!blinking ? (
          <View style={styles.stack}>
            <LottieView
              key={run}
              source={CARD_REVEAL}
              autoPlay
              loop={false}
              onAnimationFinish={handleRevealEnd}
              style={styles.hero}
              resizeMode="contain"
            />
          </View>
        ) : null}
      </Animated.View>

      {/* Logo */}
      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      {/* Bottom text */}
      <Animated.View style={[styles.contentContainer, { bottom: sy(129), opacity: fadeAnim, paddingHorizontal: sx(16) }]}>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  // The whole 544-square canvas is rendered (resizeMode contain), so nothing
  // is ever cut off whichever frame is showing. Kiki plus her card occupy
  // x 63-525 / y 104-483 of that canvas, which puts her centre at 54.0%
  // across and 54.0% down — so the box is offset by that much rather than
  // simply centred, which lands her true centre on the screen's.
  heroBox: {
    position: 'absolute',
    left: W / 2 - sx(320) * 0.54,
    top: sy(278) + sx(8) - sx(320) * 0.54,
    width: sx(320),
    height: sx(320),
  },
  stack: { ...StyleSheet.absoluteFillObject },
  hero: { width: '100%', height: '100%' },
  contentContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { fontFamily: 'NationalPark_500Medium', fontSize: sx(16), color: '#657586', letterSpacing: -0.16, lineHeight: sy(24), textAlign: 'center', width: sx(270) },
});
