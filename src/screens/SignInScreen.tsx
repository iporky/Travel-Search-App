import React from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { radius } from '../theme/tokens';

const { width: W, height: H } = Dimensions.get('window');

const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

// ─── Figma asset URLs ────────────────────────────────────────────────────────
const BG            = 'https://www.figma.com/api/mcp/asset/7e35fdb0-ed02-4bbf-a857-2b6a6def4dde';
const CLOUD         = 'https://www.figma.com/api/mcp/asset/ce427044-170b-4e39-b88e-e22e288c0970';
const BIRD          = 'https://www.figma.com/api/mcp/asset/77092a2d-6eed-4e04-8c00-c032ddb29ff5';
const LOGO          = require('../../assets/onboarding/logo.png') as ImageSourcePropType;
const ICON_APPLE    = 'https://www.figma.com/api/mcp/asset/f5953cc2-debe-46b0-ad6a-da832f84b14d';
const ICON_FACEBOOK = 'https://www.figma.com/api/mcp/asset/ec1aaff1-55dc-4db4-b7c2-697760fb7ac0';

interface Props {
  onDone: () => void;
}

export function SignInScreen({ onDone }: Props) {
  return (
    <View style={styles.container}>
      {/* Background */}
      <Image source={{ uri: BG }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* Bottom cloud overlay — blurred, low opacity */}
      <Image source={{ uri: CLOUD }} style={styles.cloudBottom} resizeMode="cover" blurRadius={5} />

      {/* Top cloud overlay — blurred, medium opacity */}
      <Image source={{ uri: CLOUD }} style={styles.cloudTop} resizeMode="cover" blurRadius={3} />

      {/* Logo */}
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />

      {/* Content frame: top=188, bottom=76 from screen edge */}
      <View style={styles.contentFrame}>
        {/* Bird + text, vertically centered */}
        <View style={styles.textAndBird}>
          <Image source={{ uri: BIRD }} style={styles.bird} resizeMode="cover" />

          <View style={styles.textColumn}>
            {/* Title lines */}
            <View style={styles.mainText}>
              <View style={styles.headerText}>
                <Text style={styles.titleMed}>{"Let's get you"}</Text>
                <View style={styles.secondaryRow}>
                  <Text style={styles.titleMed}>around </Text>
                  <Text style={styles.titleBold}>Korea</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>Trusted by 100k travelers</Text>
            </View>

            {/* Social sign-in icons */}
            <View style={styles.socialRow}>
              <TouchableOpacity onPress={onDone} activeOpacity={0.85}>
                <Image source={{ uri: ICON_APPLE }} style={styles.appleIcon} resizeMode="cover" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onDone} activeOpacity={0.85}>
                <Image source={{ uri: ICON_FACEBOOK }} style={styles.facebookIcon} resizeMode="cover" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          {'By creating an account, you agree to our\nTerms of Use and Privacy Policy.'}
        </Text>
      </View>

      {/* Home indicator */}
      <View style={styles.homeIndicator}>
        <View style={styles.homeIndicatorBar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  logo: {
    position: 'absolute',
    left: sx(20),
    top: sy(58),
    width: sx(92),
    height: sy(15),
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
    borderRadius: radius.full,
  },
});
