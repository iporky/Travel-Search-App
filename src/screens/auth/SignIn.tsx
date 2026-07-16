import React, { useEffect, useRef, useState } from 'react';
import {
  AppState,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { onboardingSource } from '../../assets/onboardingAssets';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

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

export function SignIn({ onPress, active }: Props) {
  const { t } = useTranslation();
  const { signInWithApple, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
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
    if (!active || googleLoading || AppState.currentState !== 'active') return;

    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
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
    } finally {
      if (mountedRef.current) setGoogleLoading(false);
    }
  };

  const handleApplePress = async () => {
    try {
      await signInWithApple();
    } catch (error: any) {
      Alert.alert('Apple sign-in failed', String(error?.message ?? 'Please try again.'));
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#e0eeff', '#eef5ff']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />


      {/* Logo */}
      <Image source={LOGO} style={{ position: 'absolute', left: sx(20), top: sy(66), width: sx(92), height: sy(15) }} resizeMode="contain" />

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
                disabled={Platform.OS === 'android' ? googleLoading || !active : false}
              >
                <Image source={ICON_GOOGLE} style={styles.googleIcon} resizeMode="cover" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
                <Image source={ICON_FACEBOOK} style={styles.facebookIcon} resizeMode="cover" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>

        {/* Terms */}
        <Animated.Text style={[styles.terms, { opacity: fadeAnim }]}>
          {'By creating an account, you agree to our\nTerms of Use and Privacy Policy.'}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: W, height: H, overflow: 'hidden', backgroundColor: '#eaf4ff' },
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
  terms: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(12),
    color: '#93a5b9',
    textAlign: 'center',
    lineHeight: sy(16),
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
