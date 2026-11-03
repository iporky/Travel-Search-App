import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Dimensions,
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop, SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../context/AuthContext';
import { onboardingSource } from '../../assets/onboardingAssets';
import { SIGNIN_BIRD_SVG, SIGNIN_TOP_CLOUD_SVG, SIGNIN_BOTTOM_CLOUD_SVG } from '../../assets/signInAssets';
import { LOGIN_FACEBOOK_ICON_SVG, LOGIN_GOOGLE_ICON_SVG } from '../../assets/loginButtonAssets';
import { AutoFitTitle } from '../../components/AutoFitTitle';
import { AnimatedModal } from '../../components/AnimatedModal';
import { PressableScale } from '../../components/PressableScale';

// Designer's looping login Kiki — a 720x533 transparent-WebP frame sequence
// whose canvas aspect matches the design's 301x223 hero slot exactly, so it
// drops straight into that box.
const SIGNIN_LOOP = require('../../../assets/lottie/signin-loop.json');
const LOOP_SPEED = 0.7;
// The export is not a closed cycle: frame 0 sits ~47px higher than frame 30,
// so looping the whole thing pops. Frames 12-27 are the hover, and the gap
// between those two frames is a third of an ordinary frame-to-frame step, so
// that window wraps invisibly and needs no cross-fade at all. (Measured over
// the decoded frames; every other window is 6-7x worse.)
const HOVER_START = 12;
const HOVER_END = 27;

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const ICON_APPLE    = onboardingSource(require('../../../assets/auth/apple.png') as ImageSourcePropType, 'apple');
interface Props {
  activeIndex?: number;
  /** Pager tap handler: a tap on the hero/title area goes back a slide. */
  onPress?: (e: GestureResponderEvent) => void;
  active?: boolean;
}

// Placeholder legal copy shown in the policy overlay until real content exists.
const POLICY_TEXT: Record<'terms' | 'privacy', { title: string; body: string }> = {
  terms: {
    title: 'Terms of Use',
    body:
      'Welcome to Konnect. By using this app you agree to these Terms of Use.\n\n' +
      '1. Service. Konnect provides travel information and community features for visitors to Korea. Content is provided "as is" without warranties of any kind.\n\n' +
      '2. Accounts. You are responsible for maintaining the security of your account and for all activity that occurs under it.\n\n' +
      '3. Acceptable use. You agree not to misuse the service, post unlawful content, or interfere with other users\' enjoyment of the app.\n\n' +
      '4. Content. Recommendations and answers are informational only and may not always be accurate or up to date. Always verify critical information (visas, emergencies, transport) with official sources.\n\n' +
      '5. Termination. We may suspend or terminate accounts that violate these terms.\n\n' +
      '6. Changes. We may update these terms from time to time; continued use constitutes acceptance.\n\n' +
      'This is placeholder text and will be replaced with the final Terms of Use.',
  },
  privacy: {
    title: 'Privacy Policy',
    body:
      'Your privacy matters to us. This policy explains what data Konnect collects and how it is used.\n\n' +
      '1. Data we collect. Account details from your sign-in provider (name, email, photo), onboarding preferences, and usage data such as searches within the app.\n\n' +
      '2. How we use it. To personalize recommendations, improve the service, and provide customer support. Voice input is processed only to convert speech to text for your search.\n\n' +
      '3. Sharing. We do not sell your personal data. Limited data may be shared with service providers (e.g. authentication, analytics) under strict agreements.\n\n' +
      '4. Retention. Data is kept only as long as needed for the purposes above, or as required by law.\n\n' +
      '5. Your rights. You may request access, correction, or deletion of your data at any time from Profile → Privacy.\n\n' +
      'This is placeholder text and will be replaced with the final Privacy Policy.',
  },
};

