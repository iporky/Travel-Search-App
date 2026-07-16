import React, { useState } from 'react';
import {
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
const CARD_H = sy(144);

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
          <ProgressBar progress={fillProgress} dashStartProgress={displayProgress} />
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
          <View style={styles.bubbleTail} />
          <Text style={styles.bubbleText}>{question.prompt}</Text>
        </View>
      </View>

      {/* Options area */}
      {layout === 'list'
        ? renderList(question, selected, isMulti, onToggle)
        : layout === 'grid'
        ? renderGrid(question, selected, onToggle)
        : renderPills(question, selected, onToggle)}

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
                {icon ? (
                  <Image
                    source={icon}
                    style={[styles.gridImg, { width: CARD_W * 0.6, height: CARD_H * 0.55 }]}
                    resizeMode="contain"
                  />
                ) : null}
                <Text style={[styles.gridLabel, isSel && styles.gridLabelSel]}>{opt.label}</Text>
                {isSel ? (
                  <View style={styles.gridBadge}>
                    <Ionicons name="checkmark" size={sx(12)} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

// --- Pills (stay duration) ----------------------------------------------------
function renderPills(
  question: OnboardingQuestion,
  selected: string[],
  onToggle: (id: string) => void,
) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.pillContent}
      showsVerticalScrollIndicator={false}
    >
      {question.options.map((opt) => {
        const isSel = selected.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            onPress={() => onToggle(opt.id)}
            style={[styles.pill, isSel && styles.pillSel]}
          >
            <Text style={[styles.pillText, isSel && styles.pillTextSel]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
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
    elevation: 10,
  },
  planeGlow: {
    // Blue halo glow matching the Figma shadow/plane token
    shadowColor: '#527dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 8,
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
    flex: 1,
    backgroundColor: colors.blue[500],
    borderRadius: sx(20),
    borderBottomLeftRadius: sx(20),
    paddingHorizontal: sx(16),
    paddingVertical: sy(12),
  },
  bubbleTail: {
    position: 'absolute',
    left: -sx(6),
    bottom: sy(12),
    width: 0,
    height: 0,
    borderTopWidth: sx(8),
    borderTopColor: 'transparent',
    borderRightWidth: sx(9),
    borderRightColor: colors.blue[500],
    borderBottomWidth: sx(2),
    borderBottomColor: 'transparent',
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
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.blue[100],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sy(10),
    gap: sy(8),
  },
  gridCardSel: {
    borderColor: colors.blue[500],
    backgroundColor: colors.blue[100],
  },
  gridImg: { },
  gridLabel: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: colors.gray[1100],
    textAlign: 'center',
    letterSpacing: -0.14,
  },
  gridLabelSel: { color: colors.blue[600] },
  gridBadge: {
    position: 'absolute',
    top: sx(8),
    right: sx(8),
    width: sx(22),
    height: sx(22),
    borderRadius: radius.full,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Pills
  pillContent: {
    paddingHorizontal: sx(36),
    paddingVertical: sy(16),
    gap: sy(12),
    alignItems: 'center',
  },
  pill: {
    width: W - sx(72),
    height: sy(56),
    borderRadius: radius.full,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.blue[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSel: {
    backgroundColor: colors.blue[500],
    borderColor: colors.blue[500],
  },
  pillText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    color: colors.gray[1000],
    letterSpacing: -0.16,
  },
  pillTextSel: { color: '#fff' },

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
