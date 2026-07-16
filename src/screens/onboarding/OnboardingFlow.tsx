import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FLOW_A_QUESTIONS,
  FLOW_D_QUESTIONS,
  FLOW_E_QUESTIONS,
  INTERESTS_QUESTION,
  OCCUPATION_QUESTION,
  OnboardingQuestion,
  PURPOSE_QUESTION,
  STAY_LENGTH_QUESTION,
  getQuestionsForPurpose,
  submitOnboarding
} from '../../api/onboarding';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/tokens';
import { onboardingSource } from '../../assets/onboardingAssets';
import { QuestionScreen } from './QuestionScreen';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const BIRD = onboardingSource(
  require('../../../assets/mascot/bird-hero.png') as ImageSourcePropType,
  'bird-hero',
);
const BIRD_AVATAR_IMG = onboardingSource(
  require('../../../assets/onboarding/avatar_container.png') as ImageSourcePropType,
  'avatar_container',
);

const BACK_BTN_IMG = onboardingSource(
  require('../../../assets/onboarding/chevron-left.png') as ImageSourcePropType,
  'chevron-left',
);


interface Props {
  /** Called when the user finishes onboarding and taps "Let's Konnect!". */
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  // 'intro' shows a brief "Let's get you set up" transition so the questions
  // don't appear abruptly right after sign-in.
  const [phase, setPhase] = useState<'intro' | 'questions' | 'welcome'>('intro');
  // Start with Flow A default; branch after purpose is answered
  const [questionList, setQuestionList] = useState<OnboardingQuestion[]>(FLOW_A_QUESTIONS);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const total = questionList.length;
  const current = questionList[step];

  const toggleOption = (optionId: string) => {
    if (!current) return;
    setAnswers((prev) => {
      const existing = prev[current.key] ?? [];
      if (current.type === 'single') return { ...prev, [current.key]: [optionId] };
      const next = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];
      return { ...prev, [current.key]: next };
    });
  };

  // Sync the answers-so-far to the backend. Fire-and-forget: the flow never
  // blocks on it, and a failed sync just logs a warning.
  const syncAnswers = (currentAnswers: Record<string, string[]>) => {
    submitOnboarding({ answers: currentAnswers, preferredLanguage: language.code }).catch(
      (e) => console.warn('[Onboarding] sync failed', e?.message ?? e),
    );
  };

  const handleConfirm = () => {
    // Every Confirm press pushes the freshest partial profile to the backend.
    syncAnswers(answers);

    // After purpose question, choose the branching flow.
    if (current.key === 'purpose') {
      const purposeId = answers['purpose']?.[0] ?? '';
      setQuestionList(getQuestionsForPurpose(purposeId));
      setStep(1);
      return;
    }

    // After traveling_with: branch into Flow D (solo/partner) or Flow E (family/friends/group).
    if (current.key === 'traveling_with') {
      const companion = answers['traveling_with']?.[0] ?? '';
      if (['family', 'friends', 'group'].includes(companion)) {
        setQuestionList(FLOW_E_QUESTIONS);
      } else {
        setQuestionList(FLOW_D_QUESTIONS);
      }
      setStep(step + 1);
      return;
    }

    // After occupation: if user picked Vacation, insert stay-length question
    if (current.key === 'occupation') {
      const occupationId = answers['occupation']?.[0] ?? '';
      if (occupationId === 'vacation') {
        setQuestionList([PURPOSE_QUESTION, OCCUPATION_QUESTION, STAY_LENGTH_QUESTION, INTERESTS_QUESTION]);
      } else {
        setQuestionList([PURPOSE_QUESTION, OCCUPATION_QUESTION, INTERESTS_QUESTION]);
      }
      setStep(step + 1);
      return;
    }

    if (step < total - 1) {
      setStep((s) => s + 1);
      return;
    }

    // Last question — answers were already synced above; show welcome.
    setPhase('welcome');
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  // No profile screen anymore, so progress is based purely on the question count.
  const progress = (step + 0.5) / total;

  let body: React.ReactNode;
  if (phase === 'intro') {
    body = <SetupIntro onDone={() => setPhase('questions')} />;
  } else if (phase === 'welcome') {
    body = <Welcome name={user?.name || 'Traveler'} onContinue={onComplete} />;
  } else if (current?.layout === 'counter') {
    // NumberOfPeople stepper — a bottom-sheet overlay on top of the previous
    // question (per Figma), not a standalone screen.
    const prevQuestion = step > 0 ? questionList[step - 1] : null;
    body = (
      <>
        {prevQuestion ? (
          <QuestionScreen
            question={prevQuestion}
            selected={answers[prevQuestion.key] ?? []}
            onToggle={() => {}}
            onConfirm={() => {}}
            onBack={() => {}}
            progress={progress}
            canGoBack={false}
          />
        ) : null}
        <CounterOverlay
          onClose={handleBack}
          onConfirm={(value) => {
            const next = { ...answers, [current.key]: [String(value)] };
            setAnswers(next);
            syncAnswers(next);
            if (step < total - 1) setStep((s) => s + 1);
            else setPhase('welcome');
          }}
        />
      </>
    );
  } else if (current) {
    body = (
      <QuestionScreen
        question={current}
        selected={answers[current.key] ?? []}
        onToggle={toggleOption}
        onConfirm={handleConfirm}
        onBack={handleBack}
        progress={progress}
        canGoBack={step > 0}
      />
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#eaf4ff', '#f2f9ff']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {body}
      </SafeAreaView>
    </View>
  );
}

// ─── "Let's get you set up" intro transition ─────────────────────────────────
function SetupIntro({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      // Fade + rise + settle in
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rise, {
          toValue: 0,
          duration: 550,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      ]),
      // Hold long enough to read
      Animated.delay(1400),
      // Fade out, then hand off to the questions
      Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={introStyles.root}>
      <Animated.View
        style={[introStyles.center, { opacity, transform: [{ translateY: rise }, { scale }] }]}
      >
        <Image source={BIRD} style={introStyles.bird} resizeMode="contain" />
        <Text style={introStyles.title}>{t('onboarding.setupTitle')}</Text>
        <Text style={introStyles.subtitle}>{t('onboarding.setupSubtitle')}</Text>
      </Animated.View>
    </View>
  );
}

