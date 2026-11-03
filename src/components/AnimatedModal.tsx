import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// Every overlay in the app (bottom sheets, dialogs, toasts, full-page
// flows) goes through this one wrapper instead of React Native's built-in
// `Modal` animationType, whose slide/fade run on the platform's own timing
// and cannot be tuned or interrupted. Here the Modal is always mounted with
// `animationType="none"`, and Reanimated drives, on the UI thread:
//   • the scrim's opacity, and
//   • the panel — a sheet rises from below its own height, a dialog scales
//     up from 0.94 while fading in, a toast/viewer just fades, a page slides
//     up from the bottom edge with no scrim.
// The entrance only starts once the panel has laid out (its first onLayout):
// Android is still creating the Modal window and mounting the content in
// the frames right after `visible` flips, and an animation started then
// drops its first frames and reads as a sudden, jittery pop. Closing plays
// the reverse before the Modal unmounts, so nothing snaps. The layout
// container always fills the window (a definite height, so a sheet's own
// `maxHeight` resolves) and lets scrim taps through the empty area around
// the panel. Heavy pages can wait for `onEntered` before mounting their
// content so the slide itself stays at 60 fps.
// While the exit plays the panel keeps showing the children from its last
// visible render: callers usually clear the state that fed the content the
// moment they close (`setPolicy(null)`, `setError(null)`), and without this
// the card would collapse to an empty shell mid-fade. The closing panel also
// stops taking touches, so a tap on it can't re-trigger an action.

export type AnimatedModalVariant = 'sheet' | 'dialog' | 'fade' | 'page';

type Props = {
  visible: boolean;
  /** Hardware back and scrim taps (when `dismissOnScrim`). */
  onRequestClose: () => void;
  variant: AnimatedModalVariant;
  children: React.ReactNode;
  /** Tap on the scrim closes (default true; pages have no scrim). */
  dismissOnScrim?: boolean;
  scrimColor?: string;
  statusBarTranslucent?: boolean;
  /** Extra style for the animated panel wrapper. */
  panelStyle?: StyleProp<ViewStyle>;
  /** Called once the entrance animation has finished. */
  onEntered?: () => void;
  /** Called once the exit animation has finished and the Modal is gone. */
  onDismissed?: () => void;
};

// Unhurried, one family: pages take longest (they move the farthest), sheets
// next, dialogs and fades are quick. Exits are ~30% shorter than entrances.
const TIMING: Record<AnimatedModalVariant, { open: number; close: number }> = {
  page: { open: 440, close: 300 },
  sheet: { open: 340, close: 240 },
  dialog: { open: 240, close: 180 },
  fade: { open: 200, close: 160 },
};
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.quad);
const WINDOW_H = Dimensions.get('window').height;

export function AnimatedModal({
  visible,
  onRequestClose,
  variant,
  children,
  dismissOnScrim = true,
  scrimColor = 'rgba(29,25,43,0.4)',
  statusBarTranslucent,
  panelStyle,
  onEntered,
  onDismissed,
}: Props) {
  // Stays mounted through the exit animation.
  const [mounted, setMounted] = useState(visible);
  // 0 = hidden, 1 = shown.
  const progress = useSharedValue(0);
  // A sheet slides by its own height (measured), a page by the window's.
  const slide = useSharedValue(variant === 'page' ? WINDOW_H : Math.round(WINDOW_H * 0.6));
  // The entrance is armed by `visible` and fired by the panel's first layout.
  const armed = useRef(false);
  const laidOut = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  // Content shown during the exit — the last thing rendered while visible.
  const lastChildren = useRef(children);
  if (visible) lastChildren.current = children;

  const finishClose = () => {
    laidOut.current = false;
    setMounted(false);
    onDismissed?.();
  };
  const finishOpen = () => {
    if (visibleRef.current) onEntered?.();
  };

  const enter = () => {
    armed.current = false;
    progress.value = withTiming(1, { duration: TIMING[variant].open, easing: EASE_OUT }, (finished) => {
      if (finished) runOnJS(finishOpen)();
    });
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (laidOut.current) enter();
      else armed.current = true;
    } else if (mounted) {
      armed.current = false;
      progress.value = withTiming(0, { duration: TIMING[variant].close, easing: EASE_IN }, (finished) => {
        if (finished) runOnJS(finishClose)();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * slide.value }],
  }));
  const dialogStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.94 + 0.06 * progress.value }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!mounted) return null;

  const panelAnim = variant === 'dialog' ? dialogStyle : variant === 'fade' ? fadeStyle : slideStyle;
  const panelBase =
    variant === 'sheet'
      ? styles.sheetPanel
      : variant === 'dialog'
        ? styles.dialogPanel
        : styles.fillPanel;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent={statusBarTranslucent}
      onRequestClose={onRequestClose}
    >
      {variant !== 'page' ? (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: scrimColor }, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismissOnScrim ? onRequestClose : undefined}
            accessibilityRole={dismissOnScrim ? 'button' : undefined}
            accessibilityLabel={dismissOnScrim ? 'Close' : undefined}
          />
        </Animated.View>
      ) : null}
      <Animated.View
        pointerEvents={visible ? 'box-none' : 'none'}
        style={variant === 'dialog' ? styles.centerLayout : styles.endLayout}
      >
        <Animated.View
          pointerEvents="box-none"
          style={[panelBase, panelStyle, panelAnim]}
          onLayout={(e) => {
            if (variant === 'sheet') slide.value = Math.max(1, e.nativeEvent.layout.height);
            if (!laidOut.current) {
              laidOut.current = true;
              // One frame later the window and its first paint are in place.
              if (armed.current) requestAnimationFrame(enter);
            }
          }}
        >
          {visible ? children : lastChildren.current}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  endLayout: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  centerLayout: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  sheetPanel: { width: '100%', maxHeight: '100%' },
  dialogPanel: { alignItems: 'center', justifyContent: 'center', maxWidth: '100%', maxHeight: '100%' },
  fillPanel: { flex: 1, width: '100%' },
});
