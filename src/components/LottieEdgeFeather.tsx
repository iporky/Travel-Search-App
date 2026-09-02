import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  /** Screen background color the box must dissolve into (e.g. '#e9f4ff'). */
  color: string;
  /** Band sizes as fractions of the box (0–1). */
  top?: number;
  bottom?: number;
  side?: number;
};

/**
 * Edge-feather overlay for image-sequence Lotties whose frames carry a baked
 * radial vignette. Cropping such a frame leaves a hard seam at the box edge;
 * these four gradient strips fade from the screen color at the border to
 * transparent inward, so the crop boundary dissolves into the background.
 * Render inside the Lottie's overflow-hidden box, after the LottieView.
 */
export function LottieEdgeFeather({ color, top = 0.24, bottom = 0.24, side = 0.24 }: Props) {
  const clear = `${color}00`;
  return (
    <>
      {top > 0 && (
        <LinearGradient
          colors={[color, clear]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.strip, { top: 0, left: 0, right: 0, height: `${top * 100}%` }]}
          pointerEvents="none"
        />
      )}
      {bottom > 0 && (
        <LinearGradient
          colors={[clear, color]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.strip, { bottom: 0, left: 0, right: 0, height: `${bottom * 100}%` }]}
          pointerEvents="none"
        />
      )}
      {side > 0 && (
        <>
          <LinearGradient
            colors={[color, clear]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.strip, { top: 0, bottom: 0, left: 0, width: `${side * 100}%` }]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[clear, color]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.strip, { top: 0, bottom: 0, right: 0, width: `${side * 100}%` }]}
            pointerEvents="none"
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  strip: { position: 'absolute' },
});
