import React, { useState } from 'react';
import { View } from 'react-native';

/**
 * Scales its children down so they fit `maxWidth` on one line.
 *
 * Exists because Android's `adjustsFontSizeToFit` is unreliable with nested
 * styled <Text> spans (it clips instead of shrinking) — and the slide titles
 * mix two font weights. The row lays out at its intrinsic width (Text has
 * flexShrink 0, so it overflows the wrapper rather than wrapping), the
 * measured width drives a uniform transform scale, and long translations
 * shrink smoothly while short ones render untouched.
 */
export function AutoFitTitle({
  maxWidth,
  children,
}: {
  maxWidth: number;
  children: React.ReactNode;
}) {
  const [scale, setScale] = useState(1);
  return (
    <View style={{ width: maxWidth, alignItems: 'center' }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', transform: [{ scale }] }}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) {
            const next = Math.min(1, maxWidth / w);
            if (Math.abs(next - scale) > 0.01) setScale(next);
          }
        }}
      >
        {children}
      </View>
    </View>
  );
}
