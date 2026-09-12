import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Dimensions,
  Image,
  ImageSourcePropType,
  Keyboard,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { shareContent } from '../utils/share';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import {
  Clarification,
  ConfidenceIndicator,
  SearchSource,
  ServiceRecommendation,
  makeSessionId,
  streamQuery,
} from '../api/search';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { onboardingSource } from '../assets/onboardingAssets';
import { trackEvent } from '../api/tracking';
import { openTaxiBooking } from '../utils/taxiBooking';
import { QuickAnswer } from '../components/QuickAnswer';
import { KeyboardStickyView } from '../components/KeyboardStickyView';
import { VoiceOverlay } from '../components/VoiceOverlay';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import {
  SEARCH_BAR_MIC_FOCUSED_SVG,
  SEARCH_BAR_MIC_SVG,
  SEARCH_BAR_SEND_ACTIVE_SVG,
  SEARCH_BAR_SEND_SVG,
} from '../assets/searchBarAssets';
import { QUICK_ANSWER_CHEVRON_SVG, QUICK_ANSWER_SHARE_SVG } from '../assets/quickAnswerAssets';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const BIRD = onboardingSource(
  require('../../assets/mascot/bird-hero.png') as ImageSourcePropType,
  'bird-hero',
);

// Ported from the website (konnect_react searchAPI.js): every answer promotes
// the taxi service and nothing else — pinned so it shows from the first frame,
// even before (or without) a service_recommendations event. Whatever the
// backend sends for that event is ignored.
const PINNED_RECOMMENDATIONS: ServiceRecommendation[] = [
  {
    service_key: 'taxi',
    display_name: '',
    emoji: '🚕',
    title: 'Book a taxi',
    body: 'Available 24/7 with English-speaking drivers.',
    deep_link_url: 'konnect://services/taxi',
    deep_link_label: 'Book a Taxi',
  },
];

/** Backend blocked/failed to validate the query (gibberish, unsafe, illegal).
    Two wire shapes (router-layer `message` vs pipeline-layer `detail`) are
    folded into this one. */
interface ValidationError {
  message: string;
  severity: string;
  legal_reference: string | null;
  source: string | null;
  korean_law_url: string | null;
}

/** Normalize the stream's search_queries shapes to a string list (web parity). */
function normalizeSearchQueries(data: any): string[] {
  let raw: any[] = [];
  if (Array.isArray(data)) raw = data;
  else if (data && typeof data === 'object') {
    if (Array.isArray(data.queries)) raw = data.queries;
    else if (Array.isArray(data.search_queries)) raw = data.search_queries;
    else {
      const en = Array.isArray(data.en) ? data.en : [];
      const kr = Array.isArray(data.kr) ? data.kr : [];
      const others = Object.entries(data)
        .filter(([k, v]) => Array.isArray(v) && k !== 'en' && k !== 'kr')
        .flatMap(([, v]) => v as any[]);
      raw = [...en, ...kr, ...others];
    }
  }
  return raw.map((q) => (typeof q === 'string' ? q : q?.query || q?.text || '')).filter(Boolean);
}

/** One search to run. `key` changes per submission so re-asking the same
    text (e.g. "search as typed") still re-runs. */
export interface SearchRequest {
  query: string;
  /** Search exactly as typed — no context rewrite (corrections). */
  skipResolution?: boolean;
  /** Continue this thread (a follow-up picked from History); omitted = keep the
      screen's current thread, or start a new one on a fresh screen. */
  conversationId?: string | null;
  key: number;
}

export interface AskOptions {
  skipResolution?: boolean;
  conversationId?: string | null;
}

interface Props {
  request: SearchRequest;
  onBack: () => void;
}

/** One exchange in the chat: the question and everything its stream produced. */
interface Turn {
  key: number;
  query: string;
  skipResolution: boolean;
  streaming: boolean;
  category: string | null;
  searchQueries: string[];
  validationError: ValidationError | null;
  clarification: Clarification | null;
  /** turn_act.resolved_query when it differs from the question — analytics-only, not rendered. */
  interpretedAs: string | null;
  summary: string;
  sources: SearchSource[];
  followups: string[];
  confidence: ConfidenceIndicator | null;
  error: boolean;
  errorMessage: string | null;
  /** Set once the finished search has been persisted — what "share" mints from. */
  responseId: string | null;
  sourcesOpen: boolean;
}

function newTurn(query: string, skipResolution: boolean): Turn {
  return {
    key: Date.now() + Math.random(),
    query,
    skipResolution,
    streaming: true,
    category: null,
    searchQueries: [],
    validationError: null,
    clarification: null,
    interpretedAs: null,
    summary: '',
    sources: [],
    followups: [],
    confidence: null,
    error: false,
    errorMessage: null,
    responseId: null,
    // Figma's default state shows the sources unfolded.
    sourcesOpen: true,
  };
}

