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
import { SvgXml } from 'react-native-svg';
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
  getOnboarding,
  recordToAnswers,
  saveOnboarding,
} from '../../api/onboarding';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { colors } from '../../theme/tokens';
import { onboardingSource } from '../../assets/onboardingAssets';
import { QuestionScreen } from './QuestionScreen';
import { ProfileSetupScreen } from './ProfileSetupScreen';
import { AVATAR_SOURCE } from '../../assets/onboardingIcons';
import { FORCE_ONBOARDING } from '../../config';
import { ScreenTransition } from '../../components/ScreenTransition';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const BIRD = onboardingSource(
  require('../../../assets/mascot/bird-hero.png') as ImageSourcePropType,
  'bird-hero',
);
const BACK_BTN_IMG = onboardingSource(
  require('../../../assets/onboarding/chevron-left.png') as ImageSourcePropType,
  'chevron-left',
);

// Counter +/- icons (provided SVGs, gray #657586).
const MINUS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="#657586" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PLUS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5V19.5M19.5 12H4.5" stroke="#657586" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;


interface Props {
  /** Called when the user finishes onboarding and taps "Let's Konnect!". */
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const { user, saveProfile, fetchProfile } = useAuth();
  const { language } = useLanguage();
  // Flow: 'intro' (Let's personalize + Get started) → 'profile' (name + avatar)
  // → 'questions' → 'welcome'.
  const [phase, setPhase] = useState<'intro' | 'profile' | 'questions' | 'welcome'>('intro');
  // If the backend already has a profile (username set) for this user, skip the
  // name/photo screen and go straight to the questions.
  const [skipProfile, setSkipProfile] = useState(false);
  // Default username seeded from the provider display name (Google/Facebook).
  const initialUsername = (user?.name ?? '')
    .replace(/[^A-Za-z0-9._]/g, '')
    .replace(/^[^A-Za-z]+/, '')
    .slice(0, 20);
  // Start with Flow A default; branch after purpose is answered
  const [questionList, setQuestionList] = useState<OnboardingQuestion[]>(FLOW_A_QUESTIONS);
  const [step, setStep] = useState(0);
  // Which way the next screen should enter from — 'push' when advancing,
  // 'pop' when going back — so the transition matches the navigation.
  const dirRef = useRef<'push' | 'pop'>('push');
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  // Tracks whether a backend record already exists for this email + device.
  // Decides POST (create, first Confirm only) vs PATCH (every other Confirm).
  const hasRecordRef = useRef(false);
  // Serializes writes so a PATCH can never race ahead of the initial POST.
  const syncChainRef = useRef<Promise<unknown>>(Promise.resolve());

  const total = questionList.length;
  const current = questionList[step];

