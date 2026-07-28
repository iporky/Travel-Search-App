import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Alert,
  Animated,
  Dimensions,
  Easing,
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
import { useAuth } from '../../context/AuthContext';
import { onboardingSource } from '../../assets/onboardingAssets';
import { SIGNIN_BIRD_SVG, SIGNIN_TOP_CLOUD_SVG, SIGNIN_BOTTOM_CLOUD_SVG } from '../../assets/signInAssets';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const LOGO          = onboardingSource(require('../../../assets/onboarding/logo.png') as ImageSourcePropType, 'logo');
const ICON_APPLE    = onboardingSource(require('../../../assets/auth/apple.png') as ImageSourcePropType, 'apple');
// Crisp vector Google "G" (the raster PNG looked pixelated).
const GOOGLE_SVG = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><mask id="m0" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="20" height="20"><path d="M20 0H0V20H20V0Z" fill="white"/></mask><g mask="url(#m0)"><path d="M19.6 10.2273C19.6 9.51822 19.5364 8.83642 19.4182 8.18182H10V12.05H15.3818C15.15 13.3 14.4455 14.3591 13.3864 15.0682V17.5773H16.6182C18.5091 15.8364 19.6 13.2727 19.6 10.2273Z" fill="#4285F4"/><path d="M9.99988 20C12.6999 20 14.9635 19.1045 16.618 17.5773L13.3862 15.0682C12.4908 15.6682 11.3453 16.0227 9.99988 16.0227C7.39528 16.0227 5.19078 14.2636 4.40438 11.9H1.06348V14.4909C2.70898 17.7591 6.09078 20 9.99988 20Z" fill="#34A853"/><path d="M4.4045 11.9C4.2045 11.3 4.0909 10.6591 4.0909 9.99999C4.0909 9.34089 4.2045 8.69999 4.4045 8.09999V5.50909H1.0636C0.3864 6.85909 0 8.38639 0 9.99999C0 11.6136 0.3864 13.1409 1.0636 14.4909L4.4045 11.9Z" fill="#FBBC04"/><path d="M9.99988 3.9773C11.468 3.9773 12.7862 4.4818 13.8226 5.4727L16.6908 2.6045C14.959 0.9909 12.6953 0 9.99988 0C6.09078 0 2.70898 2.2409 1.06348 5.5091L4.40438 8.1C5.19078 5.7364 7.39528 3.9773 9.99988 3.9773Z" fill="#E94235"/></g></svg>`;
const ICON_FACEBOOK = onboardingSource(require('../../../assets/auth/facebook.png') as ImageSourcePropType, 'facebook');

interface Props {
  activeIndex?: number;
  onPress?: () => void;
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
  const floatBird = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatBird, { toValue: 1, duration: 1750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(floatBird, { toValue: 0, duration: 1750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, [active]);

  const birdY = floatBird.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

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
      {/* Base gradient — absoluteFill covers the whole screen on any size. */}
      <LinearGradient
        colors={['#c9e3ff', '#f2f9ff', '#ffffff']}
        locations={[0, 0.71, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft radial glow + subtle clouds. */}
      <Svg style={{ position: 'absolute', left: (W - sx(470)) / 2, top: sy(300) - sy(215), width: sx(470), height: sy(430) }} pointerEvents="none">
        <Defs>
          <RadialGradient id="signinGlow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="50%" cy="50%" rx="50%" ry="50%" fill="url(#signinGlow)" />
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: sx(231), top: sy(78), width: sx(144), height: sy(123) }}>
        <SvgXml xml={SIGNIN_TOP_CLOUD_SVG} width={sx(144)} height={sy(123)} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: sx(-4), top: sy(272), width: sx(242), height: sy(163) }}>
        <SvgXml xml={SIGNIN_BOTTOM_CLOUD_SVG} width={sx(242)} height={sy(163)} />
      </View>

      {/* Logo */}
      <Image source={LOGO} style={{ position: 'absolute', left: sx(32), top: sy(70), width: sx(92), height: sy(15), zIndex: 10 }} resizeMode="contain" />

      {/* Bird + title/subtitle, anchored in the upper-middle of the screen. */}
      <View style={styles.topContent} pointerEvents="none">
        <Animated.View style={{ transform: [{ translateY: birdY }] }}>
          <SvgXml xml={SIGNIN_BIRD_SVG} width={sx(278)} height={sy(207)} />
        </Animated.View>

        <Animated.View style={[styles.textColumn, { opacity: fadeAnim }]}>
          <View style={styles.headerText}>
            <Text style={styles.titleMed}>{t('signIn.line1')}</Text>
            <View style={styles.secondaryRow}>
              <Text style={styles.titleMed}>{t('signIn.line2Prefix')}</Text>
              <Text style={styles.titleBold}>{t('signIn.line2Bold')}</Text>
            </View>
          </View>
          <View style={styles.subtitleRow}>
            <Text style={styles.subtitle}>{t('signIn.subtitle')}</Text>
            <View style={styles.betaTag}>
              <Text style={styles.betaText}>{t('signIn.beta')}</Text>
            </View>
          </View>
        </Animated.View>
      </View>

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
  root: { width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#eaf4ff' },
  cloudBottom: {
    position: 'absolute',
    left: 0,
    top: sy(288),
    width: sx(238),
    height: sy(155),
    opacity: 0.2,
  },
  cloudTop: {
    position: 'absolute',
    left: sx(241),
    top: sy(94),
    width: sx(134),
    height: sy(103),
    opacity: 0.5,
  },
  topContent: {
    position: 'absolute',
    top: sy(200),
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: sy(36),
  },
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