const introStyles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', paddingHorizontal: sx(32), gap: sy(14) },
  bird: { width: sx(150), height: sy(118), marginBottom: sy(6) },
  title: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(28),
    color: '#1d192b',
    letterSpacing: -0.8,
    lineHeight: sy(36),
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(15),
    color: '#657586',
    textAlign: 'center',
    lineHeight: sy(22),
    letterSpacing: -0.15,
  },
});

// ─── Number-of-people bottom-sheet overlay ───────────────────────────────────
function CounterOverlay({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (value: number) => void;
}) {
  const { t } = useTranslation();
  const [count, setCount] = useState(2);
  // With edge-to-edge the modal window draws under the system navigation bar —
  // pad the sheet so the Confirm button clears it.
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {/* Backdrop tap = go back to the previous question */}
      <Pressable style={sheet.backdrop} onPress={onClose}>
        <Pressable
          style={[sheet.sheet, { paddingBottom: sy(28) + Math.max(insets.bottom, sy(12)) }]}
          onPress={() => {}}
        >
          <Text style={sheet.title}>{t('onboarding.numberOfPeople')}</Text>
          <View style={sheet.row}>
            <Pressable
              onPress={() => setCount((c) => Math.max(2, c - 1))}
              style={sheet.stepBtn}
              hitSlop={12}
            >
              <Text style={sheet.stepBtnText}>−</Text>
            </Pressable>
            <Text style={sheet.value}>{count}</Text>
            <Pressable onPress={() => setCount((c) => c + 1)} style={sheet.stepBtn} hitSlop={12}>
              <Text style={sheet.stepBtnText}>+</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => onConfirm(count)} style={sheet.cta}>
            <Text style={sheet.ctaText}>{t('common.confirm')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 26, 96, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: sx(28),
    borderTopRightRadius: sx(28),
    paddingTop: sy(26),
    paddingBottom: sy(28),
    paddingHorizontal: sx(20),
    alignItems: 'center',
    gap: sy(18),
  },
  title: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(20),
    color: '#1d192b',
    letterSpacing: -0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(28),
  },
  stepBtn: {
    width: sx(44),
    height: sx(44),
    borderRadius: 999,
    backgroundColor: '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(24),
    color: '#8ca0b7',
    lineHeight: sx(28),
  },
  value: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(44),
    color: '#1d192b',
    letterSpacing: -0.88,
    minWidth: sx(84),
    textAlign: 'center',
  },
  cta: {
    alignSelf: 'stretch',
    height: sy(56),
    borderRadius: 999,
    backgroundColor: '#527dff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sy(4),
  },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    color: '#f2f9ff',
    letterSpacing: -0.16,
  },
});

