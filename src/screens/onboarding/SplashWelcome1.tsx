import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import LottieView from 'lottie-react-native';
import { AutoFitTitle } from '../../components/AutoFitTitle';

// Designer's Kiki in two parts, both 640x464 transparent-WebP on the same
// 26fps timeline, so they sit straight on the shared panorama with no
// background to blend away. She flies in, lands and waves; then she stands and
// blinks. The two are cut to butt together exactly: the blink loop's frame 0
// is byte-identical to the arrival's closing frame, so the switch is a
// straight cut on the same image — no cross-fade, nothing to smear. The blink
// loop also opens and closes on the same pose, so it wraps invisibly too.
const KIKI_ARRIVAL = require('../../../assets/lottie/welcome-bird-full.json');
const KIKI_BLINK = require('../../../assets/lottie/welcome-blink-loop.json');

// The arrival plays at the export's own tempo; the blink runs a touch quicker.
const ARRIVAL_SPEED = 1;
const BLINK_SPEED = 1.25;

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
  scrollX?: Animated.Value;
  pageWidth?: number;
}

export function SplashWelcome1({ onPress, active = true, scrollX, pageWidth }: Props) {
  const { t } = useTranslation();
  // The blink loop sits mounted underneath from the start, parked on its frame
  // 0 — which is the arrival's closing frame — so it is already drawn when the
  // switch happens and no frame can flash through.
  const blinkRef = useRef<LottieView>(null);
  const [blinking, setBlinking] = useState(false);
  // Bumped every time the slide comes back into view, so she flies in again
  // rather than resuming mid-blink.
  const [run, setRun] = useState(0);
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) {
      blinkRef.current?.reset(); // park the blink back on frame 0
      setBlinking(false);
      setRun((r) => r + 1);
    }
    wasActive.current = active;
  }, [active]);

  // One commit: the blink becomes visible and the arrival goes away together,
  // so no frame is ever drawn without one of them on screen.
  const handleArrivalEnd = () => {
    blinkRef.current?.play();
    setBlinking(true);
  };
  // Hero sits a little "deeper" than the text: it lags the drag by 15%.
  const depthX =
    scrollX && pageWidth
      ? scrollX.interpolate({ inputRange: [0, pageWidth], outputRange: [0, pageWidth * 0.15], extrapolate: 'clamp' })
      : 0;

  return (
    <Pressable onPress={onPress} style={styles.root}>
      {/* Kiki flies in, lands, waves, then stands and blinks — the only bird
          on this slide. The pager's scroll adds a touch of depth as it
          leaves. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.lottieWrap, { transform: [{ translateX: depthX }] }]}
      >
        <View style={[styles.stack, { opacity: blinking ? 1 : 0 }]}>
          <LottieView
            ref={blinkRef}
            source={KIKI_BLINK}
            autoPlay={false}
            loop
            speed={BLINK_SPEED}
            style={styles.lottie}
            resizeMode="contain"
          />
        </View>
        {!blinking ? (
          <View style={styles.stack}>
            <LottieView
              key={run}
              source={KIKI_ARRIVAL}
              autoPlay
              loop={false}
              speed={ARRIVAL_SPEED}
              onAnimationFinish={handleArrivalEnd}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Transparent — the pager paints one shared panoramic background.
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  // The design window is 250×250 at y≈261 (SignUp_Welcome 12320:52202). The
  // box takes the animation's own 640×464 aspect and is scaled so Kiki lands
  // at the same on-screen size as before; she sits at 55% of the canvas
  // height, which sets the top offset that holds the design's centre point.
  lottieWrap: {
    position: 'absolute',
    left: (W - sx(305)) / 2,
    top: sy(261) + sx(3),
    width: sx(305),
    height: sx(221),
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
