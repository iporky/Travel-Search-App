import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/tokens';
import { useLanguage } from '../context/LanguageContext';
import { SplashWelcome1 } from './onboarding/SplashWelcome1';
import { SplashWelcome2 } from './onboarding/SplashWelcome2';
import { SplashWelcome3 } from './onboarding/SplashWelcome3';
import { SplashWelcome4 } from './onboarding/SplashWelcome4';
import { SignIn } from './auth/SignIn';
import { LanguageScreen } from './LanguageScreen';
import { onboardingSource } from '../assets/onboardingAssets';

// Memoized slides: they only re-render when their own `active` flag flips,
// keeping the swipe gesture running purely on the native scroll thread.
const MemoSplash1 = React.memo(SplashWelcome1, (p, n) => p.active === n.active);
const MemoSplash2 = React.memo(SplashWelcome2, (p, n) => p.active === n.active);
const MemoSplash3 = React.memo(SplashWelcome3, (p, n) => p.active === n.active);
const MemoSplash4 = React.memo(SplashWelcome4, (p, n) => p.active === n.active);
const MemoSignIn = React.memo(SignIn, (p, n) => p.active === n.active);

const { width: W, height: H } = Dimensions.get('window');

// Design baseline is iPhone 14 (375×812). Scale layout from that.
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

// Rendered once, stationary, above the pager (see topBar) — the slides no
// longer draw their own copy, so it doesn't travel with the swipe.
const LOGO = onboardingSource(
  require('../../assets/onboarding/logo.png') as ImageSourcePropType,
  'logo',
);

// ─── Remote assets for slides 2-4 (Figma URLs, valid 7 days) ────────────────
const BIRD_2 = 'https://www.figma.com/api/mcp/asset/5c8b8ff9-c8dc-46d9-b059-6549116c63f4';
const BIRD_3 = 'https://www.figma.com/api/mcp/asset/44b1411e-0e0e-4b54-bb0f-83da9f54edcd';
const BIRD_4 = 'https://www.figma.com/api/mcp/asset/8ba4dc05-ec55-40db-9e23-95ba8b9d2a20';

type Illustration = ImageSourcePropType | { uri: string };

interface Slide {
  id: string;
  bgColors: readonly [string, string];
  illustration: Illustration;
  illustrationW: number;
  illustrationH: number;
  illustrationTop: number;
  normalFirst?: string;
  italic: string;
  normalLast?: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    bgColors: ['#c9e3ff', '#eaefff'],
    illustration: { uri: BIRD_2 },
    illustrationW: 231,
    illustrationH: 280,
    illustrationTop: 295,
    italic: 'Korea ',
    normalLast: 'starts here',
    subtitle: 'Everything you need,\nfrom arrival to adventure',
  },
  {
    id: '2',
    bgColors: ['#e2defb', '#f3f2fd'],
    illustration: { uri: BIRD_2 },
    illustrationW: 220,
    illustrationH: 260,
    illustrationTop: 200,
    italic: 'Ask ',
    normalLast: 'us anything',
    subtitle: 'Get real-time answers\nwhenever you need them',
  },
  {
    id: '3',
    bgColors: ['#d0e8ff', '#f3f6fe'],
    illustration: { uri: BIRD_3 },
    illustrationW: 200,
    illustrationH: 200,
    illustrationTop: 280,
    normalFirst: 'Catch the ',
    italic: 'Buzz',
    subtitle: 'Get real-time tips, hot spots,\nand advice from travelers',
  },
  {
    id: '4',
    bgColors: ['#f5f7ff', '#e3f4fb'],
    illustration: { uri: BIRD_4 },
    illustrationW: 260,
    illustrationH: 300,
    illustrationTop: 160,
    normalFirst: 'No more ',
    italic: 'waiting',
    subtitle: 'Use your own card\nand keep moving',
  },
  {
    id: '5',
    bgColors: ['#c9e3ff', '#f3f6fe'],
    illustration: { uri: BIRD_4 },
    illustrationW: 228,
    illustrationH: 228,
    illustrationTop: 252,
    italic: 'Sign in',
    subtitle: '',
  },
];

interface Props {
  onDone: () => void;
  /** When true, skip the intro slides and jump straight to the sign-in slide */
  initialSignInIndex?: boolean;
}