export function SignIn({ onPress, active }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signInWithApple, signInWithGoogle, signInWithFacebook } = useAuth();
  // Covers the whole screen while a provider sign-in + Firebase exchange runs.
  // On success it stays visible until this screen unmounts (auth state flips),
  // so the user never stares at a frozen sign-in page.
  const [authLoading, setAuthLoading] = useState(false);
  const [policy, setPolicy] = useState<'terms' | 'privacy' | null>(null);
  const fadeAnim = useSharedValue(0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fadeAnim.value }));
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    fadeAnim.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.ease) });
  }, [active]);

  // Only spin the frame sequence while this page is the one on screen, and
  // only over the seamless hover window.
  const heroRef = useRef<LottieView>(null);
  useEffect(() => {
    if (active) heroRef.current?.play(HOVER_START, HOVER_END);
    else heroRef.current?.pause();
  }, [active]);

  const handleGooglePress = async () => {
    if (!active || authLoading || AppState.currentState !== 'active') return;

    try {
      setAuthLoading(true);
      const ok = await signInWithGoogle();
      // Cancelled → hide the loader. Success → keep it until unmount.
      if (!ok && mountedRef.current) setAuthLoading(false);
    } catch (error: any) {
      if (mountedRef.current) setAuthLoading(false);
      const msg = String(error?.message ?? '').toLowerCase();
      if (
        msg.includes('current activity is null') ||
        msg.includes('please use `signout()` instead') ||
        msg.includes('please use signout() instead')
      ) {
        return;
      }

      if (mountedRef.current && AppState.currentState === 'active') {
        Alert.alert('Google sign-in failed', String(error?.message ?? 'Please try again.'));
      }
    }
  };

  const handleApplePress = async () => {
    if (authLoading) return;
    try {
      setAuthLoading(true);
      const ok = await signInWithApple();
      if (!ok && mountedRef.current) setAuthLoading(false);
    } catch (error: any) {
      if (mountedRef.current) setAuthLoading(false);
      Alert.alert('Apple sign-in failed', String(error?.message ?? 'Please try again.'));
    }
  };

  const handleFacebookPress = async () => {
    if (authLoading) return;
    try {
      setAuthLoading(true);
      const ok = await signInWithFacebook();
      if (!ok && mountedRef.current) setAuthLoading(false);
    } catch (error: any) {
      if (mountedRef.current) setAuthLoading(false);
      Alert.alert('Facebook sign-in failed', String(error?.message ?? 'Please try again.'));
    }
  };

  return (
    <View style={styles.root}>
      {/* Flat #dbecf6 — exactly the login Lottie's baked frame background
          (SignUp_SignIn 12320:52240); clouds/glow removed per the Aug design. */}
      {/* Background + clouds come from the pager's shared panoramic layer
          (its sign-in stop is the design's #cae3fe → #fcfeff gradient). */}

      {/* Logo */}
      {/* Logo is rendered once, stationary, in OnboardingScreen. */}

      {/* Bird + title/subtitle, anchored in the upper-middle of the screen.
          The hero is the designer's looping login Lottie, 301×223 design px. */}
      <Pressable style={styles.topContent} onPress={onPress}>
        <View style={styles.heroLottieBox}>
          <LottieView
            ref={heroRef}
            source={SIGNIN_LOOP}
            loop
            speed={LOOP_SPEED}
            style={styles.heroLottie}
            resizeMode="contain"
          />
        </View>

        <Animated.View style={[styles.textColumn, fadeStyle]}>
          <View style={styles.headerText}>
            {/* Long translations shrink uniformly to fit each line. */}
            <AutoFitTitle maxWidth={W - sx(48)}>
              <Text style={styles.titleMed}>{t('signIn.line1')}</Text>
            </AutoFitTitle>
            <AutoFitTitle maxWidth={W - sx(48)}>
              <Text style={styles.titleMed}>{t('signIn.line2Prefix')}</Text>
              <View style={{ width: sx(6) }} />
              <Text style={styles.titleBold}>{t('signIn.line2Bold')}</Text>
            </AutoFitTitle>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>{t('signIn.subtitle')}</Text>
            <View style={styles.betaTag}>
              <Text style={styles.betaText}>{t('signIn.beta')}</Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>

      {/* Social sign-in + terms, anchored to the bottom of the screen.
          Figma SignUp_SignIn_Android (13192:85512): full-width outlined
          "Continue with …" buttons 8 apart, the terms footer 12 below. */}
      {/* Design: container bottom 58 = the 34 home-indicator zone + 24. */}
      <Animated.View style={[styles.bottomGroup, { bottom: Math.max(insets.bottom, sy(34)) + sy(24) }, fadeStyle]}>
        <View style={styles.loginButtons}>
          {Platform.OS === 'ios' ? (
            <PressableScale onPress={handleApplePress} style={styles.loginBtn}>
              <Image source={ICON_APPLE} style={styles.loginIconApple} resizeMode="cover" />
              <Text style={styles.loginBtnText}>{t('signIn.continueWithApple')}</Text>
            </PressableScale>
          ) : (
            <PressableScale onPress={handleGooglePress} disabled={authLoading || !active} style={styles.loginBtn}>
              <SvgXml xml={LOGIN_GOOGLE_ICON_SVG} width={sx(22)} height={sx(22)} />
              <Text style={styles.loginBtnText}>{t('signIn.continueWithGoogle')}</Text>
            </PressableScale>
          )}
          <PressableScale onPress={handleFacebookPress} style={styles.loginBtn}>
            <SvgXml xml={LOGIN_FACEBOOK_ICON_SVG} width={sx(24)} height={sx(24)} />
            <Text style={styles.loginBtnText}>{t('signIn.continueWithFacebook')}</Text>
          </PressableScale>
        </View>

        {/* Terms — links are full Pressables with hitSlop so the whole word is
            an easy tap target (not just the center of the text). */}
        <View style={styles.termsWrap}>
          <Text style={styles.terms}>By creating an account, you agree to our</Text>
          <View style={styles.termsLinksRow}>
            <PressableScale onPress={() => setPolicy('terms')} hitSlop={12}>
              <Text style={[styles.terms, styles.termsLink]}>Terms of Use</Text>
            </PressableScale>
            <Text style={styles.terms}> and </Text>
            <PressableScale onPress={() => setPolicy('privacy')} hitSlop={12}>
              <Text style={[styles.terms, styles.termsLink]}>Privacy Policy</Text>
            </PressableScale>
            <Text style={styles.terms}>.</Text>
          </View>
        </View>
      </Animated.View>

      {/* Full-screen loader while the provider sign-in + Firebase exchange runs.
          Rendered in a transparent Modal (its own window, translucent bars) so
          it never affects the layout or size of the screen behind it. */}
      <AnimatedModal
        visible={authLoading}
        variant="fade"
        dismissOnScrim={false}
        scrimColor="transparent"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.authLoadingOverlay}>
          <View style={styles.authLoadingCard}>
            <ActivityIndicator size="large" color="#527dff" />
            <Text style={styles.authLoadingText}>{t('signIn.signingIn')}</Text>
          </View>
        </View>
      </AnimatedModal>

      {/* Policy overlay (Terms of Use / Privacy Policy) — the scrim is the
          AnimatedModal's own layer behind the card, so the ScrollView has no
          Pressable ancestor stealing the drag. */}
      <AnimatedModal
        visible={policy !== null}
        variant="dialog"
        scrimColor="rgba(17, 26, 96, 0.35)"
        onRequestClose={() => setPolicy(null)}
      >
        <View style={styles.policyRoot} pointerEvents="box-none">
          <View style={styles.policyCard}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>{policy ? POLICY_TEXT[policy].title : ''}</Text>
              <PressableScale onPress={() => setPolicy(null)} hitSlop={12} style={styles.policyCloseBtn}>
                <Ionicons name="close" size={sx(22)} color="#657586" />
              </PressableScale>
            </View>
            <ScrollView
              style={styles.policyScroll}
              contentContainerStyle={styles.policyScrollContent}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <Text style={styles.policyBody}>{policy ? POLICY_TEXT[policy].body : ''}</Text>
            </ScrollView>
          </View>
        </View>
      </AnimatedModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  // Cloud positions per SignUp_SignIn_Android (12320:52240).
  cloudBottom: { position: 'absolute', left: sx(-3.5), top: sy(281), opacity: 0.2 },
  cloudTop: { position: 'absolute', left: sx(231), top: sy(85), opacity: 0.5 },
  // Figma SignUp_SignIn_Android (13192:85512): the "Text Content" column
  // runs 61→537 with the header at its top and the bird group at its bottom:
  // bird slot 278×207 at y 168, title 36 below it (top 411). The Lottie's
  // canvas has motion padding, so its bird draws ~20% smaller than the
  // design's still; the box is scaled 1.25× about the same centre (142→401)
  // and the gap shrinks so the title still starts at 411.
  topContent: {
    position: 'absolute',
    top: sy(142),
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: sy(10),
  },
  // Flat screen background = the login Lottie's own frame color.

  // Login hero Lottie: the design's 278×207 bird slot ×1.25 (same 1064:792 aspect).
  heroLottieBox: { width: sx(348), height: sx(259) },
  heroLottie: { width: '100%', height: '100%' },
  textColumn: {
    width: sx(300),
    alignItems: 'center',
    gap: sy(10),
  },
  headerText: {
    alignItems: 'center',
    gap: sy(4),
    width: '100%',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: sx(6),
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: sx(2),
  },
  betaTag: {
    height: sy(16),
    marginTop: -sy(3),
    paddingHorizontal: sx(6),
    borderRadius: 99,
    backgroundColor: '#c9e3ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  betaText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(11),
    color: '#527dff',
    letterSpacing: -0.12,
    lineHeight: sy(16),
  },
  // Container: px 20, buttons column then footer 12 apart.
  bottomGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: sx(20),
    gap: sy(12),
  },
  titleMed: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(35),
    color: '#1d192b',
    letterSpacing: -1.4,
    lineHeight: sy(44),
    textAlign: 'center',
  },
  titleBold: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(35),
    color: '#1d192b',
    letterSpacing: -1.4,
    lineHeight: sy(44),
  },
  subtitle: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    color: '#657586',
    textAlign: 'center',
    lineHeight: sy(24),
    letterSpacing: -0.16,
  },
  loginButtons: { width: '100%', gap: sy(8) },
  // "Google Login" / "Facebook Login": h 44, 1px #c5d7ec outline, radius 8,
  // px 12, icon + label 10 apart, centred. No fill — the gradient shows through.
  loginBtn: {
    width: '100%',
    height: sy(44),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sx(10),
    paddingHorizontal: sx(12),
    borderRadius: sx(8),
    borderWidth: 1,
    borderColor: '#c5d7ec',
  },
  // Label is Google Sans Flex Medium 14/20 in the design; the app doesn't
  // bundle it, so this is the platform's own medium sans (Roboto on Android).
  loginBtnText: {
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
    fontWeight: '500',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: '#1f1f1f',
  },
  loginIconApple: { width: sx(22), height: sx(22), borderRadius: sx(6) },
  // Footer: px 24 / py 12 around the two centred terms lines.
  termsWrap: {
    alignItems: 'center',
    paddingHorizontal: sx(24),
    paddingVertical: sy(12),
  },
  termsLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  terms: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(12),
    color: '#657586',
    textAlign: 'center',
    lineHeight: sy(16),
  },
  termsLink: {
    color: '#657586',
  },
  authLoadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(234, 244, 255, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authLoadingCard: {
    alignItems: 'center',
    gap: sy(14),
    backgroundColor: '#ffffff',
    borderRadius: sx(20),
    paddingVertical: sy(28),
    paddingHorizontal: sx(36),
    shadowColor: '#0077ff',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  authLoadingText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(15),
    color: '#3a4657',
    letterSpacing: -0.15,
  },
  policyRoot: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sx(20),
  },
  policyCard: {
    width: '100%',
    maxHeight: H * 0.72,
    backgroundColor: '#ffffff',
    borderRadius: sx(20),
    paddingTop: sy(16),
    paddingBottom: sy(20),
    overflow: 'hidden',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: sx(20),
    paddingRight: sx(12),
    marginBottom: sy(10),
  },
  policyTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(18),
    color: '#1d192b',
    letterSpacing: -0.18,
  },
  policyCloseBtn: {
    width: sx(32),
    height: sx(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyScroll: {
    paddingHorizontal: sx(20),
  },
  policyScrollContent: {
    paddingBottom: sy(8),
  },
  policyBody: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(14),
    lineHeight: sy(22),
    color: '#3a4657',
    letterSpacing: -0.1,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: sy(8),
    paddingTop: sy(8),
  },
  homeIndicatorBar: {
    width: sx(134),
    height: 4,
    backgroundColor: '#171717',
    borderRadius: 999,
  },
});