// The results screen is a CHAT: every question asked here (the bottom search
// bar, a related-question chip, a clarification option, "search as typed")
// is appended as a new turn under the previous ones, streamed over
// POST /api/v2/search (src/api/search.ts) with the thread's conversation_id,
// so consecutive searches on this screen belong to one conversation — the
// one the History tab lists afterwards. The bottom navigation is hidden
// while this screen is up (HomeScreen reports it full-screen); the search
// bar takes its place.
// Visuals follow Figma "FollowUp" (section 13266:92836): #f2f9ff page,
// 52-tall top bar with a 20/SemiBold title, the question as a 14/Regular
// bubble with a square bottom-right corner, and the Search Bar component in
// its Default / Focused / Typing states. The answer sits straight on the
// page (no card): QuickAnswer maps the markdown onto the template's type
// scale, then numbered Related Questions and Sources lists, then the share
// glyph (annotated: share, icon set 20×20).
// The markdown-ish answer renderer is shared with the History transcript —
// see src/components/FormattedAnswer.tsx.

export function SearchResultsScreen({ request, onBack }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();

  // One session id per screen instance so every turn shares a session.
  const sessionId = useRef(makeSessionId()).current;
  // The conversation this chat belongs to: seeded by a request that names a
  // thread (History follow-up), otherwise set by the first turn's
  // `conversation` event and sent back on every later turn.
  const conversationIdRef = useRef<string | null>(request.conversationId ?? null);
  const [turns, setTurns] = useState<Turn[]>(() => [newTurn(request.query, !!request.skipResolution)]);
  const turnsRef = useRef(turns);
  turnsRef.current = turns;
  const [draft, setDraft] = useState('');
  // Search bar states (Figma): resting pill ↔ focused/typing card.
  const [inputFocused, setInputFocused] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [sharingKey, setSharingKey] = useState<number | null>(null);
  const [tickerIdx, setTickerIdx] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const lastRequestKey = useRef(request.key);

  const activeTurn = turns[turns.length - 1];
  const activeKey = activeTurn?.key;
  const busy = !!activeTurn?.streaming;

  const patchTurn = useCallback((key: number, patch: Partial<Turn> | ((turn: Turn) => Partial<Turn>)) => {
    setTurns((cur) =>
      cur.map((turn) => (turn.key === key ? { ...turn, ...(typeof patch === 'function' ? patch(turn) : patch) } : turn)),
    );
  }, []);

  const scrollToEnd = useCallback(() => {
    // After the new turn has laid out.
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 90);
  }, []);

  // Ask something else in this same chat: appended as a new turn (the stream
  // effect below picks it up with the current conversation id).
  const ask = useCallback(
    (text: string, opts: { skipResolution?: boolean } = {}) => {
      const q = text.trim();
      if (!q) return;
      setDraft('');
      setTickerIdx(0);
      Keyboard.dismiss();
      setTurns((cur) => [...cur, newTurn(q, !!opts.skipResolution)]);
      scrollToEnd();
    },
    [scrollToEnd],
  );

  // Voice input from the bar's mic (same recognizer + overlay as Home): the
  // final transcript is asked in this chat.
  const voice = useVoiceRecognition(language.voiceLocale, {
    silenceMs: 2000,
    onResult: (text) => {
      setShowVoice(false);
      ask(text);
    },
  });
  useEffect(() => {
    if (!voice.error) return;
    if (!voice.error.toLowerCase().includes('permission')) return;
    setShowVoice(false);
    Alert.alert(t('voice.permissionDenied'));
  }, [voice.error, t]);
  const openVoice = async () => {
    Keyboard.dismiss();
    setShowVoice(true);
    const started = await voice.start();
    if (!started) setShowVoice(false);
  };
  const closeVoice = async () => {
    await voice.stop();
    setShowVoice(false);
  };

  // A request handed in while this screen is up (History follow-up, About
  // page): same thread → one more turn; anything else starts a new chat.
  useEffect(() => {
    if (request.key === lastRequestKey.current) return;
    lastRequestKey.current = request.key;
    const sameThread = !!request.conversationId && request.conversationId === conversationIdRef.current;
    const turn = newTurn(request.query, !!request.skipResolution);
    setDraft('');
    setTickerIdx(0);
    if (sameThread) {
      setTurns((cur) => [...cur, turn]);
      scrollToEnd();
    } else {
      conversationIdRef.current = request.conversationId ?? null;
      setTurns([turn]);
    }
  }, [request, scrollToEnd]);

  // Hardware back closes the chat (there is no tab bar to escape to).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);

  // "Searching for" ticker fade (web crossfades queries every 1.6 s, looping).
  const tickerOpacity = useSharedValue(1);
  const tickerStyle = useAnimatedStyle(() => ({ opacity: tickerOpacity.value }));

  // Stream the newest turn. Only one turn streams at a time — the search bar
  // won't send while one is in flight — so by the time the next question
  // goes out, this thread's conversation id is known.
  useEffect(() => {
    if (activeKey == null) return;
    const turn = turnsRef.current.find((tn) => tn.key === activeKey);
    if (!turn) return;
    const key = activeKey;
    // Whether an answer (or clarification) has landed for this turn — decides
    // if a late fatal stage_error is a failure or just noise.
    let answered = false;

    const handle = streamQuery(
      {
        query: turn.query,
        email: user?.email || undefined,
        languageCode: language.code,
        sessionId,
        conversationId: conversationIdRef.current,
        skipResolution: turn.skipResolution,
        userLat: 37.5665,
        userLng: 126.978,
      },
      {
        onEvent: (event) => {
          switch (event.type) {
            case 'conversation':
              // First event of a turn that joined a thread (not guaranteed —
              // a stateless turn simply never sends it).
              if (event.data?.conversation_id) conversationIdRef.current = event.data.conversation_id;
              break;
            case 'turn_act': {
              const resolved = String(event.data?.resolved_query ?? '').trim();
              const original = String(event.data?.original_query ?? turn.query).trim();
              patchTurn(key, {
                interpretedAs: resolved && resolved !== original && !event.data?.skipped_reason ? resolved : null,
              });
              break;
            }
            case 'clarification':
              // Replaces the answer: the pipeline stops here. The reply goes
              // through the search bar (or an option chip) as the next turn.
              if (event.data?.question) {
                answered = true;
                patchTurn(key, {
                  clarification: {
                    question: String(event.data.question),
                    options: Array.isArray(event.data.options) ? event.data.options.map(String) : [],
                  },
                  streaming: false,
                });
              }
              break;
            case 'category': {
              const label = event.data?.display_name || event.data?.category;
              if (label) patchTurn(key, { category: String(label).replace(/_/g, ' ') });
              break;
            }
            case 'search_queries': {
              const list = normalizeSearchQueries(event.data);
              if (list.length) patchTurn(key, { searchQueries: list });
              break;
            }
            case 'service_recommendations':
              // Deliberately ignored — the taxi card is pinned (web parity).
              break;
            case 'final_summary_chunk':
              // Today this fires once with the whole cleaned answer; appending
              // keeps working if it ever becomes a token stream.
              if (event.data?.chunk) {
                answered = true;
                patchTurn(key, (tn) => ({ summary: tn.summary + event.data.chunk }));
              }
              break;
            case 'final_summary': {
              // Authoritative full text — replaces accumulated chunks. An
              // ungrounded/degraded answer is fallback text; its source list
              // is meaningless (and empty) — don't offer it.
              answered = true;
              const text = event.data?.summary || event.data?.text;
              const degraded = event.data?.grounding_level === 'ungrounded' || event.data?.degraded;
              patchTurn(key, (tn) => ({
                summary: text || tn.summary,
                sources: degraded ? [] : Array.isArray(event.data?.sources) ? event.data.sources : tn.sources,
              }));
              break;
            }
            case 'summary': {
              // Two wire shapes share this type: guard-rail / social /
              // short-circuit turns send { text, status, category }; the
              // pre-pipeline paths send the full StreamSummary with
              // `final_summary` (+ followup_questions). Both are terminal.
              const d = event.data ?? {};
              const text =
                typeof d.text === 'string' ? d.text : typeof d.final_summary === 'string' ? d.final_summary : d.summary;
              if (text) answered = true;
              const terminal = d.status === 'completed' || 'final_summary' in d;
              patchTurn(key, (tn) => ({
                summary: text || tn.summary,
                followups:
                  Array.isArray(d.followup_questions) && d.followup_questions.length
                    ? d.followup_questions.map(String)
                    : tn.followups,
                streaming: terminal ? false : tn.streaming,
              }));
              break;
            }
            case 'followup_questions':
              if (Array.isArray(event.data?.questions)) patchTurn(key, { followups: event.data.questions.map(String) });
              else if (Array.isArray(event.data)) patchTurn(key, { followups: event.data.map(String) });
              break;
            case 'confidence_indicator':
              patchTurn(key, { confidence: event.data });
              break;
            case 'validation_error':
              // Backend rejected the query (gibberish / unsafe / illegal).
              // Router-layer blocks carry `message` (+ legal refs), pipeline-
              // layer ones `detail` (+ validation_type). Renders the web's
              // error card; the stream keeps flowing so the safer follow-up
              // suggestions after it still arrive.
              answered = true;
              patchTurn(key, {
                validationError: {
                  message: event.data?.message || event.data?.detail || t('search.tryDifferent'),
                  severity: event.data?.severity || 'error',
                  legal_reference: event.data?.legal_reference ?? null,
                  source: event.data?.source ?? null,
                  korean_law_url: event.data?.korean_law_url ?? null,
                },
              });
              break;
            case 'metadata':
              // Can repeat; the last one is authoritative. `completed` and
              // `degraded` both terminate. `validation_failed` arrives BEFORE
              // the validation_error payload — stopping there would leave a
              // blank turn (web parity).
              if (event.data?.conversation_id) conversationIdRef.current = event.data.conversation_id;
              if (event.data?.status === 'completed' || event.data?.status === 'degraded') {
                patchTurn(key, { streaming: false });
              }
              break;
            case 'error':
              // Hard failure after the stream started (plain-JSON failures
              // before it come through onError instead).
              console.warn('[search] pipeline error', event.data?.error_type, event.data?.error);
              patchTurn(key, { streaming: false, error: true });
              break;
            case 'stage_error':
              // Fatal → the stream ends without an answer; non-fatal (and
              // stage_degraded) → the turn still completes.
              if (event.data?.fatal && !answered) {
                console.warn('[search] fatal stage error', event.data?.stage, event.data?.detail);
                patchTurn(key, { streaming: false, error: true });
              }
              break;
            default:
              // worker_progress, keepalive, quality_score, … — the design
              // shows only "Searching for" while in flight (web parity).
              break;
          }
        },
        onDone: (result) => {
          if (result.conversationId) conversationIdRef.current = result.conversationId;
          patchTurn(key, (tn) => ({
            streaming: false,
            // A router-blocked query (X-Validation-Failed) whose refusal event
            // didn't parse still needs the "can't answer" card, not a blank.
            validationError:
              result.validationFailed && !answered && !tn.validationError
                ? {
                    message: t('search.tryDifferent'),
                    severity: 'error',
                    legal_reference: null,
                    source: null,
                    korean_law_url: null,
                  }
                : tn.validationError,
          }));
        },
        onRecorded: (id) => patchTurn(key, { responseId: id }),
        onError: (e) => {
          // The gateway's / limiter's message is written for the user (rate
          // limits); anything else shows the translated generic copy.
          console.warn('[search] stream failed', e.code, e.status, e.message);
          patchTurn(key, { streaming: false, error: true, errorMessage: e.userMessage });
        },
      },
    );

    return () => handle.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Rotate through the streamed search queries while waiting — loops rather
  // than resting on the last one, until the answer itself appears (web parity).
  const activeQueries = activeTurn?.searchQueries ?? [];
  const activeStreaming = !!activeTurn?.streaming;
  const activeBlocked = !!activeTurn?.validationError;
  useEffect(() => {
    // Keeps cycling for as long as the strip is up (i.e. the whole stream), so
    // the ticker never freezes next to a spinning loader.
    if (activeQueries.length < 2 || !activeStreaming || activeBlocked) return;
    // Fade out on the UI thread, swap the label on JS, fade back in.
    const advance = () => {
      setTickerIdx((i) => (i + 1) % activeQueries.length);
      tickerOpacity.value = withTiming(1, { duration: 220 });
    };
    const id = setTimeout(() => {
      tickerOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) runOnJS(advance)();
      });
    }, 1600);
    return () => clearTimeout(id);
  }, [activeQueries, tickerIdx, activeStreaming, activeBlocked, tickerOpacity]);

  const currentQuery = activeQueries.length ? activeQueries[tickerIdx % activeQueries.length] : null;

  // Same flow as the website: the finished search was persisted for us (that is
  // where responseId comes from), so ask the backend for a short link and hand
  // it to the OS share sheet.
  const onShare = async (turn: Turn) => {
    if (!turn.responseId || sharingKey != null) return;
    setSharingKey(turn.key);
    try {
      const res = await shareContent({ kind: 'search', id: turn.responseId, title: turn.query });
      // A failed mint is usually "you don't own this search" rather than "it
      // doesn't exist", so the contract asks for a generic message. Dismissing
      // the sheet is not a failure worth interrupting for.
      if (res.failure === 'mint') Alert.alert(t('search.error'));
    } finally {
      setSharingKey(null);
    }
  };

  // The taxi card is the one recommendation that counts as a cab booking
  // click: attribute it to this search session, then open the search-surface
  // Kakao booking link — tracking never gates the navigation (web parity).
  const onRecommendationPress = (rec: ServiceRecommendation) => {
    if (rec.service_key === 'taxi') {
      trackEvent({ event_type: 'cab_booking_click', source_type: 'search', source_id: sessionId });
      openTaxiBooking('search');
      return;
    }
    if (rec.deep_link_url && /^https?:/i.test(rec.deep_link_url)) openUrl(rec.deep_link_url);
  };

  const canSend = !busy && !!draft.trim();
  // The bar opens into the bordered card while the field has focus or text.
  const barExpanded = inputFocused || draft.length > 0;

  return (
    <View style={styles.root}>
      {/* Flat #ecf4fe — the one background used across the signed-in shell so
          the page reads as one surface. */}
      <View style={[StyleSheet.absoluteFill, styles.flatBg]} />
      {/* No SafeAreaView here: this screen overlays the tab content area,
          which already sits below the app shell's top inset. The sticky
          container pads the bottom for the nav bar, or lifts the search bar
          above the keyboard while typing. */}
      <KeyboardStickyView style={styles.safe}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={sx(24)} color="#505d6d" />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            {t('search.title')}
          </Text>
          {/* Balances the back button so the title stays centred. */}
          <View style={{ width: sx(44) }} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {turns.map((turn, i) => (
            <TurnBlock
              key={turn.key}
              turn={turn}
              spaced={i > 0}
              isActive={turn.key === activeKey}
              tickerQuery={turn.key === activeKey ? currentQuery : null}
              tickerStyle={tickerStyle}
              sharing={sharingKey === turn.key}
              onAsk={ask}
              onShare={() => onShare(turn)}
              onToggleSources={() => patchTurn(turn.key, (tn) => ({ sourcesOpen: !tn.sourcesOpen }))}
              onRecommendationPress={onRecommendationPress}
            />
          ))}
        </ScrollView>

        {/* Search bar — Figma "Search Bar" in place of the bottom navigation:
            resting, a 48-tall white pill (#cae3fd hairline) holding the mic and
            a muted send disc; focused or holding text, a #527dff-bordered card
            whose field grows with the text and keeps the actions bottom-right.
            The page fades into the bar through a short gradient. Every
            question sent from here continues this chat (same conversation id). */}
        <View style={styles.composerWrap}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(242,249,255,0)', '#f2f9ff']}
            locations={[0, 0.7]}
            style={styles.composerFade}
          />
          {/* One fixed tree in both states, and the field's OWN props never
              change: on Android (Fabric) restyling a focused TextInput's text
              attributes drops its focus the next frame, which is what turned
              the first tap into a dead keyboard. Only the container, the
              action row and the icons switch. The resting pill's 14px
              placeholder is a separate overlay for the same reason. */}
          <View style={barExpanded ? styles.barCard : styles.barPill}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              style={styles.barInput}
              multiline
              textAlignVertical="top"
              returnKeyType="send"
              submitBehavior="submit"
              onSubmitEditing={() => {
                if (canSend) ask(draft);
              }}
            />
            <View style={barExpanded ? styles.barActionsExpanded : styles.barActionsPill}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Voice input"
                onPress={openVoice}
                style={styles.barMic}
                hitSlop={8}
              >
                <SvgXml
                  xml={barExpanded ? SEARCH_BAR_MIC_FOCUSED_SVG : SEARCH_BAR_MIC_SVG}
                  width={sx(24)}
                  height={sx(24)}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                onPress={() => ask(draft)}
                disabled={!canSend}
                style={styles.barSend}
                hitSlop={4}
              >
                <SvgXml xml={canSend ? SEARCH_BAR_SEND_ACTIVE_SVG : SEARCH_BAR_SEND_SVG} width={sx(48)} height={sx(48)} />
              </Pressable>
            </View>
            {!barExpanded ? (
              <Text pointerEvents="none" style={styles.barPlaceholder} numberOfLines={1}>
                {t('search.followUpPlaceholder')}
              </Text>
            ) : null}
          </View>
        </View>
      </KeyboardStickyView>

      <VoiceOverlay
        visible={showVoice}
        onClose={closeVoice}
        transcript={voice.partialText}
        listening={voice.isListening}
      />
    </View>
  );
}

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => {});
};

