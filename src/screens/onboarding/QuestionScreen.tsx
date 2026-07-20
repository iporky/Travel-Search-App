import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/tokens';
import { OnboardingQuestion } from '../../api/onboarding';
import { onboardingSource } from '../../assets/onboardingAssets';
import ProgressBar from '../../components/ProgressBar';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

// Round mascot bird — used as the question-asking avatar in the bubble
const BIRD_AVATAR = onboardingSource(
  require('../../../assets/onboarding/avatar_container.png') as ImageSourcePropType,
  'avatar_container',
);
const PLANE = onboardingSource(
  require('../../../assets/onboarding/airplane.png') as ImageSourcePropType,
  'airplane',
);

const BACK_BTN = onboardingSource(
  require('../../../assets/onboarding/chevron-left.png') as ImageSourcePropType,
  'chevron-left',
);


const ICONS: Record<string, ImageSourcePropType> = {
  name_passport_4x:        onboardingSource(require('../../../assets/onboarding/name_passport_4x.png'), 'name_passport_4x'),
  name_korea_4x:           onboardingSource(require('../../../assets/onboarding/name_korea_4x.png'), 'name_korea_4x'),
  name_konnect_4x:         onboardingSource(require('../../../assets/onboarding/name_konnect_4x.png'), 'name_konnect_4x'),
  name_student_4x:         onboardingSource(require('../../../assets/onboarding/name_student_4x.png'), 'name_student_4x'),
  name_employee_4x:        onboardingSource(require('../../../assets/onboarding/name_employee_4x.png'), 'name_employee_4x'),
  name_teacher_4x:         onboardingSource(require('../../../assets/onboarding/name_teacher_4x.png'), 'name_teacher_4x'),
  name_entrepreneur_4x:    onboardingSource(require('../../../assets/onboarding/name_entrepreneur_4x.png'), 'name_entrepreneur_4x'),
  name_freelancer_4x:      onboardingSource(require('../../../assets/onboarding/name_freelancer_4x.png'), 'name_freelancer_4x'),
  name_vacation_4x:        onboardingSource(require('../../../assets/onboarding/name_vacation_4x.png'), 'name_vacation_4x'),
  name_food_4x:            onboardingSource(require('../../../assets/onboarding/name_food_4x.png'), 'name_food_4x'),
  name_shopping_4x:        onboardingSource(require('../../../assets/onboarding/name_shopping_4x.png'), 'name_shopping_4x'),
  name_culture_4x:         onboardingSource(require('../../../assets/onboarding/name_culture_4x.png'), 'name_culture_4x'),
  name_nightlife_4x:       onboardingSource(require('../../../assets/onboarding/name_nightlife_4x.png'), 'name_nightlife_4x'),
  name_nature_4x:          onboardingSource(require('../../../assets/onboarding/name_nature_4x.png'), 'name_nature_4x'),
  name_socialnetworking_4x:onboardingSource(require('../../../assets/onboarding/name_socialnetworking_4x.png'), 'name_socialnetworking_4x'),
  name_solo_4x:            onboardingSource(require('../../../assets/onboarding/name_solo_4x.png'), 'name_solo_4x'),
  name_partner_4x:         onboardingSource(require('../../../assets/onboarding/name_partner_4x.png'), 'name_partner_4x'),
  name_friend_4x:          onboardingSource(require('../../../assets/onboarding/name_friend_4x.png'), 'name_friend_4x'),
  name_group_4x:           onboardingSource(require('../../../assets/onboarding/name_group_4x.png'), 'name_group_4x'),
  name_home_4x:            onboardingSource(require('../../../assets/onboarding/name_home_4x.png'), 'name_home_4x'),
  name_busan_4x:           onboardingSource(require('../../../assets/cities/name_busan_4x.png'), 'name_busan_4x'),
  name_seoul_4x:           onboardingSource(require('../../../assets/cities/name_seoul_4x.png'), 'name_seoul_4x'),
  name_jeju_4x:            onboardingSource(require('../../../assets/cities/name_jeju_4x.png'), 'name_jeju_4x'),
  name_gyeongju_4x:        onboardingSource(require('../../../assets/cities/name_gyeongju_4x.png'), 'name_gyeongju_4x'),
  name_incheon_4x:         onboardingSource(require('../../../assets/cities/name_incheon_4x.png'), 'name_incheon_4x'),
  name_suwon_4x:           onboardingSource(require('../../../assets/cities/name_suwon_4x.png'), 'name_suwon_4x'),
  name_gangneung_4x:       onboardingSource(require('../../../assets/cities/name_gangneung_4x.png'), 'name_gangneung_4x'),
  name_yeosu_4x:           onboardingSource(require('../../../assets/cities/name_yeosu_4x.png'), 'name_yeosu_4x'),
  name_jeonju_4x:          onboardingSource(require('../../../assets/cities/name_jeonju_4x.png'), 'name_jeonju_4x'),
  name_daegu_4x:           onboardingSource(require('../../../assets/cities/name_daegu_4x.png'), 'name_daegu_4x'),
};

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
  progress: number;
  canGoBack: boolean;
}

