import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Dimensions, Easing, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SvgXml } from 'react-native-svg';
import {
  SPLASH_C_SVG,
  SPLASH_E_SVG,
  SPLASH_GLOW_SVG,
  SPLASH_K_SVG,
  SPLASH_N2_SVG,
  SPLASH_N3_SVG,
  SPLASH_O_SVG,
  SPLASH_T_SVG,
} from '../assets/splashLogo';

// First thing shown on app open — the Konnect wordmark animation from the
// Figma motion Splash (12653:59734): over 2 s the K travels right across the
// word while each letter it reaches slides along and shrinks away, then the
// lone K pops (spring to 2× and back) as two soft glows settle in. All
// timing/easing/keyframe values below are verbatim from get_motion_context;
// the whole timeline hangs off one linear 0→1 driver so the cohort stays in
// sync. Pure vectors — no Lottie frame cache, a few KB total.

const BG = '#eaefff'; // Semantic/Accent/muted — the design frame's background
const DURATION_MS = 2000;

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const k = W / DESIGN_W; // design px → device dp

// Logo box (252.263 × 41.61 design px), centred on the 375-wide frame.
const LOGO_W = 252.263;
const LOGO_H = 41.61;

// The Figma spring easing, sampled (the CSS linear(...) list, 51 points over
// the segment). Values overshoot past 1 — that's the bounce.
const SPRING: number[] = [
  0, 0.0985, 0.342, 0.6483, 0.9442, 1.1767, 1.3179, 1.364, 1.3302, 1.2427, 1.1314,
  1.0233, 0.9377, 0.8853, 0.8675, 0.8791, 0.9105, 0.9509, 0.9904, 1.0219, 1.0414,
  1.0482, 1.0443, 1.033, 1.0183, 1.0039, 0.9923, 0.9851, 0.9825, 0.9838, 0.9878,
  0.9932, 0.9984, 1.0027, 1.0054, 1.0064, 1.0059, 1.0045, 1.0025, 1.0006, 0.9991,
  0.9981, 0.9977, 0.9978, 0.9983, 0.9991, 0.9998, 1.0003, 1.0007, 1.0008, 1.0008,
];

/** Interpolation stops for a spring segment t0→t1 animating from→to. */
function springStops(t0: number, t1: number, from: number, to: number) {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  SPRING.forEach((v, i) => {
    inputRange.push(t0 + (i / (SPRING.length - 1)) * (t1 - t0));
    outputRange.push(from + v * (to - from));
  });
  return { inputRange, outputRange };
}

type Stop = [number, number];

/** Letter timing/track data — verbatim from the motion context. */
const LETTERS: {
  xml: string;
  box: { left: number; top: number; w: number; h: number };
  fadeStart: number;
  fadeEnd: number;
  shrinkEnd: number;
  tx: Stop[];
}[] = [
  {
    xml: SPLASH_O_SVG,
    box: { left: 38.92, top: 7.61, w: 35.85, h: 34.0 },
    fadeStart: 0.25, fadeEnd: 0.365, shrinkEnd: 0.375,
    tx: [[0, 1.41], [0.05, 13.744], [0.10, 26.078], [0.15, 38.312], [0.20, 50.646], [0.25, 63.081], [0.375, 55.081]],
  },
  {
    xml: SPLASH_N2_SVG,
    box: { left: 78.45, top: 8.16, w: 33.8, h: 33.45 },
    fadeStart: 0.20, fadeEnd: 0.315, shrinkEnd: 0.325,
    tx: [[0, 1.14], [0.05, 12.874], [0.10, 24.608], [0.15, 36.142], [0.20, 47.876], [0.325, 29.876]],
  },
  {
    xml: SPLASH_N3_SVG,
    box: { left: 116.29, top: 8.16, w: 33.8, h: 33.45 },
    fadeStart: 0.15, fadeEnd: 0.265, shrinkEnd: 0.275,
    tx: [[0, 0.49], [0.05, 11.624], [0.10, 22.758], [0.15, 33.592], [0.275, 5.592]],
  },
  {
    xml: SPLASH_E_SVG,
    box: { left: 153.4, top: 7.61, w: 34.45, h: 34.0 },
    fadeStart: 0.10, fadeEnd: 0.215, shrinkEnd: 0.225,
    tx: [[0, 0.59], [0.05, 11.124], [0.10, 21.658], [0.225, -13.342]],
  },
  {
    xml: SPLASH_C_SVG,
    box: { left: 191.14, top: 7.61, w: 32.57, h: 34.0 },
    fadeStart: 0.05, fadeEnd: 0.165, shrinkEnd: 0.175,
    tx: [[0, 0.7], [0.05, 10.634], [0.175, -31.366]],
  },
  {
    xml: SPLASH_T_SVG,
    box: { left: 227.01, top: 0, w: 24.86, h: 41.61 },
    fadeStart: 0, fadeEnd: 0.115, shrinkEnd: 0.125,
    tx: [[0, 1.32], [0.125, -43.68]],
  },
];

