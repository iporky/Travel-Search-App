import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type Mode = 'fade' | 'push' | 'pop' | 'dissolve';

type Props = {
  children: React.ReactNode;
  /** Re-runs the animation whenever this changes (screen identity). */
  transitionKey: string;
  /**
   * 'fade' for sibling tabs (rises slightly), 'push' for drilling forward
   * (enters from the right), 'pop' for going back (enters from the left),
   * 'dissolve' for opaque grounds: the new layer fades in over the old one,
   * which stays put until it is covered — no movement, no see-through dip.
   */
  mode?: Mode;
  /** Fires once the enter animation settles. */
  onTransitionEnd?: () => void;
  /** Length of the transition in ms. */
  duration?: number;
  /**
   * Keep the previous page mounted and dissolve/slide it away while the new
   * one eases in a beat later — a real cross-transition rather than swapping
   * the old page out on the first frame. Costs one extra mounted page for
   * `duration`, so it is opt-in.
   */
  crossfade?: boolean;
};

type Outgoing = { key: string; node: React.ReactNode; mode: Mode };

const DEFAULT_DURATION = 300;
/** The unhurried page-to-page hand-off used across the app (onboarding steps,
    root surfaces, bottom tabs). */
export const CROSSFADE_DURATION = 520;
// Cross-fade only: fraction of the timeline the incoming page waits before it
// starts to show. By then the outgoing page has visibly begun to dissolve, so
// the change reads as one page giving way to the next, not a cut.
const LEAD = 0.15;
// Cross-fade only: the outgoing page is fully gone at this fraction.
const OUT_END = 0.55;

const ENTER_EASING = Easing.out(Easing.cubic);
const EXIT_EASING = Easing.inOut(Easing.quad);

/**
 * One page of the transition. It owns its own progress values, created at 0
 * when the page mounts, so the very first frame it paints is already at the
 * start of its enter animation. (A single progress value shared across pages
 * cannot promise that: shared-value writes reach the UI runtime
 * asynchronously while the style seed for a mounting view reads it
 * synchronously, so the new page could paint one frame at the previous
 * transition's end state — fully visible — before fading in from zero. That
 * was the intermittent flicker on onboarding's Confirm.)
 */
function Page({
  mode,
  leaving,
  duration,
  crossfade,
  onEnterEnd,
  children,
}: {
  mode: Mode;
  leaving: boolean;
  duration: number;
  crossfade: boolean;
  onEnterEnd?: () => void;
  children: React.ReactNode;
}) {
  const enter = useSharedValue(0);
  const exit = useSharedValue(0);
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const endRef = useRef(onEnterEnd);
  endRef.current = onEnterEnd;

  // Enter once, on mount. A page that is already on its way out by the time
  // this finishes must not report a settled enter.
  useEffect(() => {
    const lead = crossfade ? LEAD * duration : 0;
    const fire = () => {
      if (!leavingRef.current) endRef.current?.();
    };
    enter.value = withDelay(
      lead,
      withTiming(1, { duration: duration - lead, easing: ENTER_EASING }, (finished) => {
        if (finished) runOnJS(fire)();
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leave: dissolve over the first part of the next page's timeline.
  useEffect(() => {
    if (leaving) exit.value = withTiming(1, { duration: duration * OUT_END, easing: EXIT_EASING });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);

  const slides = mode === 'push' || mode === 'pop';
  const inDistance = mode === 'dissolve' ? 0 : mode === 'fade' ? 10 : 36;
  const inFrom = mode === 'pop' ? -inDistance : inDistance;
  const outTo = mode === 'push' ? -28 : mode === 'pop' ? 28 : 0;
  const outStatic = mode === 'dissolve';

  const style = useAnimatedStyle(() => {
    if (leaving) {
      // 'dissolve' grounds simply stay until the new layer has covered them.
      if (outStatic) return { opacity: 1, transform: [{ translateY: 0 }] };
      const f = exit.value;
      return {
        opacity: 1 - f,
        transform: slides ? [{ translateX: outTo * f }, { scale: 1 - 0.02 * f }] : [{ translateY: -8 * f }],
      };
    }
    // Tabs rise slightly; pushed screens come in from the right, popped from
    // the left; a dissolve only fades. Eased out: settling, not stopping.
    const e = enter.value;
    const offset = inFrom * (1 - e);
    return {
      opacity: e,
      transform: slides ? [{ translateX: offset }, { scale: 0.985 + 0.015 * e }] : [{ translateY: offset }],
    };
  }, [leaving, outStatic, slides, outTo, inFrom]);

  // Going back, the old page slides away over the one underneath; otherwise
  // the new page arrives over the old one.
  const layer = leaving ? (mode === 'pop' ? styles.above : styles.below) : styles.current;

  return (
    <Animated.View
      pointerEvents={leaving ? 'none' : 'auto'}
      style={[leaving ? StyleSheet.absoluteFill : styles.flex, layer, style]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Cross-fades and slides its children whenever `transitionKey` changes, so
 * switching tabs or moving between screens never snaps.
 *
 * Driven by Reanimated: every page's progress and the style derived from it
 * live on the UI thread as worklets, so the transition keeps its frame rate
 * even while the incoming screen is still rendering on the JS thread.
 */
export function ScreenTransition({
  children,
  transitionKey,
  mode = 'fade',
  onTransitionEnd,
  duration = DEFAULT_DURATION,
  crossfade = false,
}: Props) {
  const endRef = useRef(onTransitionEnd);
  endRef.current = onTransitionEnd;

  // The page on its way out (cross-fade only). It is captured *during render*
  // so the very first frame of a change already shows both pages; doing it in
  // an effect would paint one frame with the old page gone and the new one
  // still invisible. Keyed pages let React keep the old page's instance alive
  // (no remount, no re-run of its mount effects) while it animates out.
  const lastNode = useRef<React.ReactNode>(children);
  const [tracked, setTracked] = useState<{ key: string; outgoing: Outgoing | null }>({
    key: transitionKey,
    outgoing: null,
  });
  if (tracked.key !== transitionKey) {
    setTracked({
      key: transitionKey,
      outgoing: crossfade ? { key: tracked.key, node: lastNode.current, mode } : null,
    });
  } else {
    lastNode.current = children;
  }
  const outgoing = tracked.key === transitionKey ? tracked.outgoing : null;

  const settle = () => {
    setTracked((t) => (t.outgoing ? { ...t, outgoing: null } : t));
    endRef.current?.();
  };

  return (
    <View style={styles.flex}>
      <Page key={transitionKey} mode={mode} leaving={false} duration={duration} crossfade={crossfade} onEnterEnd={settle}>
        {children}
      </Page>
      {outgoing ? (
        <Page key={outgoing.key} mode={outgoing.mode} leaving duration={duration} crossfade={crossfade}>
          {outgoing.node}
        </Page>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  current: { zIndex: 1 },
  above: { zIndex: 2 },
  below: { zIndex: 0 },
});