/** One exchange: the question bubble, the in-flight strip, then whatever the
    stream produced — pinned taxi card, validation / clarification / error
    cards, the answer (with share), related questions and sources. */
function TurnBlock({
  turn,
  spaced,
  isActive,
  tickerQuery,
  tickerStyle,
  sharing,
  onAsk,
  onShare,
  onToggleSources,
  onRecommendationPress,
}: {
  turn: Turn;
  spaced: boolean;
  isActive: boolean;
  tickerQuery: string | null;
  tickerStyle: any;
  sharing: boolean;
  onAsk: (text: string, opts?: { skipResolution?: boolean }) => void;
  onShare: () => void;
  onToggleSources: () => void;
  onRecommendationPress: (rec: ServiceRecommendation) => void;
}) {
  const { t } = useTranslation();
  const { query, validationError, clarification, streaming, category, summary, sources, followups } = turn;
  // The strip leads the results: the category chip stays put once known (it
  // belongs to the answer, not just the loading state), while the loader row
  // inside is stream-scoped — up from the moment the request is fired
  // (`streaming` starts true) until the backend reports the answer complete.
  const showEarlyStrip = streaming && !validationError && !clarification;

  return (
    <View style={spaced ? styles.turnSpaced : undefined}>
      {/* The user's question */}
      <View style={styles.queryBubble}>
        <Text style={styles.queryText}>{query}</Text>
      </View>

      {/* The pipeline's rewrite of the question (turn_act.resolved_query,
          kept on the turn as `interpretedAs`) is deliberately NOT shown — it
          is analytics-only for now; the stream event is recorded with the
          search_query tracking row. */}

      {/* In-flight indicator. The loader appears the instant the stream
          opens — it never waits for a category or a search term — and only
          leaves when the backend says the answer is complete. The category
          chip and the query ticker fill in around it as they arrive. */}
      {showEarlyStrip ? (
        <View style={styles.earlyStrip}>
          {streaming ? (
            <View style={styles.searchingRow}>
              {/* Loading Lottie (SearchResult 12354:57687, 42×42). Vector
                  source with a transparent background — "contain" fits it
                  whole, no crop and nothing to blend against. */}
              <View style={styles.searchingLottieBox}>
                <LottieView
                  source={require('../../assets/lottie/search-loading.json')}
                  style={styles.searchingLottie}
                  autoPlay
                  loop
                  resizeMode="contain"
                />
              </View>
              {/* "Searching for" only reads once there's a search term to
                  show next to it — until the stream populates the queries,
                  the loader animates alone. */}
              {isActive && tickerQuery ? (
                <>
                  <Text style={styles.searchingLabel}>{t('search.searchingFor')}</Text>
                  <Animated.View style={[styles.queryChip, tickerStyle]}>
                    <Ionicons name="search" size={sx(12)} color="#3289C9" />
                    <Text style={styles.queryChipText} numberOfLines={1}>
                      {tickerQuery}
                    </Text>
                  </Animated.View>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Enforced service CTA (web ServiceCTA): pinned taxi card, shown
          once the category has loaded — the strip leads, then the taxi,
          then the answer as it streams in. */}
      {!validationError &&
        !!category &&
        PINNED_RECOMMENDATIONS.map((rec) => (
          <View key={rec.service_key} style={styles.ctaCard}>
            <View style={styles.ctaEmojiWell}>
              <Text style={styles.ctaEmoji}>{rec.emoji}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.ctaTitle}>{rec.title}</Text>
              {rec.body ? (
                <Text style={styles.ctaBody} numberOfLines={2}>
                  {rec.body.trim()}
                </Text>
              ) : null}
              <Pressable style={styles.ctaBtn} onPress={() => onRecommendationPress(rec)}>
                <Text style={styles.ctaBtnText}>{rec.deep_link_label}</Text>
                <Ionicons name="arrow-forward" size={sx(13)} color="#fff" />
              </Pressable>
            </View>
          </View>
        ))}

      {/* Validation / policy block (web): the backend rejected the query —
          gibberish, unsafe or illegal content. */}
      {validationError ? (
        <View
          style={[
            styles.validationCard,
            validationError.severity === 'critical' && styles.validationCardCritical,
          ]}
        >
          <View style={styles.validationHeader}>
            <Ionicons
              name="warning-outline"
              size={sx(20)}
              color={validationError.severity === 'critical' ? '#d32f2f' : '#ed6c02'}
            />
            <Text style={styles.validationTitle}>{t('search.cantAnswerTitle')}</Text>
          </View>
          <Text style={styles.validationMessage}>{validationError.message}</Text>
          {(validationError.legal_reference || validationError.source || validationError.korean_law_url) ? (
            <View style={styles.validationMetaRow}>
              {validationError.legal_reference ? (
                <View style={styles.validationChip}>
                  <Text style={styles.validationChipText}>{validationError.legal_reference}</Text>
                </View>
              ) : null}
              {validationError.source ? (
                <Pressable hitSlop={6} onPress={() => openUrl(validationError.source!)}>
                  <Text style={styles.validationLink}>{t('search.reference')}</Text>
                </Pressable>
              ) : null}
              {validationError.korean_law_url ? (
                <Pressable hitSlop={6} onPress={() => openUrl(validationError.korean_law_url!)}>
                  <Text style={styles.validationLink}>{t('search.koreanLaw')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.validationHint}>{t('search.tryDifferent')}</Text>
        </View>
      ) : null}

      {/* Clarification (Search v2): the backend needs one more detail before
          it can answer. The question replaces the answer card; an option
          chip — or a reply typed in the search bar — continues the chat. */}
      {clarification ? (
        <View style={styles.answerCard}>
          <View style={styles.answerHeader}>
            <Image source={BIRD} style={styles.answerAvatar} resizeMode="contain" />
            <Text style={styles.answerBrand}>Konnect</Text>
          </View>
          <Text style={styles.clarifyQuestion}>{clarification.question}</Text>
          {clarification.options.length > 0 ? (
            <View style={styles.clarifyOptions}>
              {clarification.options.map((opt) => (
                <Pressable key={opt} style={styles.clarifyChip} onPress={() => onAsk(opt)}>
                  <Text style={styles.clarifyChipText}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Error — the gateway's own wording when it sent one (rate limits
          are written for the user), else the generic copy. */}
      {turn.error ? (
        <View style={styles.errorCard}>
          <Ionicons name="cloud-offline-outline" size={sx(20)} color="#ef4444" />
          <Text style={styles.errorText}>{turn.errorMessage || t('search.error')}</Text>
        </View>
      ) : null}

      {/* Answer — Figma Search_QuickAnswer: straight on the page, no card.
          Title + numbered sections, then Related Questions and Sources as
          numbered lists 12 apart, then the share glyph 24 below. */}
      {summary && !validationError ? (
        <View style={styles.answerBlocks}>
          <QuickAnswer text={summary} />

          {followups.length > 0 ? (
            <View style={styles.listBlock}>
              <Text style={styles.listTitle}>{t('search.related')}</Text>
              <View style={styles.listBody}>
                {followups.map((q, i) => (
                  <Pressable key={q} style={styles.listRow} onPress={() => onAsk(q)} hitSlop={4}>
                    <Text style={styles.listNum}>{String(i + 1).padStart(2, '0')}</Text>
                    <Text style={styles.listText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {sources.length > 0 ? (
            <View style={styles.listBlock}>
              <Pressable style={styles.sourcesHeader} onPress={onToggleSources} hitSlop={6}>
                <Text style={styles.listTitle}>{t('search.sources')}</Text>
                <View style={[styles.sourcesChevron, !turn.sourcesOpen && styles.sourcesChevronClosed]}>
                  <SvgXml xml={QUICK_ANSWER_CHEVRON_SVG} width={sx(24.7)} height={sx(23.4)} />
                </View>
              </Pressable>
              {turn.sourcesOpen ? (
                <View style={styles.sourcesList}>
                  {sources.map((src, i) => {
                    // Hermes lacks a full URL implementation — split with a regex.
                    const m = /^https?:\/\/([^/]+)(.*)$/.exec(src.url ?? '');
                    const host = (m?.[1] ?? src.url ?? '').replace(/^www\./, '');
                    const path = (m?.[2] ?? '').replace(/^\//, '').replace(/\/$/, '');
                    return (
                      <Pressable key={src.index ?? i} style={styles.sourceItem} onPress={() => openUrl(src.url)} hitSlop={4}>
                        <View style={styles.sourceRow}>
                          <Text style={styles.sourceNum}>{String(src.index ?? i + 1).padStart(2, '0')}</Text>
                          <Text style={styles.sourceHost} numberOfLines={1}>
                            {host}
                          </Text>
                        </View>
                        {path ? (
                          <Text style={styles.sourcePath} numberOfLines={1}>
                            {path}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Share — only once the search has been persisted, since that id
              is what the short link is minted from. */}
          {turn.responseId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={onShare}
              disabled={sharing}
              hitSlop={10}
              style={[styles.shareBtn, sharing && styles.shareBtnBusy]}
            >
              <SvgXml xml={QUICK_ANSWER_SHARE_SVG} width={sx(30)} height={sx(30)} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 50 },
  // Figma semantic/surface/default.
  flatBg: { backgroundColor: '#f2f9ff' },
  safe: { flex: 1 },
  flex: { flex: 1 },

  sourcesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Onboarding/Navigation/TopBar: 52 tall, pl 4 / pr 20 / py 4, 44 back
  // button with a 24 chevron, Heading/20/SemiBold title.
  topBar: {
    height: sy(52),
    paddingLeft: sx(4),
    paddingRight: sx(20),
    paddingVertical: sy(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: sx(44),
    height: sx(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(20),
    lineHeight: sy(26),
    color: '#1d192b',
    letterSpacing: -0.2,
  },

  // Content Container: 340 wide on the 375 frame (17.5 sides), 20 below the
  // top bar, 20 between turns.
  content: { paddingHorizontal: sx(17.5), paddingTop: sy(20), paddingBottom: sy(24) },
  turnSpaced: { marginTop: sy(20) },

  // Question Section: accent bubble, radius 16 with a square bottom-right,
  // px 16 / py 12, max 304 of 340, Body/14/Regular on #fefefe.
  queryBubble: {
    alignSelf: 'flex-end',
    maxWidth: '89%',
    backgroundColor: '#527dff',
    borderRadius: sx(16),
    borderBottomRightRadius: 0,
    paddingVertical: sy(12),
    paddingHorizontal: sx(16),
    marginBottom: sy(20),
  },
  queryText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: '#fefefe',
    letterSpacing: -0.28,
  },

  // Clarification card (Search v2): question + option chips.
  clarifyQuestion: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(15),
    lineHeight: sy(24),
    color: '#1d192b',
    letterSpacing: -0.1,
  },
  clarifyOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: sx(8), marginTop: sy(12) },
  clarifyChip: {
    paddingVertical: sy(7),
    paddingHorizontal: sx(14),
    borderRadius: 999,
    backgroundColor: '#eaefff',
    borderWidth: 1,
    borderColor: '#c4d2ff',
  },
  clarifyChipText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(13),
    color: '#1342cf',
    letterSpacing: -0.13,
  },

  // Search bar (Figma "Search Bar" component) where the tab bar was. The
  // wrapper is the page colour; a short gradient above it fades the chat in.
  composerWrap: {
    paddingHorizontal: sx(20),
    paddingTop: sy(10),
    paddingBottom: sy(12),
    backgroundColor: '#f2f9ff',
  },
  composerFade: { position: 'absolute', left: 0, right: 0, top: -sy(56), height: sy(56) },
  // Default(F): 48-tall pill, #fefefe on a 1.2 #cae3fd hairline, text from
  // 20 in; the mic (34) + send disc (48) sit over its right end.
  barPill: {
    height: sy(48),
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: '#cae3fd',
    backgroundColor: '#fefefe',
    paddingLeft: sx(20),
    paddingRight: sx(92),
    overflow: 'hidden',
  },
  // Body/14/Medium, content-muted — drawn over the empty field while resting.
  barPlaceholder: {
    position: 'absolute',
    left: sx(20),
    right: sx(92),
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(14),
    lineHeight: sy(20),
    letterSpacing: -0.14,
    color: '#93a5b9',
    includeFontPadding: false,
  },
  // Focused / Typing: 2.5 accent border, radius 20, page-coloured, field
  // (Body/16/Medium) grows to 273 tall, actions bottom-right with a 12 gap.
  barCard: {
    borderRadius: sx(20),
    borderWidth: 2.5,
    borderColor: '#527dff',
    backgroundColor: '#f2f9ff',
    paddingTop: sy(16),
    paddingBottom: sy(8),
    paddingLeft: sx(20),
    paddingRight: sx(12),
    gap: sy(4),
    shadowColor: '#0077ff',
    shadowOpacity: 0.09,
    shadowRadius: 7.6,
    shadowOffset: { width: 2, height: 2 },
    elevation: 3,
  },
  // Body/16/Medium; grows with the text up to 273 (Figma Input Section).
  // Constant in both states — see the note at the field.
  barInput: {
    width: '100%',
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    lineHeight: sy(24),
    letterSpacing: -0.16,
    color: '#1d192b',
    paddingVertical: 0,
    paddingHorizontal: 0,
    minHeight: sy(24),
    maxHeight: sy(273),
    includeFontPadding: false,
  },
  barActionsPill: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(8),
  },
  barActionsExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: sx(12),
    width: '100%',
  },
  barMic: { width: sx(34), height: sx(34), alignItems: 'center', justifyContent: 'center' },
  barSend: { width: sx(48), height: sx(48), alignItems: 'center', justifyContent: 'center' },

  // Early preview (web): category chip + "Searching for" ticker.
  earlyStrip: { marginBottom: sy(12), gap: sy(8) },
  searchingLottieBox: { width: sx(42), height: sx(42) },
  searchingLottie: { width: '100%', height: '100%' },
  searchingRow: { flexDirection: 'row', alignItems: 'center', gap: sx(8), minHeight: sy(26) },
  searchingLabel: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(11),
    color: '#90a4ae',
  },
  queryChip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(5),
    height: sy(24),
    paddingHorizontal: sx(8),
    borderRadius: 999,
    backgroundColor: '#f4f7fa',
    borderWidth: 1,
    borderColor: '#e1e8ef',
  },
  queryChipText: {
    flexShrink: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(11),
    color: '#37474f',
  },

  // Service CTA (web ServiceCTA): light-blue gradient card, emoji well, pill CTA.
  ctaCard: {
    flexDirection: 'row',
    gap: sx(10),
    padding: sx(12),
    borderRadius: sx(10),
    borderWidth: 1,
    borderColor: '#d0e7ff',
    backgroundColor: '#f0f8ff',
    marginBottom: sy(14),
  },
  ctaEmojiWell: {
    width: sx(36),
    height: sx(36),
    borderRadius: 999,
    backgroundColor: '#d9eafc',
    borderWidth: 1,
    borderColor: '#90caf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaEmoji: { fontSize: sx(20) },
  ctaTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(13),
    lineHeight: sy(17),
    color: '#0d47a1',
    marginBottom: sy(2),
  },
  ctaBody: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(12),
    lineHeight: sy(17),
    color: '#37474f',
    marginBottom: sy(8),
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(5),
    backgroundColor: '#1565c0',
    borderRadius: 999,
    paddingVertical: sy(5),
    paddingHorizontal: sx(12),
  },
  ctaBtnText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(12),
    color: '#fff',
  },

  // Validation / policy card (web Alert): amber (warning) or red (critical).
  validationCard: {
    borderWidth: 1,
    borderColor: '#ffcc80',
    backgroundColor: '#fff8ec',
    borderRadius: sx(10),
    padding: sx(14),
    marginBottom: sy(14),
    gap: sy(8),
  },
  validationCardCritical: { borderColor: '#ef9a9a', backgroundColor: '#fdf0ef' },
  validationHeader: { flexDirection: 'row', alignItems: 'center', gap: sx(8) },
  validationTitle: {
    flex: 1,
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(15),
    color: '#5d4037',
    letterSpacing: -0.15,
  },
  validationMessage: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(13),
    lineHeight: sy(19),
    color: '#4e342e',
  },
  validationMetaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: sx(8) },
  validationChip: {
    height: sy(22),
    paddingHorizontal: sx(8),
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  validationChipText: { fontFamily: 'NationalPark_500Medium', fontSize: sx(11), color: '#4e342e' },
  validationLink: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(12),
    color: '#1565c0',
    textDecorationLine: 'underline',
  },
  validationHint: { fontFamily: 'NationalPark_500Medium', fontSize: sx(11), color: '#5d4037' },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(10),
    backgroundColor: '#fef2f2',
    borderRadius: sx(14),
    padding: sx(14),
    marginBottom: sy(14),
  },
  errorText: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(13),
    lineHeight: sy(19),
    color: '#b91c1c',
  },

  // Clarification card (kept as a card — the template has no state for it).
  answerCard: {
    backgroundColor: '#fff',
    borderRadius: sx(20),
    padding: sx(18),
    shadowColor: '#0077ff',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(8),
    marginBottom: sy(12),
  },
  answerAvatar: { width: sx(26), height: sx(26) },
  answerBrand: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(15),
    color: '#527dff',
    letterSpacing: -0.15,
    flex: 1,
  },

  // Answer template (Figma 13253:91524): blocks 12 apart, share 24 below.
  answerBlocks: { gap: sy(12) },
  listBlock: { gap: sy(8) },
  listTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(16),
    lineHeight: sy(24),
    letterSpacing: -0.16,
    color: '#1d192b',
  },
  // Summary Section: px 12 / pb 12, rows 8 apart, "01" + text 12 apart.
  listBody: { paddingHorizontal: sx(12), paddingBottom: sy(12), gap: sy(8) },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: sx(12) },
  listNum: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(14),
    lineHeight: sy(20),
    letterSpacing: -0.14,
    color: '#1d192b',
  },
  listText: {
    flex: 1,
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(14),
    lineHeight: sy(20),
    letterSpacing: -0.14,
    color: '#1d192b',
  },
  sourcesHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sourcesChevron: { width: sx(24.7), height: sx(23.4) },
  sourcesChevronClosed: { transform: [{ rotate: '180deg' }] },
  sourcesList: { gap: sy(8) },
  sourceItem: { paddingHorizontal: sx(12), gap: sy(4) },
  sourceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: sx(12) },
  sourceNum: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(13),
    lineHeight: sy(16),
    letterSpacing: -0.13,
    color: '#332d41',
  },
  sourceHost: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(13),
    lineHeight: sy(16),
    letterSpacing: -0.13,
    color: '#332d41',
  },
  sourcePath: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(13),
    lineHeight: sy(16),
    letterSpacing: -0.13,
    color: '#657586',
  },
  shareBtn: { width: sx(30), height: sx(30), marginTop: sy(12) },
  shareBtnBusy: { opacity: 0.5 },
});