export function OnboardingScreen({ onDone, initialSignInIndex = false }: Props) {
  const SIGNIN_SLIDE = SLIDES.length - 1; // index 4
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  // Region code prefix for the language button, e.g. ko-KR → "KR", ja-JP → "JP".
  const langPrefix = (language.voiceLocale.split('-')[1] || language.code).toUpperCase();
  // Size each page from the live full window so the background image always fills
  // the whole screen (no bottom gap, no half-covered look). Captured live via the
  // hook so it's correct after edge-to-edge settles.
  const { width: winW, height: winH } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(initialSignInIndex ? SIGNIN_SLIDE : 0);
  const [showLanguage, setShowLanguage] = useState(false);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const flatRef = useRef<FlatList<Slide>>(null);
  // Horizontal scroll offset — drives the per-page slide/fade entirely on the
  // native thread (no JS round-trip), so the transition tracks the finger at
  // 60fps and settles with the pager's own deceleration.
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleViewableChange = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const next = viewableItems[0].index ?? 0;
        if (next !== activeIndexRef.current) setActiveIndex(next);
      }
    }
  ).current;

  const goNext = useCallback(() => {
    const idx = activeIndexRef.current;
    if (idx < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: idx + 1, animated: true });
    } else {
      onDone();
    }
  }, [onDone]);

  const renderItem = useCallback(
    ({ item, index }: { item: Slide; index: number }) => {
      // Memoized slides: `activeIndex` is passed as the slide's own index so the
      // prop stays constant — only the `active` boolean flip triggers a re-render.
      let slide: React.ReactNode = null;
      if (item.id === '1') slide = <MemoSplash1 activeIndex={0} active={activeIndex === 0} onPress={goNext} />;
      else if (item.id === '2') slide = <MemoSplash2 activeIndex={1} active={activeIndex === 1} onPress={goNext} />;
      else if (item.id === '3') slide = <MemoSplash3 activeIndex={2} active={activeIndex === 2} onPress={goNext} />;
      else if (item.id === '4') slide = <MemoSplash4 activeIndex={3} active={activeIndex === 3} onPress={goNext} />;
      else if (item.id === '5') slide = <MemoSignIn activeIndex={4} active={activeIndex === 4} onPress={goNext} />;
      // Slide-in transition: the incoming page glides in from a slight offset
      // while fading and scaling up; the outgoing page recedes the same way.
      // Interpolated from scrollX so it's continuous under the finger.
      const inputRange = [(index - 1) * winW, index * winW, (index + 1) * winW];
      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.3, 1, 0.3],
        extrapolate: 'clamp',
      });
      const translateX = scrollX.interpolate({
        inputRange,
        outputRange: [winW * 0.2, 0, -winW * 0.2],
        extrapolate: 'clamp',
      });
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.94, 1, 0.94],
        extrapolate: 'clamp',
      });

      // Each page fills the full window → background image covers the whole screen.
      return (
        <Animated.View
          style={{ width: winW, height: winH, opacity, transform: [{ translateX }, { scale }] }}
        >
          {slide}
        </Animated.View>
      );
    },
    [activeIndex, goNext, winW, winH, scrollX],
  );
  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        onViewableItemsChanged={handleViewableChange}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        getItemLayout={(_, index) => ({ length: winW, offset: winW * index, index })}
        initialScrollIndex={initialSignInIndex ? SIGNIN_SLIDE : 0}
        // Pre-mount every slide so swipes never hit a blank page and the
        // scroll runs entirely on the native thread — butter smooth.
        initialNumToRender={SLIDES.length}
        maxToRenderPerBatch={SLIDES.length}
        windowSize={SLIDES.length + 2}
        removeClippedSubviews={false}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
      />

      {/* Static top bar — logo (left) and language selector (right) share one
          baseline and stay put while the pages slide underneath. */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <Pressable onPress={() => setShowLanguage(true)} style={styles.languageBtn} hitSlop={8}>
          <Ionicons name="globe-outline" size={sx(18)} color={colors.gray[900]} />
          <Text style={styles.languageCode}>{langPrefix}</Text>
        </Pressable>
      </View>

      {/* Stationary pagination dots. The Skip / Get started button was removed
          (first demo release), so the dots drop down to keep proper bottom
          alignment. */}
      {activeIndex < SIGNIN_SLIDE ? (
        <View
          style={[styles.fixedDotsRow, { bottom: insets.bottom + sy(36) }]}
          pointerEvents="none"
        >
          {SLIDES.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      ) : null}

      <LanguageScreen visible={showLanguage} onClose={() => setShowLanguage(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eaf4ff' },
  slidePressable: { width: W, height: H },
  slide: { width: W, height: H },
  // Figma: logo at (32, 70) 92×15, language pill top-right. One row, both
  // vertically centred, so they read as a single header line.
  topBar: {
    position: 'absolute',
    top: sy(58),
    left: sx(32),
    right: sx(20),
    height: sx(32),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  logo: { width: sx(92), height: sy(15) },
  languageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(4),
    height: sx(32),
    paddingHorizontal: sx(6),
    borderRadius: 999,
  },
  languageCode: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(13),
    color: colors.gray[900],
    letterSpacing: 0.3,
    // Android adds asymmetric font padding that drops the text below the globe's
    // center — remove it so "EN"/"US" sits vertically centered with the icon.
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  bottomContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: spacing[5],
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'baseline',
  },
  titleNormal: {
    fontSize: 35,
    fontWeight: '500',
    color: '#1d192b',
    letterSpacing: -1.4,
    lineHeight: 44,
  },
  titleItalic: {
    fontSize: 35,
    fontWeight: '600',
    fontStyle: 'italic',
    color: '#1d192b',
    letterSpacing: -1.4,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[900],
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: -0.16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing[1],
  },
  fixedDotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: sx(8),
    zIndex: 20,
  },
  dot: {
    width: sx(8),
    height: sx(8),
    borderRadius: 9999,
  },
  dotActive: {
    backgroundColor: '#527dff',
  },
  dotInactive: {
    backgroundColor: '#c9e3ff',
  },
});