// K frame: 55×60.355 at left −8, vertically centred −1.07; the glyph
// (37.678×41.347) sits centred inside it (+0.34, +1.5).
const K_FRAME = { left: -8, top: (LOGO_H - 60.355) / 2 - 1.07, w: 55, h: 60.355 };
const K_GLYPH = { left: (55 - 37.678) / 2 + 0.34, top: (60.355 - 41.347) / 2 + 1.5, w: 37.678, h: 41.347 };
const K_TX: Stop[] = [
  [0, 7.26], [0.05, 20.194], [0.10, 33.128], [0.15, 46.062], [0.20, 58.996],
  [0.25, 71.931], [0.30, 89.873], [0.35, 101.899], [0.40, 116.177], [0.45, 117.2],
];
const K_TY: Stop[] = [[0, 9.51], [0.20, 9.788], [0.45, 9.87]];

/** Track stops → interpolate config (values scaled by the device factor).
 *  Normalised to the first stop: Figma's exported translate values are
 *  absolute in the prototype's coordinate space and their 0% value equals the
 *  node's static canvas position — applying them unadjusted double-counts the
 *  base (the K rode ~10px low of the baseline). Subtracting the frame-0 value
 *  makes frame 0 exactly the static layout, per the motion-offset rule. */
function track(progress: Animated.Value, stops: Stop[], scaleBy = 1) {
  const base = stops[0][1];
  const inputRange = stops.map(([t]) => t);
  const outputRange = stops.map(([, v]) => (v - base) * scaleBy);
  if (inputRange[0] > 0) {
    inputRange.unshift(0);
    outputRange.unshift(outputRange[0]);
  }
  if (inputRange[inputRange.length - 1] < 1) {
    inputRange.push(1);
    outputRange.push(outputRange[outputRange.length - 1]);
  }
  return progress.interpolate({ inputRange, outputRange });
}

type Props = {
  onDone: () => void;
  /** The app behind the splash is mounted and ready to be revealed. The
      splash never lifts before this is true — no black gap between the
      intro animation and the first real screen. */
  canFinish?: boolean;
};

