import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  GestureResponderEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Extrapolation, interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import LottieView from 'lottie-react-native';
import { AutoFitTitle } from '../../components/AutoFitTitle';
import { PressableScale } from '../../components/PressableScale';

// Designer's two-part Kiki: she runs in from the distance once, then waves
// forever. Both are 720x720 transparent-WebP frame sequences, so they sit
// straight on the shared panorama with no background to blend away. The
// exports are cut to run together — the walk-in's closing pose is the loop's
// closing frame, so starting the loop at frame 0 picks up exactly where the
// walk-in stopped.
const WALK_IN = require('../../../assets/lottie/welcome-walk-in.json');
const WAVE_LOOP = require('../../../assets/lottie/welcome-wave-loop.json');

// The run plays at the export's own tempo; the wave eases back once she has
// arrived.
const WALK_SPEED = 1;
const LOOP_SPEED = 0.7;

const { width: W, height: H } = Dimensions.get('window');

const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

interface Props {
  /** index of the active onboarding page (drives pagination dots) */
  activeIndex: number;
  /** tap handler (the pager decides forward/back from the tap position) */
  onPress: (e: GestureResponderEvent) => void;
  /** true while this slide is the visible page */
  active?: boolean;
  /** Pager scroll offset — gives the mascot a touch of parallax depth. */
  scrollX?: SharedValue<number>;
  pageWidth?: number;
}

export function SplashWelcome1({ onPress, active = true, scrollX, pageWidth }: Props) {
  const { t } = useTranslation();
  // The wave sits mounted underneath from the start, parked on frame 0 — the
  // frame after the walk-in's last — so it is already drawn when the switch
  // happens. The hand-over is a straight cut: cross-fading would blend two
  // different poses and smear it.
  const [introDone, setIntroDone] = useState(false);
  const loopRef = useRef<LottieView>(null);
  // Bumped every time the slide comes back into view, which remounts the
  // walk-in so she runs in again rather than resuming mid-wave.
  const [run, setRun] = useState(0);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      loopRef.current?.reset(); // park the wave back on frame 0
      setIntroDone(false);
      setRun((r) => r + 1);
    }
    wasActive.current = active;
  }, [active]);

  // One commit: the wave becomes visible and the walk-in goes away together,
  // so no frame is ever drawn without one of them on screen.
  const handleIntroEnd = () => {
    loopRef.current?.play();
    setIntroDone(true);
  };

  // Hero sits a little "deeper" than the text: it lags the drag by 15%. A
  // worklet on the pager's scroll offset, so it tracks the finger on the UI
  // thread.
  const depthStyle = useAnimatedStyle(() => {
    if (!scrollX || !pageWidth) return { transform: [{ translateX: 0 }] };
    return {
      transform: [
        { translateX: interpolate(scrollX.value, [0, pageWidth], [0, pageWidth * 0.15], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <PressableScale onPress={onPress} style={styles.root}>
      {/* Kiki runs in, then keeps waving — the only bird on this slide. The
          pager's scroll adds a touch of depth as it leaves. */}
      <Animated.View pointerEvents="none" style={[styles.lottieWrap, depthStyle]}>
        <View style={[styles.stack, { opacity: introDone ? 1 : 0 }]}>
          <LottieView
            ref={loopRef}
            source={WAVE_LOOP}
            autoPlay={false}
            loop
            speed={LOOP_SPEED}
            style={styles.lottie}
            resizeMode="contain"
          />
        </View>
        {!introDone ? (
          <View style={styles.stack}>
            <LottieView
              key={run}
              source={WALK_IN}
              autoPlay
              loop={false}
              speed={WALK_SPEED}
              onAnimationFinish={handleIntroEnd}
              style={styles.lottie}
              resizeMode="contain"
            />
          </View>
        ) : null}
      </Animated.View>

      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      {/* Bottom text */}
      <View style={[styles.bottomContent, { bottom: sy(129) }]}>
        <View style={styles.textBlock}>
          {/* Long translations shrink uniformly to fit one line. */}
          <AutoFitTitle maxWidth={W - sx(40)}>
            <Text style={styles.titleBold}>{t('splash.one.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.one.titleMed')}</Text>
          </AutoFitTitle>
          <Text style={styles.subtitle}>{t('splash.one.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Transparent — the pager paints one shared panoramic background.
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  // The design window is 250×250 at y≈261 (SignUp_Welcome 12320:52202); Kiki
  // fills only part of her 720×720 canvas, so the box is scaled up to render
  // her at the size the layout expects — measured on device against the hero
  // she replaces. Her centre sits at 53.8% of the canvas height, so the top
  // shifts up to keep the design's centre point.
  lottieWrap: {
    position: 'absolute',
    left: (W - sx(283)) / 2,
    top: sy(261) - sx(27),
    width: sx(283),
    height: sx(283),
  },
  stack: { ...StyleSheet.absoluteFillObject },
  lottie: { width: '100%', height: '100%' },
  bottomContent: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: sx(16) },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { width: sx(270), fontSize: sx(16), fontFamily: 'NationalPark_500Medium', color: '#657586', textAlign: 'center', lineHeight: sy(24), letterSpacing: -0.16 },
});
