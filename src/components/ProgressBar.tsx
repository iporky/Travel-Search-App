import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

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

export default function ProgressBar({ progress = 1, dashStartProgress, width }: ProgressBarProps) {
  const safeProgress = Math.max(0, Math.min(1, progress));
  const safeDashStart = Math.max(0, Math.min(1, dashStartProgress ?? safeProgress));
  // Fall back to 100 before the track has been measured (first frame only).
  const vbW = width && width > 0 ? width : 100;
  const ids = useRef({
    gradient: `progress-gradient-${Math.random().toString(36).slice(2, 9)}`,
    stripes: `progress-stripes-${Math.random().toString(36).slice(2, 9)}`,
  }).current;

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${vbW} 8`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={ids.gradient} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#0165FF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0165FF" stopOpacity="0" />
          </LinearGradient>

          {/* Barber-pole stripes — wider spacing to match the Figma design
              (node 9435-20464): ~15px period at the same 32° forward lean,
              instead of the old tightly-packed 6px stripes. */}
          <Pattern
            id={ids.stripes}
            width={15}
            height={15}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(32)"
          >
            <Rect x="0" y="0" width="7.5" height="15" fill="rgba(255,255,255,0.5)" />
          </Pattern>
        </Defs>

        <Rect
          x="0"
          y="0"
          width={`${safeProgress * 100}%`}
          height="8"
          fill={`url(#${ids.gradient})`}
          rx="4" ry="4"
        />
        <Rect
          x="0"
          y="0"
          width={`${safeProgress * 100}%`}
          height="8"
          fill={`url(#${ids.stripes})`}
          opacity={0.5}
          rx="4" ry="4"
        />

        {/* Remaining trail — crisp, evenly spaced line dashes (1:1 with px now,
            so no horizontal stretch turning them into ovals). */}
        <Path
          d={`M ${safeDashStart * vbW} 4 H ${vbW}`}
          stroke="#a7c8f1"
          strokeWidth="2"
          strokeLinecap="butt"
          strokeDasharray="4 3"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
