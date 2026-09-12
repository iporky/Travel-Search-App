import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient as SvgRadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

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

let haloSeq = 0;

/**
 * Soft-edged halo UNDERLAY for image-sequence Lotties: a solid rect in the
 * frames' baked background colour whose edges fade out over `spread` px —
 * the in-app equivalent of the designer's blurred "Illustration" layer.
 * Render as the FIRST child of the (overflow-visible) Lottie box, sized to
 * it; the opaque frames then sit on their own colour with no hard border
 * anywhere, and the halo dissolves into whatever the screen paints behind.
 */
export function LottieHalo({
  color,
  width,
  height,
  spread,
}: {
  color: string;
  width: number;
  height: number;
  spread: number;
}) {
  const id = React.useMemo(() => `halo${haloSeq++}`, []);
  const W = width + spread * 2;
  const H = height + spread * 2;
  const corner = (cid: string, cx: number, cy: number) => (
    <SvgRadialGradient
      key={cid}
      id={cid}
      gradientUnits="userSpaceOnUse"
      cx={cx}
      cy={cy}
      r={spread}
    >
      <Stop offset="0" stopColor={color} stopOpacity={1} />
      <Stop offset="1" stopColor={color} stopOpacity={0} />
    </SvgRadialGradient>
  );
  return (
    <Svg
      width={W}
      height={H}
      style={{ position: 'absolute', left: -spread, top: -spread }}
      pointerEvents="none"
    >
      <Defs>
        <SvgLinearGradient id={`${id}T`} x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`${id}B`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`${id}L`} x1="1" y1="0" x2="0" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgLinearGradient>
        <SvgLinearGradient id={`${id}R`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgLinearGradient>
        {corner(`${id}TL`, spread, spread)}
        {corner(`${id}TR`, W - spread, spread)}
        {corner(`${id}BL`, spread, H - spread)}
        {corner(`${id}BR`, W - spread, H - spread)}
      </Defs>
      <Rect x={spread} y={spread} width={width} height={height} fill={color} />
      <Rect x={spread} y={0} width={width} height={spread} fill={`url(#${id}T)`} />
      <Rect x={spread} y={H - spread} width={width} height={spread} fill={`url(#${id}B)`} />
      <Rect x={0} y={spread} width={spread} height={height} fill={`url(#${id}L)`} />
      <Rect x={W - spread} y={spread} width={spread} height={height} fill={`url(#${id}R)`} />
      <Rect x={0} y={0} width={spread} height={spread} fill={`url(#${id}TL)`} />
      <Rect x={W - spread} y={0} width={spread} height={spread} fill={`url(#${id}TR)`} />
      <Rect x={0} y={H - spread} width={spread} height={spread} fill={`url(#${id}BL)`} />
      <Rect x={W - spread} y={H - spread} width={spread} height={spread} fill={`url(#${id}BR)`} />
    </Svg>
  );
}