  // On flow start, check whether the user already has a profile (username +
  // photo). If so, skip the name/photo selection screen entirely.
  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((profile) => {
        if (cancelled) return;
        // TESTING: FORCE_ONBOARDING keeps the username screen in the flow even
        // when the backend already has one (it arrives prefilled for editing).
        if (!FORCE_ONBOARDING && profile?.username) setSkipProfile(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  // On flow start, load any existing record and preload its selections. If one
  // exists, all writes become PATCH (the record is already created).
  useEffect(() => {
    let cancelled = false;
    getOnboarding()
      .then((record) => {
        if (cancelled || !record) return;
        hasRecordRef.current = true;
        const preloaded = recordToAnswers(record);
        setAnswers(preloaded);
        const purposeId = preloaded['purpose']?.[0];
        if (purposeId) setQuestionList(getQuestionsForPurpose(purposeId));
      })
      .catch((e) => console.warn('[Onboarding] get failed', e?.message ?? e));
    return () => {
      cancelled = true;
    };
  }, []);

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
  //
  // The very first Confirm with no existing record CREATEs it (POST); every
  // subsequent Confirm — and the first one too when a record was preloaded —
  // UPDATEs it (PATCH). Writes are chained so a PATCH can't outrun the POST.
  const syncAnswers = (currentAnswers: Record<string, string[]>) => {
    const method = hasRecordRef.current ? 'PATCH' : 'POST';
    // Mark as existing immediately so the next Confirm PATCHes even if this
    // POST is still in flight (the chain guarantees ordering on the wire).
    hasRecordRef.current = true;
    syncChainRef.current = syncChainRef.current
      .then(() =>
        saveOnboarding({ answers: currentAnswers, preferredLanguage: language.code, method }),
      )
      .catch((e) => console.warn('[Onboarding] sync failed', e?.message ?? e));
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
    dirRef.current = 'pop';
    if (step > 0) setStep((s) => s - 1);
  };

  // No profile screen anymore, so progress is based purely on the question count.
  const progress = (step + 0.5) / total;

  let body: React.ReactNode;
  if (phase === 'intro') {
    // Skip the name/photo screen when the user already has a backend profile.
    body = <SetupIntro onStart={() => setPhase(skipProfile ? 'questions' : 'profile')} />;
  } else if (phase === 'profile') {
    body = (
      <ProfileSetupScreen
        progress={0.06}
        onBack={() => {
          dirRef.current = 'pop';
          setPhase('intro');
        }}
        onConfirm={async (username, photoUri) => {
          try {
            await saveProfile({ name: username, photoUri: photoUri ?? undefined });
          } catch (e) {
            console.warn('[Onboarding] save profile failed', e);
          }
          setPhase('questions');
        }}
        initialValue={initialUsername}
        initialPhotoUrl={user?.photo ?? null}
      />
    );
  } else if (phase === 'welcome') {
    body = <Welcome name={user?.name || 'Traveler'} onContinue={onComplete} />;
  } else if (current?.layout === 'counter') {
    // NumberOfPeople stepper — a dim bottom-sheet overlay on top of the previous
    // question (per Figma), not a standalone screen. The base page keeps its own
    // back button and its own progress value: the overlay must not remove the
    // back button or advance the progress bar (it's just an overlay).
    const prevQuestion = step > 0 ? questionList[step - 1] : null;
    const baseProgress = (step - 1 + 0.5) / total;
    body = (
      <>
        {prevQuestion ? (
          <QuestionScreen
            question={prevQuestion}
            selected={answers[prevQuestion.key] ?? []}
            onToggle={() => {}}
            onConfirm={() => {}}
            onBack={handleBack}
            progress={baseProgress}
            canGoBack={step - 1 > 0}
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
        {/* Every phase/step change slides in (forward) or back (pop) rather than
            snapping — same motion language as the rest of the app. */}
        <ScreenTransition
          transitionKey={`${phase}-${step}`}
          mode={dirRef.current}
          onTransitionEnd={() => {
            dirRef.current = 'push';
          }}
        >
          {body}
        </ScreenTransition>
      </SafeAreaView>
    </View>
  );
}

// ─── "Let's personalize your travel experience" intro (waits for Get started) ─
function SetupIntro({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const rise = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // Fade + rise + settle in, then wait for the user to tap Get started.
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 550, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 550, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]);
    anim.start();
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
      </Animated.View>

      <Pressable onPress={onStart} style={[introStyles.cta, { marginBottom: Math.max(insets.bottom, sy(8)) }]}>
        <Text style={introStyles.ctaText}>{t('onboarding.getStarted')}</Text>
      </Pressable>
    </View>
  );
}

const introStyles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', paddingBottom: sy(8) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: sx(32), gap: sy(14) },
  cta: {
    height: sy(56),
    width: W - sx(40),
    borderRadius: sx(20),
    backgroundColor: '#527dff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    color: '#f2f9ff',
    letterSpacing: -0.16,
  },
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
              <SvgXml xml={MINUS_SVG} width={sx(24)} height={sx(24)} />
            </Pressable>
            <Text style={sheet.value}>{count}</Text>
            <Pressable
              onPress={() => setCount((c) => Math.min(100, c + 1))}
              style={sheet.stepBtn}
              hitSlop={12}
            >
              <SvgXml xml={PLUS_SVG} width={sx(24)} height={sx(24)} />
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
    justifyContent: 'center',
    gap: sx(12),
  },
  stepBtn: {
    width: sx(48),
    height: sx(48),
    borderRadius: 999,
    backgroundColor: '#d8ecfb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(72),
    // lineHeight ≈ 0.9·fontSize + no font padding → the digits sit vertically
    // centred with the +/- circles instead of dropping below the baseline.
    lineHeight: sx(65),
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: '#1d192b',
    letterSpacing: -1,
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
        <Image source={AVATAR_SOURCE} style={ctr.birdAvatar} resizeMode="contain" />
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