export function IntroSplash({ onDone, canFinish = true }: Props) {
  const finished = useRef(false);
  const [animDone, setAnimDone] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Fade out over the (already rendered) app underneath, then unmount.
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
      onDone(),
    );
  };

  useEffect(() => {
    if (animDone && canFinish) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animDone, canFinish]);

  // Drive the whole 2 s timeline off one linear value (the design's cohort);
  // played once, resting on the final lone-K frame. Reduced-motion users jump
  // straight to that resting state.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          progress.setValue(1);
          setAnimDone(true);
          return;
        }
        Animated.timing(progress, {
          toValue: 1,
          duration: DURATION_MS,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => setAnimDone(true));
      });
    // Failsafe so the user is never stuck on the splash.
    const t = setTimeout(() => setAnimDone(true), DURATION_MS + 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Glows (Ellipse 2101/2102): fade to 0.1 while settling ±60px → 0. ──────
  const glowSpring = springStops(0, 0.62649, -60 * k, 0);
  const glowTopY = progress.interpolate(glowSpring);
  const glowTopOpacity = progress.interpolate({ inputRange: [0, 0.62649, 1], outputRange: [0, 0.1, 0.1] });
  const glowBotY = progress.interpolate({ inputRange: [0, 0.62649, 1], outputRange: [60 * k, 0, 0] });
  const glowBotOpacity = progress.interpolate({ inputRange: [0, 0.001, 0.62649, 1], outputRange: [0.1, 0, 0.1, 0.1] });

  // ── K: travels right, then spring-pops 1→2→1. ─────────────────────────────
  const kX = track(progress, K_TX, k);
  const kY = track(progress, K_TY, k);
  const kPop = springStops(0.42245, 0.62649, 1, 2);
  // Down-ramp 2→1 follows the design's cubic-bezier(0.5, 0, 0.5, 1).
  const kScale = progress.interpolate({
    inputRange: [0, 0.42245, ...kPop.inputRange.slice(1), 0.6404, 0.6544, 0.6683, 0.68228, 1],
    outputRange: [1, 1, ...kPop.outputRange.slice(1), 1.896, 1.5, 1.104, 1, 1],
  });

  return (
    <Animated.View style={[styles.root, { opacity }]} pointerEvents="none">
      {/* Soft glows above and below (blurred white ellipses in the design). */}
      <Animated.View
        style={[styles.glow, { top: -181 * k, opacity: glowTopOpacity, transform: [{ translateY: glowTopY }] }]}
      >
        <SvgXml xml={SPLASH_GLOW_SVG} width={430 * k} height={363 * k} />
      </Animated.View>
      <Animated.View
        style={[styles.glow, { top: 570 * k, opacity: glowBotOpacity, transform: [{ translateY: glowBotY }] }]}
      >
        <SvgXml xml={SPLASH_GLOW_SVG} width={430 * k} height={363 * k} />
      </Animated.View>

      {/* Wordmark */}
      <Animated.View style={styles.logoBox}>
        {LETTERS.map((L, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: L.box.left * k,
              top: L.box.top * k,
              width: L.box.w * k,
              height: L.box.h * k,
              opacity: progress.interpolate({
                inputRange: [0, L.fadeStart, L.fadeEnd, 1],
                outputRange: [1, 1, 0, 0],
              }),
              transform: [
                { translateX: track(progress, L.tx, k) },
                {
                  scale: progress.interpolate({
                    inputRange: [0, L.fadeStart, L.shrinkEnd, 1],
                    outputRange: [1, 1, 0.001, 0.001],
                  }),
                },
              ],
            }}
          >
            <SvgXml xml={L.xml} width={L.box.w * k} height={L.box.h * k} />
          </Animated.View>
        ))}

        <Animated.View
          style={{
            position: 'absolute',
            left: K_FRAME.left * k,
            top: K_FRAME.top * k,
            width: K_FRAME.w * k,
            height: K_FRAME.h * k,
            transform: [{ translateX: kX }, { translateY: kY }, { scale: kScale }],
          }}
        >
          <SvgXml
            xml={SPLASH_K_SVG}
            width={K_GLYPH.w * k}
            height={K_GLYPH.h * k}
            style={{ position: 'absolute', left: K_GLYPH.left * k, top: K_GLYPH.top * k }}
          />
        </Animated.View>
      </Animated.View>

      <StatusBar style="dark" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Full-screen overlay above the (loading) app.
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', left: -13 * k, width: 430 * k, height: 363 * k },
  logoBox: { width: LOGO_W * k, height: LOGO_H * k },
});
