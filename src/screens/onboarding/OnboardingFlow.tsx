import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Dimensions,
  ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
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
  setChosenUsername,
} from '../../api/onboarding';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { track } from '../../api/tracking';
import { colors } from '../../theme/tokens';
import { onboardingSource } from '../../assets/onboardingAssets';
import { QuestionScreen } from './QuestionScreen';
import { ProfileSetupScreen } from './ProfileSetupScreen';
import { PressableScale } from '../../components/PressableScale';
import { AVATAR_SOURCE } from '../../assets/onboardingIcons';
import { FORCE_ONBOARDING } from '../../config';
import { LottieEdgeFeather, LottieHalo } from '../../components/LottieEdgeFeather';
import { CROSSFADE_DURATION, ScreenTransition } from '../../components/ScreenTransition';
import { UsernameTakenError } from '../../api/errors';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const BIRD = onboardingSource(
  require('../../../assets/mascot/bird-hero.png') as ImageSourcePropType,
  'bird-hero',
);

// Counter +/- icons (provided SVGs, gray #657586).
const MINUS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19" stroke="#657586" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PLUS_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 4.5V19.5M19.5 12H4.5" stroke="#657586" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;


interface Props {
  /** Called when the user finishes onboarding and taps "Let's Konnect!". */
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: Props) {
  const { t } = useTranslation();
  const { user, saveProfile, fetchProfile, personalizationStartsFromQuestions } = useAuth();
  const { language } = useLanguage();
  // Flow: 'intro' (Let's personalize + Get started) → 'profile' (name + avatar)
  // → 'questions' → 'welcome'. Re-entry from the Profile page's Preferences
  // pencil (restartPersonalizationFromQuestions) skips straight to the
  // questions — the saved record preloads the previous selections below.
  const [phase, setPhase] = useState<'intro' | 'profile' | 'questions' | 'welcome'>(
    personalizationStartsFromQuestions ? 'questions' : 'intro',
  );
  // If the backend already has a profile (username set) for this user, skip the
  // name/photo screen and go straight to the questions.
  const [skipProfile, setSkipProfile] = useState(false);
  // A name the backend rejected on create, kept so the username screen can
  // flag it and offer the alternatives the server suggested.
  const [taken, setTaken] = useState<{ name: string; suggestions: string[] } | null>(null);
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
        // A user who already has a username skips the screen; FORCE_ONBOARDING
        // keeps it in the flow for testing (it arrives prefilled for editing).
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
      .catch((e) => {
        if (e instanceof UsernameTakenError) {
          // The name went stale between the check and the save. Send the user
          // back to pick another rather than silently dropping their answers.
          console.warn('[Onboarding] username taken on save', e.username, e.suggestions);
          dirRef.current = 'pop';
          setPhase('profile');
          Alert.alert(t('onboarding.usernameTaken'));
          return;
        }
        console.warn('[Onboarding] sync failed', e?.message ?? e);
      });
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

  // NumberOfPeople is a bottom sheet over the previous question, not a page.
  const isCounterStep = phase === 'questions' && current?.layout === 'counter';

  let body: React.ReactNode;
  if (phase === 'intro') {
    // Skip the name/photo screen when the user already has a backend profile.
    body = <SetupIntro onStart={() => setPhase(skipProfile ? 'questions' : 'profile')} />;
  } else if (phase === 'profile') {
    body = (
      <ProfileSetupScreen
        onBack={() => {
          dirRef.current = 'pop';
          setPhase('intro');
        }}
        onConfirm={async (username, photoUri) => {
          // Claim the name here, at account creation. PATCH /profile is what
          // enforces username uniqueness — it answers 409 "Username is already
          // taken." — and unlike the onboarding create it needs no answers yet
          // (that one 422s on the empty purpose at this point in the flow).
          setChosenUsername(username);
          setTaken(null);
          try {
            await saveProfile({ name: username, photoUri: photoUri ?? undefined });
            // Tracking contract rows 9a / 12 — only what the user changed here.
            if (username.trim() && username.trim() !== initialUsername) {
              track.profileEdit('edit_profile_onboarding', 'onboarding_username');
            }
            if (photoUri) track.profileEdit('edit_profile_photo', 'profile_photo');
          } catch (e) {
            if (e instanceof UsernameTakenError) {
              // Stay put: the field flags the name and offers alternatives.
              setTaken({ name: e.username, suggestions: e.suggestions });
              return;
            }
            console.warn('[Onboarding] save profile failed', e);
          }
          setPhase('questions');
        }}
        // Deliberately blank: the Google/Facebook display name is not a
        // username, and offering it as one nudged users into a name they had
        // not chosen — usually the one already taken. They type their own.
        initialValue=""
        initialPhotoUrl={user?.photo ?? null}
        takenUsername={taken?.name ?? null}
        takenSuggestions={taken?.suggestions ?? []}
      />
    );
  } else if (phase === 'welcome') {
    body = <Welcome name={user?.name || 'Traveler'} onContinue={onComplete} />;
  } else if (current?.layout === 'counter') {
    // NumberOfPeople stepper — a dim bottom-sheet overlay on top of the previous
    // question (per Figma), not a standalone screen. The base page keeps its own
    // back button: the overlay must not remove it (it's just an overlay).
    const prevQuestion = step > 0 ? questionList[step - 1] : null;
    body = prevQuestion ? (
      <QuestionScreen
        question={prevQuestion}
        selected={answers[prevQuestion.key] ?? []}
        onToggle={() => {}}
        onConfirm={() => {}}
        onBack={handleBack}
        canGoBack={step - 1 > 0}
      />
    ) : null;
  } else if (current) {
    body = (
      <QuestionScreen
        question={current}
        selected={answers[current.key] ?? []}
        onToggle={toggleOption}
        onConfirm={handleConfirm}
        onBack={handleBack}
        canGoBack={step > 0}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Original design gradient (12320-52201). The animations blend into it
          via edge feathering — the in-app equivalent of the designer's soft
          "Illustration" blur layers. */}
      <LinearGradient
        colors={['#eaf4ff', '#f2f9ff']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {/* Every phase/step change cross-fades: the old page dissolves and
            slides away while the new one eases in a beat later (forward from
            the right, back from the left) — unhurried, never a cut. The
            number-of-people step is an overlay on the previous question, so it
            keeps that page's key and opening it does not re-run the transition. */}
        <ScreenTransition
          transitionKey={`${phase}-${isCounterStep ? step - 1 : step}`}
          mode={dirRef.current}
          duration={CROSSFADE_DURATION}
          crossfade
          onTransitionEnd={() => {
            dirRef.current = 'push';
          }}
        >
          {body}
        </ScreenTransition>
        {isCounterStep && current ? (
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
        ) : null}
      </SafeAreaView>
    </View>
  );
}

// ─── "Let's personalize your travel experience" intro (waits for Get started) ─
function SetupIntro({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const rise = useSharedValue(12);

  useEffect(() => {
    // Fade + rise + settle in (UI thread), then wait for the user to tap
    // Get started.
    opacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.ease) });
    rise.value = withTiming(0, { duration: 550, easing: Easing.out(Easing.ease) });
    scale.value = withSpring(1, { damping: 9, stiffness: 120 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: rise.value }, { scale: scale.value }],
  }));

  return (
    <View style={introStyles.root}>
      <Animated.View style={[introStyles.center, enterStyle]}>
        {/* Welcome-bird Lottie (Onboarding_Username_Intro 12320:52326,
            250×191). Full frame — no zoom-crop, so the bird and its halo are
            never cut off; the edge feather alone dissolves the frames' baked
            corner vignette into the screen background. */}
        <View style={introStyles.birdLottieBox}>
          {/* Soft halo UNDER the animation in its vignette's edge colour —
              the designer's blurred Illustration layer. The frames' radial
              vignette fades to ~#dbecfc at the borders; the light feather
              finishes that fade, and the halo carries it out into the screen
              gradient so no edge exists anywhere. */}
          <LottieHalo color="#dbecfc" width={sx(250)} height={sx(191)} spread={sx(44)} />
          <LottieView
            source={require('../../../assets/lottie/welcome-bird.json')}
            style={introStyles.birdLottieInner}
            autoPlay
            loop
            resizeMode="cover"
          />
          <LottieEdgeFeather color="#dbecfc" top={0.1} bottom={0.12} side={0.1} />
        </View>
        <Text style={introStyles.title}>{t('onboarding.setupTitle')}</Text>
      </Animated.View>

      <PressableScale onPress={onStart} style={[introStyles.cta, { marginBottom: Math.max(insets.bottom, sy(8)) }]}>
        <Text style={introStyles.ctaText}>{t('onboarding.getStarted')}</Text>
      </PressableScale>
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
  birdLottieBox: {
    width: sx(250),
    height: sx(191),
    marginBottom: sy(6),
  },
  birdLottieInner: { width: '100%', height: '100%' },
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
          <PressableScale onPress={() => onConfirm(count)} style={sheet.cta}>
            <Text style={sheet.ctaText}>{t('common.confirm')}</Text>
          </PressableScale>
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

// ─── Welcome / completion screen ─────────────────────────────────────────────
// Onboarding_Complete (12320:52281): the "Welcome fly" Lottie (250×250, JPEG
// frames on their own #ecf4fe bg) above the message, on a flat #ecf4fe screen
// so the animation square blends seamlessly.
function Welcome({ name, onContinue }: { name: string; onContinue: () => void }) {
  const { t } = useTranslation();
  const fade = useSharedValue(0);
  // The bird is held back until the page hand-off has settled, and is only
  // shown once its frames are decoded — mounting it during the cross-fade
  // made it pop in halfway through the transition.
  const [birdMounted, setBirdMounted] = useState(false);
  const bird = useSharedValue(0);
  const birdShown = useRef(false);
  const revealBird = () => {
    if (birdShown.current) return;
    birdShown.current = true;
    bird.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.ease) });
  };

  useEffect(() => {
    fade.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) });
    const mount = setTimeout(() => setBirdMounted(true), CROSSFADE_DURATION + 40);
    return () => clearTimeout(mount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!birdMounted) return;
    // Should the load callback not arrive, still show the bird.
    const fallback = setTimeout(revealBird, 700);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birdMounted]);
  const birdStyle = useAnimatedStyle(() => ({ opacity: bird.value }));
  // Fade + a short rise so the greeting settles under the bird.
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 10 }],
  }));

  return (
    <View style={styles.welcomeRoot}>
      <View style={styles.welcomeCenter}>
        <View style={styles.welcomeLottieBox}>
          {birdMounted ? (
            <Animated.View style={[styles.welcomeLottie, birdStyle]}>
              <LottieView
                source={require('../../../assets/lottie/welcome-fly.json')}
                style={styles.welcomeLottie}
                autoPlay
                loop
                resizeMode="cover"
                onAnimationLoaded={revealBird}
              />
            </Animated.View>
          ) : null}
        </View>
        <Animated.View style={[{ alignItems: 'center' as const }, fadeStyle]}>
          <Text style={styles.welcomeTitle}>{t('onboarding.welcomeTitle', { name })}</Text>
          <Text style={styles.welcomeSubtitle}>{t('onboarding.welcomeSubtitle')}</Text>
        </Animated.View>
      </View>

      <PressableScale onPress={onContinue} style={styles.welcomeCta}>
        <Text style={styles.welcomeCtaText}>{t('onboarding.letsKonnect')}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Welcome — flat #ecf4fe per Onboarding_Complete so the Lottie square blends.
  welcomeRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: sy(16),
    backgroundColor: '#ecf4fe',
  },
  welcomeCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: sy(24) },
  welcomeBird: { width: sx(180), height: sx(180) },
  welcomeLottieBox: { width: sx(250), height: sx(250), borderRadius: sx(24), overflow: 'hidden' },
  welcomeLottie: { width: '100%', height: '100%' },
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
