import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dimensions, GestureResponderEvent, Image, ImageSourcePropType, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
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
import { WelcomeParallax } from '../components/WelcomeParallax';
import { PressableScale } from '../components/PressableScale';

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

/**
 * One pager page. Panoramic transition: the content glides at finger speed
 * over the shared background (no offset/scale — that read as a separate
 * screen arriving), with only a gentle fade for depth. The fade is a worklet
 * reading the scroll offset on the UI thread, so it costs no JS per frame.
 */
function Page({
  index,
  width,
  height,
  scrollX,
  children,
}: {
  index: number;
  width: number;
  height: number;
  scrollX: SharedValue<number>;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [0.45, 1, 0.45],
      Extrapolation.CLAMP,
    ),
  }));
  return <Animated.View style={[{ width, height }, style]}>{children}</Animated.View>;
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
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // Horizontal scroll offset — a shared value written by the scroll handler
  // on the UI thread, so the page fades and the parallax world track the
  // finger at 60fps with no JS round-trip and settle with the pager's own
  // deceleration.
  const scrollX = useSharedValue(initialSignInIndex ? SIGNIN_SLIDE * winW : 0);

  // Page index after any scroll settles, finger or tap. A plain ScrollView
  // rather than a FlatList: five static pages need no virtualization, and a
  // virtualized list would run viewability and cell bookkeeping in JS on every
  // scroll event, so this keeps the JS thread idle while the pager moves.
  const onMomentumEnd = useCallback(
    (x: number) => {
      const next = Math.round(x / winW);
      if (next !== activeIndexRef.current) setActiveIndex(next);
    },
    [winW],
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
    onMomentumEnd: (e) => {
      runOnJS(onMomentumEnd)(e.contentOffset.x);
    },
  });

  // Tap-driven page change, handed to the pager's own animated scroll so it
  // runs entirely on the native thread — identical motion to a finger swipe.
  // A JS-driven glide was tried here to slow the travel down and read as
  // jittery no matter how the steps were paced, so the platform scroll it is.
  const glideTo = useCallback(
    (index: number) => {
      const target = Math.max(0, Math.min(SLIDES.length - 1, index));
      if (target === activeIndexRef.current) return;
      activeIndexRef.current = target; // a second tap chains from the target
      setActiveIndex(target);
      scrollRef.current?.scrollTo({ x: target * winW, y: 0, animated: true });
    },
    [scrollRef, winW],
  );

  // Pin the opening page once the row has its full width. `contentOffset`
  // alone isn't enough: Android restores a saved scroll position when the
  // activity is recreated (after the process is killed, say), which can drop
  // the pager onto a later slide or between two of them. Re-asserting on the
  // next frame covers a restore that lands after this one.
  const didPlace = useRef(false);
  const handleContentSize = useCallback(
    (contentW: number) => {
      if (didPlace.current || contentW < SLIDES.length * winW - 1) return;
      didPlace.current = true;
      const x = (initialSignInIndex ? SIGNIN_SLIDE : 0) * winW;
      scrollX.value = x;
      scrollRef.current?.scrollTo({ x, y: 0, animated: false });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ x, y: 0, animated: false }));
    },
    [initialSignInIndex, SIGNIN_SLIDE, winW, scrollRef, scrollX],
  );

  const goNext = useCallback(() => {
    const idx = activeIndexRef.current;
    if (idx < SLIDES.length - 1) glideTo(idx + 1);
    else onDone();
  }, [glideTo, onDone]);

  const goPrev = useCallback(() => {
    const idx = activeIndexRef.current;
    if (idx > 0) glideTo(idx - 1);
  }, [glideTo]);

  // Right half of the screen goes forward, left half goes back. On the
  // sign-in slide only the back half does anything (forward is the buttons).
  const handleTap = useCallback(
    (e: GestureResponderEvent) => {
      const x = e.nativeEvent.pageX;
      if (x < winW / 2) goPrev();
      else if (activeIndexRef.current < SLIDES.length - 1) goNext();
    },
    [winW, goPrev, goNext],
  );

  const pages = useMemo(() => {
    // Memoized slides: `activeIndex` is passed as the slide's own index so the
    // prop stays constant — only the `active` boolean flip triggers a re-render.
    const slideFor = (id: string) => {
      if (id === '1')
        return (
          <MemoSplash1
            activeIndex={0}
            active={activeIndex === 0}
            onPress={handleTap}
            scrollX={scrollX}
            pageWidth={winW}
          />
        );
      if (id === '2') return <MemoSplash2 activeIndex={1} active={activeIndex === 1} onPress={handleTap} />;
      if (id === '3') return <MemoSplash3 activeIndex={2} active={activeIndex === 2} onPress={handleTap} />;
      if (id === '4') return <MemoSplash4 activeIndex={3} active={activeIndex === 3} onPress={handleTap} />;
      return <MemoSignIn activeIndex={4} active={activeIndex === 4} onPress={handleTap} />;
    };
    return SLIDES.map((item, index) => (
      <Page key={item.id} index={index} width={winW} height={winH} scrollX={scrollX}>
        {slideFor(item.id)}
      </Page>
    ));
  }, [activeIndex, handleTap, winW, winH, scrollX]);

  return (
    <View style={styles.container}>
      {/* One continuous parallax world behind all five pages. */}
      <WelcomeParallax scrollX={scrollX} pageWidth={winW} pageHeight={winH} pages={SLIDES.length} />

      {/* Plain paging ScrollView: all five pages are mounted up front, so a
          swipe never hits a blank page and — unlike a virtualized list — no
          JavaScript runs while it scrolls. */}
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        contentOffset={{ x: initialSignInIndex ? SIGNIN_SLIDE * winW : 0, y: 0 }}
        onContentSizeChange={handleContentSize}
        decelerationRate="fast"
        bounces={false}
        overScrollMode="never"
        scrollEventThrottle={16}
      >
        {pages}
      </Animated.ScrollView>

      {/* Static top bar — logo (left) and language selector (right) share one
          baseline and stay put while the pages slide underneath. */}
      <View style={styles.topBar} pointerEvents="box-none">
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <PressableScale onPress={() => setShowLanguage(true)} style={styles.languageBtn} hitSlop={8}>
          <Ionicons name="globe-outline" size={sx(18)} color={colors.gray[900]} />
          <Text style={styles.languageCode}>{langPrefix}</Text>
        </PressableScale>
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
  // Inactive dots are ink at 24%: the old accent-secondary #c9e3ff was the
  // same tone as the near ground under them (#cddff9) and disappeared.
  dotInactive: {
    backgroundColor: 'rgba(29, 25, 43, 0.24)',
  },
});
