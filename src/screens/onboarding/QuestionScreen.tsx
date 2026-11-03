import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PressableScale as Pressable } from '../../components/PressableScale';
import Animated, {
  Extrapolation,
  interpolate,
  SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { colors, radius } from '../../theme/tokens';
import { OnboardingQuestion } from '../../api/onboarding';
import { onboardingSource } from '../../assets/onboardingAssets';
import { ONBOARDING_ICON_SOURCES, AVATAR_SOURCE } from '../../assets/onboardingIcons';
import { LottieEdgeFeather, LottieHalo } from '../../components/LottieEdgeFeather';
import { PressableScale } from '../../components/PressableScale';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

// Round mascot bird — question-asking avatar in the bubble. 512px PNG
// (AVATAR_SOURCE) rendered with native <Image>.

const BACK_BTN = onboardingSource(
  require('../../../assets/onboarding/chevron-left.png') as ImageSourcePropType,
  'chevron-left',
);


// Questionnaire option icons are real .svg files under
// assets/onboarding/questionnaire/, imported as react-native-svg components
// (see onboardingIcons.ts).

const CARD_GAP = sx(12);
const CARD_W = (W - sx(40) - CARD_GAP) / 2;
// Square-ish cards per Figma: big icon on top, label underneath.
const CARD_H = CARD_W;

function chunk<T>(arr: T[], n: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += n) res.push(arr.slice(i, i + n));
  return res;
}

