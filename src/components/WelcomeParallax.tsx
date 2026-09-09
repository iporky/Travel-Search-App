import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop, SvgXml } from 'react-native-svg';
import { SIGNIN_TOP_CLOUD_SVG, SIGNIN_BOTTOM_CLOUD_SVG } from '../assets/signInAssets';

// ─── One continuous world behind the five welcome pages ─────────────────────
// A "train-window" panorama: sky gradients cross-fade with the swipe, and a
// stack of layers — sun, far hills, clouds, mid hills and near ground — each
// scrolls at its own fraction of the finger, so the whole scene has depth and
// keeps moving smoothly across page boundaries. It is all vector, with no
// baked backgrounds, and every transform runs on the native driver straight
// off the pager's scroll offset.

const DESIGN_W = 375;
const DESIGN_H = 812;

// Per-page sky. The last stop is the sign-in design gradient.
const SKY: readonly (readonly [string, string])[] = [
  ['#d6e8fe', '#f0f7ff'],
  ['#d8e6ff', '#eef3ff'],
  ['#d3e9fe', '#f0f8ff'],
  ['#dfe8ff', '#f2f6ff'],
  ['#cae3fe', '#fcfeff'],
];

// Parallax rates (fraction of the page scroll each layer moves at).
const RATE = { sun: 0.06, farHills: 0.2, farClouds: 0.15, midHills: 0.4, nearClouds: 0.45, ground: 0.75 };

/** Smooth rolling-hill silhouette across `width`, closed along the bottom. */
function hillPath(width: number, height: number, baseline: number, amp: number, waves: number, phase: number) {
  const n = Math.max(8, Math.round(waves * 2));
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const y =
      baseline +
      amp * Math.sin(phase + u * waves * Math.PI * 2) +
      amp * 0.35 * Math.sin(phase * 1.7 + u * waves * Math.PI * 5.3);
    pts.push([u * width, y]);
  }
  let d = `M0 ${height} L0 ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;
  }
  return `${d} L${width} ${height} Z`;
}

type Props = {
  scrollX: Animated.Value;
  pageWidth: number;
  pageHeight: number;
  pages: number;
};

export function WelcomeParallax({ scrollX, pageWidth: W, pageHeight: H, pages }: Props) {
  const sx = (n: number) => (n * W) / DESIGN_W;
  const sy = (n: number) => (n * H) / DESIGN_H;
  const travel = (pages - 1) * W; // total scroll distance
  const layerW = (rate: number) => W + travel * rate + sx(60);
  const shift = (rate: number) => Animated.multiply(scrollX, -rate);

  const groundH = sy(190);
  const midH = sy(260);
  const farH = sy(330);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sky: cross-fading page gradients (always sum to a full cover). */}
      {SKY.map((g, i) => (
        <Animated.View
          key={i}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: scrollX.interpolate({
                inputRange: [(i - 1) * W, i * W, (i + 1) * W],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <LinearGradient colors={[g[0], g[1]]} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
        </Animated.View>
      ))}

      {/* Sun — a warm soft disc that barely moves. */}
      <Animated.View style={[styles.layer, { width: layerW(RATE.sun), transform: [{ translateX: shift(RATE.sun) }] }]}>
        <Svg width={sx(300)} height={sx(300)} style={{ position: 'absolute', left: sx(190), top: sy(40) }}>
          <Defs>
            <RadialGradient id="wpSun" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#fff6dc" stopOpacity={0.55} />
              <Stop offset="0.35" stopColor="#fff9e8" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#wpSun)" />
        </Svg>
      </Animated.View>

      {/* Far hills. */}
      <Animated.View style={[styles.layer, { width: layerW(RATE.farHills), transform: [{ translateX: shift(RATE.farHills) }] }]}>
        <Svg width={layerW(RATE.farHills)} height={farH} style={{ position: 'absolute', left: 0, top: H - farH }}>
          <Path d={hillPath(layerW(RATE.farHills), farH, farH * 0.42, farH * 0.16, 4.2, 0.6)} fill="#e6eefc" />
        </Svg>
      </Animated.View>

      {/* Far clouds. */}
      <Animated.View style={[styles.layer, { width: layerW(RATE.farClouds), transform: [{ translateX: shift(RATE.farClouds) }] }]}>
        {[
          { x: 40, y: 96, w: 96, o: 0.2 },
          { x: 300, y: 210, w: 120, o: 0.16 },
          { x: 520, y: 70, w: 88, o: 0.18 },
          { x: 720, y: 250, w: 130, o: 0.15 },
        ].map((c, i) => (
          <View key={i} style={{ position: 'absolute', left: sx(c.x), top: sy(c.y), opacity: c.o }}>
            <SvgXml xml={SIGNIN_TOP_CLOUD_SVG} width={sx(c.w)} height={sx(c.w * 0.85)} />
          </View>
        ))}
      </Animated.View>

      {/* Mid hills. */}
      <Animated.View style={[styles.layer, { width: layerW(RATE.midHills), transform: [{ translateX: shift(RATE.midHills) }] }]}>
        <Svg width={layerW(RATE.midHills)} height={midH} style={{ position: 'absolute', left: 0, top: H - midH }}>
          <Path d={hillPath(layerW(RATE.midHills), midH, midH * 0.5, midH * 0.2, 5.5, 2.1)} fill="#dae6fb" />
        </Svg>
      </Animated.View>
      {/* Near clouds. */}
      <Animated.View style={[styles.layer, { width: layerW(RATE.nearClouds), transform: [{ translateX: shift(RATE.nearClouds) }] }]}>
        {[
          { x: 90, y: 140, w: 150, o: 0.4, top: true },
          { x: 420, y: 300, w: 210, o: 0.24, top: false },
          { x: 760, y: 90, w: 140, o: 0.38, top: true },
          { x: 1080, y: 250, w: 190, o: 0.26, top: false },
          { x: 1420, y: 130, w: 150, o: 0.4, top: true },
          { x: 1750, y: 320, w: 220, o: 0.22, top: false },
        ].map((c, i) => (
          <View key={i} style={{ position: 'absolute', left: sx(c.x), top: sy(c.y), opacity: c.o }}>
            <SvgXml xml={c.top ? SIGNIN_TOP_CLOUD_SVG : SIGNIN_BOTTOM_CLOUD_SVG} width={sx(c.w)} height={sx(c.w * (c.top ? 0.85 : 0.67))} />
          </View>
        ))}
      </Animated.View>

      {/* Near ground — low, soft, under the text. */}
      <Animated.View style={[styles.layer, { width: layerW(RATE.ground), transform: [{ translateX: shift(RATE.ground) }] }]}>
        <Svg width={layerW(RATE.ground)} height={groundH} style={{ position: 'absolute', left: 0, top: H - groundH }}>
          <Path d={hillPath(layerW(RATE.ground), groundH, groundH * 0.55, groundH * 0.18, 6.5, 4.0)} fill="#cddff9" />
        </Svg>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, bottom: 0 },
});
