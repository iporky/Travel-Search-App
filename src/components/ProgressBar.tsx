import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

interface ProgressBarProps {
  progress?: number;
  dashStartProgress?: number;
  /**
   * Actual rendered track width in px. Used as the SVG viewBox width so the
   * coordinate system is 1:1 with pixels — otherwise a fixed 100-unit viewBox
   * stretched to a ~280px track distorts the dashes into wide ovals.
   */
  width?: number;
}

// Fill (Figma Progress/Fill 9154:13229): base #527dff fading toward the plane
// + forward-leaning "/" stripes + a white sheen on the tail. Previously the
// flattened PNG export was STRETCHED to the progress width, which compressed
// the stripe spacing on early pages — now the stripes are drawn as fixed-width
// parallelograms in track coordinates, so their spacing is identical on every
// page regardless of progress, while the color fade still spans the visible
// fill (ending at the plane). Colors are computed from the same math that
// generated the approved PNG (base alpha max(0.24, 0.85·(1−t)^1.15) of
// #527dff over #f2f9ff, sheen ≤0.2 from 41%→94%).
const FILL_STOPS = ['#6a90ff', '#91adff', '#b8ccff', '#d2e0ff', '#d6e2ff'] as const;
const FILL_LOCATIONS = [0, 0.25, 0.5, 0.75, 1] as const;

const BAR_H = 8;
// PNG geometry (772×32: period 96, duty 50%, 45° in source space) mapped to
// track coordinates so the on-device look is unchanged at full width.
const PERIOD_FRACTION = 96 / 772;
const SLANT_FRACTION = 32 / 772;

// Figma: "Onboarding Progress Step Indicator" (node 9154-13254).
// Trail ahead of the plane: 2px dashes, round caps, dasharray 3 5, stroked
// #EAEFFF @ 20% → solid #C9E3FF from 30% onward. The two-stop stroke gradient
// is the same construction as before this redesign and renders fine on-device.
export default function ProgressBar({ progress = 1, dashStartProgress, width }: ProgressBarProps) {
  const safeProgress = Math.max(0, Math.min(1, progress));
  const safeDashStart = Math.max(0, Math.min(1, dashStartProgress ?? safeProgress));
  // Fall back to 100 before the track has been measured (first frame only).
  const vbW = width && width > 0 ? width : 100;
  const dashX = safeDashStart * vbW;
  const ids = useRef({
    track: `progress-track-${Math.random().toString(36).slice(2, 9)}`,
  }).current;

  // Stripes in TRACK coordinates (fixed, independent of progress). Each is a
  // "/" parallelogram: top edge shifted right by the slant. Per-stripe white
  // opacity fades toward the plane like the original artwork (0.24 → ~0.11).
  const period = vbW * PERIOD_FRACTION;
  const stripeW = period / 2;
  const slant = vbW * SLANT_FRACTION;
  const stripes: { d: string; opacity: number }[] = [];
  for (let x = -slant; x < vbW; x += period) {
    const mid = Math.max(0, Math.min(1, (x + stripeW / 2) / vbW));
    stripes.push({
      d: `M ${x + slant} 0 H ${x + slant + stripeW} L ${x + stripeW} ${BAR_H} H ${x} Z`,
      opacity: 0.24 * (1 - mid * 0.55),
    });
  }

  return (
    <View style={styles.container}>
      {/* Dashed trail ahead of the plane. Round caps widen each 3px dash by
          1px per side, giving the design's pill-shaped dots. */}
      <Svg width="100%" height="100%" viewBox={`0 0 ${vbW} ${BAR_H}`} preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient
            id={ids.track}
            gradientUnits="userSpaceOnUse"
            x1={dashX}
            y1="4"
            x2={vbW}
            y2="4"
          >
            <Stop offset="0" stopColor="#EAEFFF" stopOpacity="0.2" />
            <Stop offset="0.3" stopColor="#C9E3FF" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={`M ${dashX} 4 H ${vbW}`}
          stroke={`url(#${ids.track})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="3 5"
          fill="none"
        />
      </Svg>

      {/* Fill, clipped to the current progress. The gradient spans the visible
          fill (fade ends at the plane); the stripes are fixed to the track. */}
      <View style={[styles.fill, { width: `${safeProgress * 100}%` }]}>
        <LinearGradient
          colors={[...FILL_STOPS]}
          locations={[...FILL_LOCATIONS]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Solid white paths — no gradients, so no Fabric black-fill issue. */}
        <Svg width={vbW} height={BAR_H} viewBox={`0 0 ${vbW} ${BAR_H}`} style={StyleSheet.absoluteFill}>
          {stripes.map((s, i) => (
            <Path key={i} d={s.d} fill="#ffffff" fillOpacity={s.opacity} />
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: BAR_H,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
