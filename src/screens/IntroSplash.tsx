import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';

// First thing shown on app open (replaces the K-logo native splash, whose
// window background is now the same #def0fc so the handoff is seamless):
// the Kiki bird intro animation, then the welcome/onboarding flow.
//
// Source is the user-supplied dotLottie (assets/lottie/intro-bird.lottie),
// repackaged into assets/lottie/intro-bird.json: the animation JSON with its
// 64 webp frames inlined as base64 data URIs — bytes untouched, and the JSON
// rides inside the JS bundle, so no release-build asset resolution can break
// it. 64 frames @ 30 fps ≈ 2.13 s at 1080×1080, played once.
//
// Memory note: lottie-android caches each decoded frame for the composition's
// lifetime (~285 MB native heap at peak here). Fine on recent phones for a
// 2-second one-shot — the whole view unmounts right after, freeing it — but
// worth remembering if the animation ever grows.

const BG = '#def0fc'; // the animation frames' own background color
const DURATION_MS = Math.round((64 / 30) * 1000);

type Props = { onDone: () => void };

export function IntroSplash({ onDone }: Props) {
  const finished = useRef(false);
  const finish = () => {
    if (!finished.current) {
      finished.current = true;
      onDone();
    }
  };

  // onAnimationFinish is the real signal; the timer is a failsafe (slow
  // decode, dropped callback) so the user is never stuck on the splash.
  useEffect(() => {
    const t = setTimeout(finish, DURATION_MS + 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <LottieView
        source={require('../../assets/lottie/intro-bird.json')}
        style={styles.anim}
        autoPlay
        loop={false}
        resizeMode="contain"
        onAnimationFinish={(isCancelled) => {
          if (!isCancelled) finish();
        }}
        onAnimationFailure={finish}
      />
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  anim: { flex: 1, width: '100%' },
});
