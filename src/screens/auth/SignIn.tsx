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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { onboardingSource } from '../../assets/onboardingAssets';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const BG            = onboardingSource(require('../../../assets/onboarding/bg-signin.png') as ImageSourcePropType, 'bg-signin');
const LOGO          = onboardingSource(require('../../../assets/onboarding/logo.png') as ImageSourcePropType, 'logo');
const BIRD          = onboardingSource(require('../../../assets/mascot/bird-signin.png') as ImageSourcePropType, 'bird-signin');
const ICON_APPLE    = onboardingSource(require('../../../assets/auth/apple.png') as ImageSourcePropType, 'apple');
const ICON_GOOGLE   = onboardingSource(require('../../../assets/auth/google.png') as ImageSourcePropType, 'google');
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
      <Image source={BG} style={StyleSheet.absoluteFill} resizeMode="cover" />


      {/* Logo */}
      <Image source={LOGO} style={{ position: 'absolute', left: sx(32), top: sy(70), width: sx(92), height: sy(15) }} resizeMode="contain" />

      {/* Content frame: top=188, bottom=76 from screen edge */}
      <View style={styles.contentFrame}>
        {/* Bird + text, vertically centered */}
        <View style={styles.textAndBird}>
          <Animated.View style={{ transform: [{ translateY: birdY }] }}>
            <Image source={BIRD} style={styles.bird} resizeMode="cover" />
          </Animated.View>

          <Animated.View style={[styles.textColumn, { opacity: fadeAnim }]}>
            {/* Title */}
            <View style={styles.mainText}>
              <View style={styles.headerText}>
                <Text style={styles.titleMed}>{t('signIn.line1')}</Text>
                <View style={styles.secondaryRow}>
                  <Text style={styles.titleMed}>{t('signIn.line2Prefix')} </Text>
                  <Text style={styles.titleBold}>{t('signIn.line2Bold')}</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>{t('signIn.subtitle')}</Text>
            </View>

            {/* Social sign-in icons */}
            <View style={styles.socialRow}>
              {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={handleApplePress} activeOpacity={0.85}>
                  <Image source={ICON_APPLE} style={styles.appleIcon} resizeMode="cover" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={Platform.OS === 'android' ? handleGooglePress : undefined}
                activeOpacity={0.85}
                disabled={Platform.OS === 'android' ? authLoading || !active : false}
              >
                <Image source={ICON_GOOGLE} style={styles.googleIcon} resizeMode="cover" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleFacebookPress} activeOpacity={0.85}>
                <Image source={ICON_FACEBOOK} style={styles.facebookIcon} resizeMode="cover" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        {/* Terms — links are full Pressables with hitSlop so the whole word is
            an easy tap target (not just the center of the text). */}
        <Animated.View style={[styles.termsWrap, { opacity: fadeAnim }]}>
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
        </Animated.View>
      </View>

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
  contentFrame: {
    position: 'absolute',
    top: sy(188),
    left: 0,
    right: 0,
    bottom: sy(76),
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textAndBird: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sy(36),
  },
  bird: {
    width: sx(278),
    height: sy(208),
  },
  textColumn: {
    width: sx(197),
    alignItems: 'center',
    gap: sy(44),
  },
  mainText: {
    alignItems: 'center',
    gap: sy(8),
    width: '100%',
  },
  headerText: {
    alignItems: 'center',
    gap: sy(4),
    width: '100%',
  },
  secondaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: sx(4),
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
    borderRadius: sx(99),
  },
  googleIcon: {
    width: sx(44),
    height: sx(44),
    borderRadius: sx(99),
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
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(12),
    color: '#93a5b9',
    textAlign: 'center',
    lineHeight: sy(16),
  },
  termsLink: {
    fontFamily: 'NationalPark_600SemiBold',
    color: '#527dff',
    textDecorationLine: 'underline',
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
