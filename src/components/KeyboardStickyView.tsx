import React from 'react';
import { Platform, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * A flex:1 container that lifts its bottom-anchored content above the on-screen
 * keyboard — replacing KeyboardAvoidingView, which does nothing on this
 * edge-to-edge Android build (the window never resizes). When the keyboard is
 * down, it pads by the bottom safe-area inset so content clears the nav bar.
 *
 * Android reports the keyboard height ABOVE the navigation bar (the IME inset
 * minus the nav-bar inset) while this edge-to-edge window still extends under
 * that bar, so the lift has to add the inset back or the content sits one
 * nav-bar short, tucked behind the keyboard. iOS reports the full frame.
 */
export function KeyboardStickyView({ children, style }: Props) {
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  const lift = Platform.OS === 'android' ? keyboardHeight + insets.bottom : keyboardHeight;
  return (
    <View style={[{ flex: 1, paddingBottom: keyboardHeight > 0 ? lift : insets.bottom }, style]}>
      {children}
    </View>
  );
}