export function QuestionScreen({
  question,
  selected,
  onToggle,
  onConfirm,
  onBack,
  progress,
  canGoBack,
}: Props) {
  const layout = question.layout ?? 'list';
  const isMulti = question.type === 'multi';
  const canConfirm = selected.length > 0;
  const [trackWidth, setTrackWidth] = useState(0);
  const displayProgress = Math.max(0.08, Math.min(0.96, progress));
  const pct = `${displayProgress * 100}%` as `${number}%`;
  const fillTouchOffset = sx(6);
  const touchProgress = trackWidth > 0 ? fillTouchOffset / trackWidth : 0;
  const fillProgress = Math.min(0.96, displayProgress + touchProgress);

  return (
    <View style={styles.root}>
      {/* Header: back + progress bar */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          disabled={!canGoBack}
          hitSlop={8}
          style={[styles.backBtnContainer, !canGoBack && { display: 'none' }]}
        >
          <Image source={BACK_BTN} style={styles.backBtn} resizeMode="contain" />
        </Pressable>

        <View
          style={styles.progressTrack}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        >
          <ProgressBar progress={fillProgress} dashStartProgress={displayProgress} width={trackWidth} />
          <View style={[styles.planeWrap, { left: pct }]} pointerEvents="none">
            <View style={styles.planeGlow}>
              <Image source={PLANE} style={styles.planeImg} />
            </View>
          </View>
        </View>
      </View>

      {/* Question bubble — mascot bird on the left */}
      <View style={styles.bubbleRow}>
        <Image source={BIRD_AVATAR} style={styles.birdAvatar} resizeMode="contain" />
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
        <Pressable
          onPress={onConfirm}
          disabled={!canConfirm}
          style={[styles.cta, canConfirm ? styles.ctaOn : styles.ctaOff]}
        >
          <Text style={[styles.ctaText, canConfirm ? styles.ctaTextOn : styles.ctaTextOff]}>
            Confirm
          </Text>
        </Pressable>
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
        const icon = opt.iconAsset ? ICONS[opt.iconAsset] : undefined;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onToggle(opt.id)}
            style={[styles.listRow, isSel && styles.listRowSel]}
          >
            {icon ? (
              <View style={styles.listIconWrap}>
                <Image source={icon} style={styles.listIcon} resizeMode="contain" />
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
          </Pressable>
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
            const icon = opt.iconAsset ? ICONS[opt.iconAsset] : undefined;
            return (
              <Pressable
                key={opt.id}
                onPress={() => onToggle(opt.id)}
                style={[
                  styles.gridCard,
                  isSel && styles.gridCardSel,
                  { width: CARD_W, height: CARD_H },
                ]}
              >
                <View style={styles.gridIconWrap}>
                  {icon ? (
                    <Image
                      source={icon}
                      style={{ width: CARD_W * 0.5, height: CARD_W * 0.45 }}
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
              </Pressable>
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
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
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
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => settleOnIndex(e.nativeEvent.contentOffset.y)}
          onScrollEndDrag={(e) => settleOnIndex(e.nativeEvent.contentOffset.y)}
          style={{ height: WHEEL_ITEM_H * WHEEL_VISIBLE }}
        >
          {options.map((opt, i) => {
            const inputRange = [
              (i - 2) * WHEEL_ITEM_H,
              (i - 1) * WHEEL_ITEM_H,
              i * WHEEL_ITEM_H,
              (i + 1) * WHEEL_ITEM_H,
              (i + 2) * WHEEL_ITEM_H,
            ];
            const opacity = scrollY.interpolate({
              inputRange,
              outputRange: [0.16, 0.42, 1, 0.42, 0.16],
              extrapolate: 'clamp',
            });
            const scale = scrollY.interpolate({
              inputRange,
              outputRange: [0.8, 0.9, 1, 0.9, 0.8],
              extrapolate: 'clamp',
            });
            const rotateX = scrollY.interpolate({
              inputRange,
              outputRange: ['42deg', '24deg', '0deg', '-24deg', '-42deg'],
              extrapolate: 'clamp',
            });
            const isSel = selected.includes(opt.id);
            return (
              <Animated.View
                key={opt.id}
                style={[
                  styles.wheelItem,
                  { opacity, transform: [{ perspective: 800 }, { rotateX }, { scale }] },
                ]}
              >
                <Pressable
                  style={styles.wheelItemPress}
                  onPress={() => {
                    scrollRef.current?.scrollTo({ y: i * WHEEL_ITEM_H, animated: true });
                    onToggle(opt.id);
                  }}
                >
                  <Text style={[styles.wheelText, isSel && styles.wheelTextSel]}>
                    {opt.label}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
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

  progressTrack: {
    flex: 1,
    height: sy(8),
    borderRadius: radius.full,
    overflow: 'visible',
    justifyContent: 'center',
    position: 'relative',
  },
  planeWrap: {
    position: 'absolute',
    zIndex: 4,
  },
  planeGlow: {
    // Blue halo glow (iOS only). On Android `elevation` is intentionally omitted:
    // it casts a rectangular shadow around the image bounds, which looked like a
    // box behind the plane. zIndex alone keeps the plane above the dashes.
    shadowColor: '#527dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  planeImg: {
    width: sx(36),
    height: sy(64),
    backgroundColor: 'transparent',
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
