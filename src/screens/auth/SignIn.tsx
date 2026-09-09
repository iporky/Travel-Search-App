import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Animated,
  Dimensions,
  Easing,
  GestureResponderEvent,
  Image,
  ImageSourcePropType,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop, SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import LottieView from 'lottie-react-native';
import { useAuth } from '../../context/AuthContext';
import { onboardingSource } from '../../assets/onboardingAssets';
import { SIGNIN_BIRD_SVG, SIGNIN_TOP_CLOUD_SVG, SIGNIN_BOTTOM_CLOUD_SVG } from '../../assets/signInAssets';
import { AutoFitTitle } from '../../components/AutoFitTitle';

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
// Crisp vector Google "G" (the raster PNG looked pixelated).
const GOOGLE_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><mask id="m0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20"><path d="M20 0H0V20H20V0Z" fill="white"/></mask><g mask="url(#m0)"><path d="M19.6 10.2273C19.6 9.51822 19.5364 8.83642 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z" fill="#4285F4"/><path d="M9.99988 20C12.6999 20 14.9635 19.1045 16.618 17.5773L13.3862 15.0682C12.4908 15.6682 11.3453 16.0227 9.99988 16.0227C7.39528 16.0227 5.19078 14.2636 4.40438 11.9H1.06348V14.4909C2.70898 17.7591 6.09078 20 9.99988 20Z" fill="#34A853"/><path d="M4.4045 11.9C4.2045 11.3 4.0909 10.6591 4.0909 9.99999C4.0909 9.34089 4.2045 8.69999 4.4045 8.09999V5.50909H1.0636C0.3864 6.85909 0 8.38639 0 9.99999C0 11.6136 0.3864 13.1409 1.0636 14.4909L4.4045 11.9Z" fill="#FBBC04"/><path d="M9.99988 3.9773C11.468 3.9773 12.7862 4.4818 13.8226 5.4727L16.6908 2.6045C14.959 0.9909 12.6953 0 9.99988 0C6.09078 0 2.70898 2.2409 1.06348 5.5091L4.40438 8.1C5.19078 5.7364 7.39528 3.9773 9.99988 3.9773Z" fill="#E94235"/></g></svg>`;
const ICON_FACEBOOK = onboardingSource(require('../../../assets/auth/facebook.png') as ImageSourcePropType, 'facebook');

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
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
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

        <Animated.View style={[styles.textColumn, { opacity: fadeAnim }]}>
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

      {/* Social sign-in + terms, anchored to the bottom of the screen. */}
      <Animated.View style={[styles.bottomGroup, { bottom: insets.bottom + sy(20), opacity: fadeAnim }]}>
        <View style={styles.socialRow}>
          {Platform.OS === 'ios' ? (
            <TouchableOpacity onPress={handleApplePress} activeOpacity={0.85}>
              <Image source={ICON_APPLE} style={styles.appleIcon} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleGooglePress}
              activeOpacity={0.85}
              disabled={authLoading || !active}
            >
              <View style={styles.googleBtn}>
                <SvgXml xml={GOOGLE_SVG} width={sx(20)} height={sx(20)} />
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleFacebookPress} activeOpacity={0.85}>
            <Image source={ICON_FACEBOOK} style={styles.facebookIcon} resizeMode="cover" />
          </TouchableOpacity>
        </View>

        {/* Terms — links are full Pressables with hitSlop so the whole word is
            an easy tap target (not just the center of the text). */}
        <View style={styles.termsWrap}>
          <Text style={styles.terms}>By creating an account, you agree to our</Text>
          <View style={styles.termsLinksRow}>
            <Pressable onPress={() => setPolicy('terms')} hitSlop={12}>
              <Text style={[styles.terms, styles.termsLink]}>Terms of Use</Text>
            </Pressable>
            <Text style={styles.terms}> and </Text>
            <Pressable onPress={() => setPolicy('privacy')} hitSlop={12}>
              <Text style={[styles.terms, styles.termsLink]}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.terms}>.</Text>
          </View>
        </View>
      </Animated.View>

      {/* Full-screen loader while the provider sign-in + Firebase exchange runs.
          Rendered in a transparent Modal (its own window, translucent bars) so
          it never affects the layout or size of the screen behind it. */}
      <Modal
        visible={authLoading}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.authLoadingOverlay}>
          <View style={styles.authLoadingCard}>
            <ActivityIndicator size="large" color="#527dff" />
            <Text style={styles.authLoadingText}>{t('signIn.signingIn')}</Text>
          </View>
        </View>
      </Modal>

      {/* Policy overlay (Terms of Use / Privacy Policy) */}
      <Modal
        visible={policy !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPolicy(null)}
      >
        {/* Backdrop is its own layer BEHIND the card — the card is a plain View,
            so the ScrollView has no Pressable ancestor stealing the drag. */}
        <View style={styles.policyRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPolicy(null)} />
          <View style={styles.policyCard}>
            <View style={styles.policyHeader}>
              <Text style={styles.policyTitle}>{policy ? POLICY_TEXT[policy].title : ''}</Text>
              <Pressable onPress={() => setPolicy(null)} hitSlop={12} style={styles.policyCloseBtn}>
                <Ionicons name="close" size={sx(22)} color="#657586" />
              </Pressable>
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  // Cloud positions per SignUp_SignIn_Android (12320:52240).
  cloudBottom: { position: 'absolute', left: sx(-3.5), top: sy(281), opacity: 0.2 },
  cloudTop: { position: 'absolute', left: sx(231), top: sy(85), opacity: 0.5 },
  topContent: {
    position: 'absolute',
    top: sy(200),
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: sy(36),
  },
  // Flat screen background = the login Lottie's own frame color.

  // Login hero Lottie (301×223 design px; bg matches the screen).
  heroLottieBox: { width: sx(301), height: sx(223) },
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
    gap: sx(4),
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
  bottomGroup: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: sy(20),
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
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(24),
  },
  appleIcon: {
    width: sx(44),
    height: sx(44),
    borderRadius: sx(12),
  },
  googleBtn: {
    width: sx(44),
    height: sx(44),
    borderRadius: sx(99),
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c8c8c8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facebookIcon: {
    width: sx(40),
    height: sx(40),
    borderRadius: sx(99),
  },
  termsWrap: {
    alignItems: 'center',
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
    backgroundColor: 'rgba(17, 26, 96, 0.35)',
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
