import React, { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

interface ProgressBarProps {
  progress?: number;
  dashStartProgress?: number;
}

export default function ProgressBar({ progress = 1, dashStartProgress }: ProgressBarProps) {
  const safeProgress = Math.max(0, Math.min(1, progress));
  const safeDashStart = Math.max(0, Math.min(1, dashStartProgress ?? safeProgress));
  const ids = useRef({
    gradient: `progress-gradient-${Math.random().toString(36).slice(2, 9)}`,
    stripes: `progress-stripes-${Math.random().toString(36).slice(2, 9)}`,
  }).current;

  return (
    <View style={styles.container}>
      <Svg width="100%" height="100%" viewBox="0 0 100 8" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={ids.gradient} x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#0165FF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#0165FF" stopOpacity="0" />
          </LinearGradient>

          <Pattern
            id={ids.stripes}
            width={6}
            height={6}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(32)"
          >
            <Rect x="0" y="0" width="3" height="6" fill="rgba(255,255,255,0.52)" />
          </Pattern>
        </Defs>

        <Rect x="0" y="0" width="0" height="8" fill="#d9e0e9" rx="2" ry="2" />

        <Rect
          x="0"
          y="0"
          width={`${safeProgress * 100}%`}
          height="8"
          fill={`url(#${ids.gradient})`}
          rx="2" ry="2"
        />
        <Rect
          x="0"
          y="0"
          width={`${safeProgress * 100}%`}
          height="8"
          fill={`url(#${ids.stripes})`}
          opacity={0.5}
        />

        <Path
          d={`M ${safeDashStart * 100} 4 H 100`}
          stroke="#a7c8f1"
          strokeWidth="2"
          strokeLinecap="butt"
          strokeDasharray="3 2"
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
