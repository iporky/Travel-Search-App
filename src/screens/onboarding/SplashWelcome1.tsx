import React from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';

const { width: W, height: H } = Dimensions.get('window');

const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

// The flying-Kiki animation is the designer-supplied Lottie (a JPEG image
// sequence with the frames inlined as data URIs, 720×720 @ 30 fps) — it
// replaces the old three-SVG-bird choreography and loops while the slide is
// showing. The JSON rides inside the JS bundle, so release-build asset
// resolution can't break it. The screen is a flat #ecf4fe (the frames' own
// background), with the old clouds/glow removed per the Aug design.

interface Props {
  /** index of the active onboarding page (drives pagination dots) */
  activeIndex: number;
  /** advance to the next page */
  onPress: () => void;
  /** run the intro sequence when this screen becomes visible */
  active?: boolean;
}

export function SplashWelcome1({ onPress, active = true }: Props) {
  const { t } = useTranslation();

  return (
    <Pressable onPress={onPress} style={styles.root}>
      {/* Flat background — exactly the Lottie frames' own baked color, so the
          animation square is invisible (no clouds/glow per the Aug design). */}

      {/* Flying Kiki — the designer's Lottie, centered where the hero bird
          sat. Plays only while this slide is active and loops. */}
      <View pointerEvents="none" style={styles.lottieWrap}>
        <LottieView
          source={require('../../../assets/lottie/welcome1-bird.json')}
          style={styles.lottie}
          autoPlay={active}
          loop
          resizeMode="contain"
        />
      </View>

      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      {/* Bottom text */}
      <View style={[styles.bottomContent, { bottom: sy(129) }]}>
        <View style={styles.textBlock}>
          <View style={styles.titleRow}>
            <Text style={styles.titleBold}>{t('splash.one.titleBold')} </Text>
            <Text style={styles.titleMed}>{t('splash.one.titleMed')}</Text>
          </View>
          <Text style={styles.subtitle}>{t('splash.one.subtitle')}</Text>
        </View>
        {/* Pagination dots are rendered once, stationary, in OnboardingScreen. */}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Flat #f4feff = the "Korea starts here" Lottie's own frame background
  // (sampled from its inlined frames — uniform, no vignette, so the 250×250
  // window dissolves into the screen with no visible edge).
  root: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#f4feff' },
  // Animation window — 250×250 at design y≈261, centered (SignUp_Welcome
  // 12320:52202); blends seamlessly into the matching screen background.
  lottieWrap: {
    position: 'absolute',
    left: (W - sx(250)) / 2,
    top: sy(261),
    width: sx(250),
    height: sx(250),
  },
  lottie: { width: '100%', height: '100%' },
  bottomContent: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: sx(16) },
  textBlock: { alignItems: 'center', gap: sy(20) },
  titleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline' },
  titleBold: { fontSize: sx(35), fontFamily: 'NationalPark_600SemiBold', color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  titleMed:  { fontSize: sx(35), fontFamily: 'NationalPark_500Medium',   color: '#1d192b', letterSpacing: -1.4, lineHeight: sy(44) },
  subtitle: { width: sx(270), fontSize: sx(16), fontFamily: 'NationalPark_500Medium', color: '#657586', textAlign: 'center', lineHeight: sy(24), letterSpacing: -0.16 },
});