// ─── Number-of-people counter screen (unused — replaced by CounterOverlay) ────
function CounterScreen({
  question,
  progress,
  canGoBack,
  onBack,
  onConfirm,
}: {
  question: OnboardingQuestion;
  progress: number;
  canGoBack: boolean;
  onBack: () => void;
  onConfirm: (value: number) => void;
}) {
  const { t } = useTranslation();
  const [count, setCount] = useState(2);
  const [trackWidth, setTrackWidth] = useState(0);
  const displayProgress = Math.max(0.08, Math.min(0.96, progress));
  const pct = `${displayProgress * 100}%` as `${number}%`;
  const fillTouchOffset = sx(5);
  const touchProgress = trackWidth > 0 ? fillTouchOffset / trackWidth : 0;
  const fillProgress = Math.min(0.96, displayProgress + touchProgress);

  return (
    <View style={ctr.root}>
      {/* Header */}
      <View style={ctr.header}>
        <Pressable
          onPress={onBack}
          disabled={!canGoBack}
          hitSlop={8}
          style={[ctr.backBtn, !canGoBack && { opacity: 0 }]}
        >
          <Image source={BACK_BTN_IMG} style={ctr.backBtnImg} resizeMode="contain" />
        </Pressable>
      </View>

      {/* Question bubble */}
      <View style={ctr.bubbleRow}>
        <Image source={BIRD_AVATAR_IMG} style={ctr.birdAvatar} resizeMode="contain" />
        <View style={ctr.bubble}>
          <View style={ctr.bubbleTail} />
          <Text style={ctr.bubbleText}>{question.prompt}</Text>
        </View>
      </View>

      {/* Stepper */}
      <View style={ctr.stepperOuter}>
        <View style={ctr.stepperCard}>
          <Text style={ctr.stepperTitle}>{t('onboarding.numberOfPeople')}</Text>
          <View style={ctr.stepperRow}>
            <Pressable
              onPress={() => setCount((c) => Math.max(2, c - 1))}
              style={ctr.stepperBtn}
              hitSlop={12}
            >
              <Text style={ctr.stepperBtnText}>−</Text>
            </Pressable>
            <Text style={ctr.stepperValue}>{count}</Text>
            <Pressable
              onPress={() => setCount((c) => c + 1)}
              style={ctr.stepperBtn}
              hitSlop={12}
            >
              <Text style={ctr.stepperBtnText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* CTA */}
      <View style={ctr.bottomBar}>
        <Pressable onPress={() => onConfirm(count)} style={ctr.cta}>
          <Text style={ctr.ctaText}>{t('common.confirm')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const ctr = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(12),
    height: sy(48),
    paddingHorizontal: sx(20),
    marginTop: sy(10),
  },
  backBtn: {
    width: sx(32),
    height: sx(32),
    borderRadius: 999,
    backgroundColor: '#d8ecfb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnImg: {
    width: sx(24),
    height: sx(24),
  },
  progressTrack: {
    flex: 1,
    height: sy(8),
    borderRadius: sx(999),
    backgroundColor: '#c9e3ff',
    overflow: 'visible',
    justifyContent: 'center',
  },
  progressFill: {
    height: sy(8),
    borderRadius: sx(999),
    overflow: 'hidden',
  },
  planeWrap: {
    position: 'absolute',
    zIndex: 4,
    elevation: 10,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sx(8),
    paddingHorizontal: sx(20),
    paddingTop: sy(12),
    paddingBottom: sy(12),
  },
  birdAvatar: { width: sx(56), height: sx(56) },
  bubble: {
    flex: 1,
    backgroundColor: '#527dff',
    borderRadius: sx(20),
    borderBottomLeftRadius: sx(20),
    paddingHorizontal: sx(16),
    paddingVertical: sy(12),
  },
  bubbleTail: {
    position: 'absolute',
    left: sx(6),
    bottom: sy(12),
    width: 0,
    height: 0,
    borderTopWidth: sx(8),
    borderTopColor: 'transparent',
    borderRightWidth: sx(9),
    borderRightColor: '#527dff',
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
  stepperOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sx(24),
  },
  stepperCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: sx(24),
    paddingVertical: sy(32),
    paddingHorizontal: sx(24),
    alignItems: 'center',
    gap: sy(24),
    shadowColor: '#c4d2ff',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  stepperTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(20),
    lineHeight: sy(26),
    color: '#1d192b',
    letterSpacing: -0.2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(32),
  },
  stepperBtn: {
    width: sx(48),
    height: sx(48),
    borderRadius: 999,
    backgroundColor: '#eaefff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#9eb6ff',
  },
  stepperBtnText: {
    fontSize: sx(26),
    lineHeight: sx(30),
    color: '#527dff',
    fontFamily: 'NationalPark_500Medium',
  },
  stepperValue: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(52),
    lineHeight: sy(60),
    color: '#1d192b',
    letterSpacing: -1,
    minWidth: sx(60),
    textAlign: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: sy(8),
    paddingTop: sy(4),
  },
  cta: {
    height: sy(56),
    width: W - sx(40),
    borderRadius: sx(20),
    backgroundColor: '#527dff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: sy(8),
  },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    color: '#f2f9ff',
    letterSpacing: -0.16,
  },
});