interface Props {
  question: OnboardingQuestion;
  selected: string[];
  onToggle: (optionId: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  canGoBack: boolean;
}

export function QuestionScreen({
  question,
  selected,
  onToggle,
  onConfirm,
  onBack,
  canGoBack,
}: Props) {
  const layout = question.layout ?? 'list';
  const isMulti = question.type === 'multi';
  const canConfirm = selected.length > 0;
  // Each step mounts a fresh page (the previous one stays up while it fades
  // out), so the bird Lottie decodes anew here. Keep it invisible until its
  // frames are ready and fade it in, rather than letting it pop mid-transition.
  const bird = useSharedValue(0);
  const birdShown = useRef(false);
  const revealBird = () => {
    if (birdShown.current) return;
    birdShown.current = true;
    bird.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) });
  };
  useEffect(() => {
    // Should the load callback not arrive, still show the bird.
    const fallback = setTimeout(revealBird, 900);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const birdStyle = useAnimatedStyle(() => ({ opacity: bird.value }));

  return (
    <View style={styles.root}>
      {/* Header: back button only — the step progress indicator was removed;
          a new loader will take its place. */}
      <View style={styles.header}>
        <PressableScale
          onPress={onBack}
          disabled={!canGoBack}
          hitSlop={8}
          style={[styles.backBtnContainer, !canGoBack && { display: 'none' }]}
        >
          <Image source={BACK_BTN} style={styles.backBtn} resizeMode="contain" />
        </PressableScale>
      </View>

      {/* Question bubble — walking-bird Lottie on the left (Onboarding_Purpose
          12320:52339 "loading bird", 79×62; frames carry their own bg). */}
      <View style={styles.bubbleRow}>
        {/* Loading bird beside the question. Its frames carry a flat
            #eaf4fd background; the feather dissolves that into the screen's
            gradient at this height (~#ecf5ff) — the designer's blur layer. */}
        <View style={styles.birdLottieBox}>
          {/* Soft halo under the frames' own #eaf4fd — no edge anywhere. */}
          <LottieHalo color="#eaf4fd" width={sx(79)} height={sx(62)} spread={sx(18)} />
          <Animated.View style={[styles.birdLottie, birdStyle]}>
            <LottieView
              source={require('../../../assets/lottie/question-bird.json')}
              style={styles.birdLottie}
              autoPlay
              loop
              resizeMode="cover"
              onAnimationLoaded={revealBird}
            />
          </Animated.View>
          <LottieEdgeFeather color="#eaf4fd" top={0.1} bottom={0.12} side={0.1} />
        </View>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{question.prompt}</Text>
        </View>
      </View>

      {/* Options area */}
      {layout === 'list'
        ? renderList(question, selected, isMulti, onToggle)
        : layout === 'grid'
        ? renderGrid(question, selected, onToggle)
        : <WheelPicker question={question} selected={selected} onToggle={onToggle} />}

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        {question.helperText ? (
          <Text style={styles.helperText}>{question.helperText}</Text>
        ) : null}
        <PressableScale
          onPress={onConfirm}
          disabled={!canConfirm}
          style={[styles.cta, canConfirm ? styles.ctaOn : styles.ctaOff]}
        >
          <Text style={[styles.ctaText, canConfirm ? styles.ctaTextOn : styles.ctaTextOff]}>
            Confirm
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

// --- List (purpose / interests) -----------------------------------------------
function renderList(
  question: OnboardingQuestion,
  selected: string[],
  isMulti: boolean,
  onToggle: (id: string) => void,
) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    >
      {question.options.map((opt) => {
        const isSel = selected.includes(opt.id);
        const iconSrc = opt.iconAsset ? ONBOARDING_ICON_SOURCES[opt.iconAsset] : undefined;
        return (
          <PressableScale
            key={opt.id}
            onPress={() => onToggle(opt.id)}
            style={[styles.listRow, isSel && styles.listRowSel]}
          >
            {iconSrc ? (
              <View style={styles.listIconWrap}>
                <Image source={iconSrc} style={styles.listIcon} resizeMode="contain" />
              </View>
            ) : null}
            <View style={styles.listTextCol}>
              <Text style={[styles.listLabel, isSel && styles.listLabelSel]}>{opt.label}</Text>
              {opt.subtitle ? (
                <Text style={styles.listSubtitle}>{opt.subtitle}</Text>
              ) : null}
            </View>
            {isMulti ? (
              <View style={[styles.checkbox, isSel && styles.checkboxOn]}>
                {isSel ? <Ionicons name="checkmark" size={sx(14)} color="#fff" /> : null}
              </View>
            ) : isSel ? (
              <Ionicons name="checkmark-circle" size={sx(22)} color={colors.blue[500]} />
            ) : null}
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

// --- Grid (occupation) --------------------------------------------------------
function renderGrid(
  question: OnboardingQuestion,
  selected: string[],
  onToggle: (id: string) => void,
) {
  const rows = chunk(question.options, 2);
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.gridContent}
      showsVerticalScrollIndicator={false}
    >
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((opt) => {
            const isSel = selected.includes(opt.id);
            const iconSrc = opt.iconAsset ? ONBOARDING_ICON_SOURCES[opt.iconAsset] : undefined;
            return (
              <PressableScale
                key={opt.id}
                onPress={() => onToggle(opt.id)}
                style={[
                  styles.gridCard,
                  isSel && styles.gridCardSel,
                  { width: CARD_W, height: CARD_H },
                ]}
              >
                <View style={styles.gridIconWrap}>
                  {iconSrc ? (
                    // contentFit contain preserves each icon's aspect ratio.
                    <Image
                      source={iconSrc}
                      style={{ width: CARD_W * 0.52, height: CARD_W * 0.52 }}
                      resizeMode="contain"
                    />
                  ) : null}
                  {/* Check badge sits on the icon's top-right, like the Figma */}
                  {isSel ? (
                    <View style={styles.gridBadge}>
                      <Ionicons name="checkmark" size={sx(13)} color="#fff" />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.gridLabel}>{opt.label}</Text>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

// --- Wheel / tumbler picker (stay duration) ------------------------------------
// The centered row is the selection; neighbours fade, shrink and tilt away like
// a rotating drum. Snap-scrolling keeps a row locked in the centre.
const WHEEL_ITEM_H = sy(64);
const WHEEL_VISIBLE = 5; // odd → one exact centre row

/** One drum row: fades, shrinks and tilts away from the centre as the wheel
    scrolls — a worklet on the scroll offset, so it tracks the finger on the
    UI thread. */
function WheelRow({
  index,
  scrollY,
  selected,
  label,
  onPress,
}: {
  index: number;
  scrollY: SharedValue<number>;
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const inputRange = [
      (index - 2) * WHEEL_ITEM_H,
      (index - 1) * WHEEL_ITEM_H,
      index * WHEEL_ITEM_H,
      (index + 1) * WHEEL_ITEM_H,
      (index + 2) * WHEEL_ITEM_H,
    ];
    return {
      opacity: interpolate(scrollY.value, inputRange, [0.16, 0.42, 1, 0.42, 0.16], Extrapolation.CLAMP),
      transform: [
        { perspective: 800 },
        { rotateX: `${interpolate(scrollY.value, inputRange, [42, 24, 0, -24, -42], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(scrollY.value, inputRange, [0.8, 0.9, 1, 0.9, 0.8], Extrapolation.CLAMP) },
      ],
    };
  });
  return (
    <Animated.View style={[styles.wheelItem, style]}>
      <PressableScale style={styles.wheelItemPress} onPress={onPress}>
        <Text style={[styles.wheelText, selected && styles.wheelTextSel]}>{label}</Text>
      </PressableScale>
    </Animated.View>
  );
}

function WheelPicker({
  question,
  selected,
  onToggle,
}: {
  question: OnboardingQuestion;
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const options = question.options;
  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const onWheelScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  useEffect(() => {
    // The wheel always has a value: preselect the initial centre row and jump
    // the scroll position to any previously chosen option.
    const initialIndex = Math.max(0, options.findIndex((o) => selected.includes(o.id)));
    if (selected.length === 0 && options.length > 0) {
      onToggleRef.current(options[0].id);
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: initialIndex * WHEEL_ITEM_H, animated: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.key]);

  const settleOnIndex = (offsetY: number) => {
    const idx = Math.min(options.length - 1, Math.max(0, Math.round(offsetY / WHEEL_ITEM_H)));
    const opt = options[idx];
    if (opt && !selected.includes(opt.id)) onToggle(opt.id);
  };

  return (
    <View style={styles.wheelOuter}>
      <View style={styles.wheelWrap}>
        {/* Static highlight pill behind the centre row */}
        <View style={styles.wheelCenterPill} pointerEvents="none" />
        <Animated.ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_H}
          decelerationRate="fast"
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{ paddingVertical: WHEEL_ITEM_H * ((WHEEL_VISIBLE - 1) / 2) }}
          onScroll={onWheelScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => settleOnIndex(e.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(e) => settleOnIndex(e.nativeEvent.contentOffset.y)}
          style={{ height: WHEEL_ITEM_H * WHEEL_VISIBLE }}
        >
          {options.map((opt, i) => (
            <WheelRow
              key={opt.id}
              index={i}
              scrollY={scrollY}
              selected={selected.includes(opt.id)}
              label={opt.label}
              onPress={() => {
                scrollRef.current?.scrollTo({ y: i * WHEEL_ITEM_H, animated: true });
                onToggle(opt.id);
              }}
            />
          ))}
        </Animated.ScrollView>
      </View>
    </View>
  );
}

// --- Styles -------------------------------------------------------------------
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(12),
    height: sy(48),
    paddingHorizontal: sx(20),
    marginTop: sy(10),
  },
  backBtn: {
    width: sx(24),
    height: sx(24),
    alignItems: 'center',
    justifyContent: 'center',
  },

  backBtnContainer: {
    width: sx(32),
    height: sx(32),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue[150],
    borderRadius: radius.full,
  },


  // Question bubble
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sx(8),
    paddingHorizontal: sx(20),
    paddingTop: sy(16),
    paddingBottom: sy(12),
  },
  birdAvatar: { width: sx(56), height: sx(56) },
  // Loading-bird Lottie slot (79×62 design px, 12469:86055). The source is
  // 720×554 — the same 1.27:1 the slot is — so "cover" fills it with no crop
  // worth speaking of.
  birdLottieBox: { width: sx(79), height: sx(62) },
  birdLottie: { width: '100%', height: '100%' },
  bubble: {
    // Hug the text: shrink to content, wrap only when it would exceed the row.
    flexShrink: 1,
    alignSelf: 'flex-start',
    backgroundColor: colors.blue[500],
    // Triangle tail removed, but keep the squared bottom-left corner.
    borderTopLeftRadius: sx(20),
    borderTopRightRadius: sx(20),
    borderBottomRightRadius: sx(20),
    borderBottomLeftRadius: sx(4),
    paddingHorizontal: sx(16),
    paddingVertical: sy(12),
  },
  bubbleText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    lineHeight: sy(22),
    color: '#fff',
    letterSpacing: -0.16,
  },

  // List
  scroll: { flex: 1 },
  listContent: {
    paddingHorizontal: sx(20),
    paddingVertical: sy(4),
    gap: sy(10),
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(12),
    width: W - sx(40),
    minHeight: sy(64),
    paddingHorizontal: sx(16),
    paddingVertical: sy(8),
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  listRowSel: {
    borderColor: colors.blue[500],
    backgroundColor: colors.blue[100],
  },
  listIconWrap: {
    width: sx(40),
    height: sx(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIcon: { width: sx(36), height: sx(36) },
  listTextCol: { flex: 1 },
  listLabel: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    lineHeight: sy(22),
    color: colors.gray[1300],
    letterSpacing: -0.16,
  },
  listLabelSel: { color: colors.gray[1300] },
  listSubtitle: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(13),
    lineHeight: sy(18),
    color: colors.gray[900],
    letterSpacing: -0.13,
    marginTop: sy(1),
  },
  checkbox: {
    width: sx(22),
    height: sx(22),
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.blue[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: colors.blue[500],
    borderColor: colors.blue[500],
  },

  // Grid
  gridContent: {
    paddingHorizontal: sx(20),
    paddingTop: sy(4),
    paddingBottom: sy(8),
    gap: sy(12),
  },
  gridRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  gridCard: {
    backgroundColor: '#fff',
    borderRadius: sx(18),
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sy(14),
    gap: sy(12),
  },
  gridCardSel: {
    borderColor: colors.blue[500],
    backgroundColor: '#eaf2ff',
  },
  gridIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(15),
    lineHeight: sy(21),
    color: '#1d192b',
    textAlign: 'center',
    letterSpacing: -0.15,
  },
  gridBadge: {
    position: 'absolute',
    top: -sx(4),
    right: -sx(16),
    width: sx(24),
    height: sx(24),
    borderRadius: radius.full,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Wheel picker
  wheelOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelWrap: {
    width: W - sx(48),
    justifyContent: 'center',
  },
  wheelCenterPill: {
    position: 'absolute',
    top: WHEEL_ITEM_H * ((WHEEL_VISIBLE - 1) / 2) + sy(4),
    left: sx(8),
    right: sx(8),
    height: WHEEL_ITEM_H - sy(8),
    borderRadius: radius.full,
    backgroundColor: '#e2eeff',
  },
  wheelItem: {
    height: WHEEL_ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelItemPress: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  wheelText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(17),
    color: colors.gray[1000],
    letterSpacing: -0.17,
  },
  wheelTextSel: {
    fontFamily: 'NationalPark_700Bold',
    color: '#1d192b',
  },

  // Bottom bar
  bottomBar: {
    alignItems: 'center',
    paddingBottom: sy(8),
    paddingTop: sy(4),
  },
  helperText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: colors.gray[700],
    textAlign: 'center',
    letterSpacing: -0.14,
    marginBottom: sy(4),
  },
  cta: {
    height: sy(56),
    width: W - sx(40),
    borderRadius: sx(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sy(8),
  },
  ctaOn: { backgroundColor: colors.blue[500] },
  ctaOff: { backgroundColor: colors.blue[100] },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    letterSpacing: -0.16,
  },
  ctaTextOn: { color: '#fff' },
  ctaTextOff: { color: colors.gray[700] },
});
