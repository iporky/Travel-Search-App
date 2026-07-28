import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
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
 */
export function KeyboardStickyView({ children, style }: Props) {
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, paddingBottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom }, style]}>
      {children}
    </View>
  );
}