// ─── Welcome / completion screen ─────────────────────────────────────────────
function Welcome({ name, onContinue }: { name: string; onContinue: () => void }) {
  const { t } = useTranslation();
  const float = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const birdY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <View style={styles.welcomeRoot}>
      <View style={styles.welcomeCenter}>
        <Animated.Image
          source={BIRD}
          style={[styles.welcomeBird, { opacity: fade, transform: [{ translateY: birdY }] }]}
          resizeMode="contain"
        />
        <Animated.View style={{ opacity: fade, alignItems: 'center' }}>
          <Text style={styles.welcomeTitle}>{t('onboarding.welcomeTitle', { name })}</Text>
          <Text style={styles.welcomeSubtitle}>{t('onboarding.welcomeSubtitle')}</Text>
        </Animated.View>
      </View>

      <Pressable onPress={onContinue} style={styles.welcomeCta}>
        <Text style={styles.welcomeCtaText}>{t('onboarding.letsKonnect')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Welcome
  welcomeRoot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: sy(16) },
  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: sy(36) },
  welcomeBird: { width: sx(180), height: sx(180) },
  welcomeTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(24),
    lineHeight: sy(30),
    color: colors.gray[1300],
    textAlign: 'center',
    letterSpacing: -0.24,
  },
  welcomeSubtitle: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    lineHeight: sy(24),
    color: colors.gray[900],
    textAlign: 'center',
    letterSpacing: -0.16,
    marginTop: sy(12),
  },
  welcomeCta: {
    height: sy(56),
    width: W - sx(40),
    borderRadius: sx(20),
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeCtaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    color: colors.surface.default,
    letterSpacing: -0.16,
  },
});
