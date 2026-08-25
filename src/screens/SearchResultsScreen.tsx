import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  ImageSourcePropType,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
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
import { FormattedSummary } from '../components/FormattedAnswer';

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

/** Backend blocked/failed to validate the query (gibberish, unsafe, illegal). */
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

interface Props {
  query: string;
  onBack: () => void;
  /** Submit a follow-up query (replaces the current results). */
  onAsk: (query: string) => void;
}

// The markdown-ish answer renderer is shared with the History accordion —
// see src/components/FormattedAnswer.tsx.

export function SearchResultsScreen({ query, onBack, onAsk }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [streaming, setStreaming] = useState(true);
  // Enforced taxi card — never replaced by backend payloads (web parity).
  const recommendations = PINNED_RECOMMENDATIONS;
  const [category, setCategory] = useState<string | null>(null);
  const [searchQueries, setSearchQueries] = useState<string[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [followups, setFollowups] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<ConfidenceIndicator | null>(null);
  const [error, setError] = useState(false);

  // One session id per screen instance so follow-ups share a session.
  const sessionId = useRef(makeSessionId()).current;

  // "Searching for" ticker fade (web crossfades queries every 1.6 s, looping).
  const tickerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset per query.
    setStreaming(true);
    setCategory(null);
    setSearchQueries([]);
    setTickerIdx(0);
    setValidationError(null);
    setSummary('');
    setSources([]);
    setFollowups([]);
    setConfidence(null);
    setError(false);

    const handle = streamQuery(
      {
        query,
        email: user?.email || undefined,
        languageCode: language.code,
        sessionId,
        userLat: 37.5665,
        userLng: 126.978,
      },
      {
        onEvent: (event) => {
          switch (event.type) {
            case 'category': {
              const label = event.data?.display_name || event.data?.category;
              if (label) setCategory(String(label).replace(/_/g, ' '));
              break;
            }
            case 'search_queries': {
              const list = normalizeSearchQueries(event.data);
              if (list.length) setSearchQueries(list);
              break;
            }
            case 'service_recommendations':
              // Deliberately ignored — the taxi card is pinned (web parity).
              break;
            case 'final_summary_chunk':
              if (event.data?.chunk) setSummary((prev) => prev + event.data.chunk);
              break;
            case 'final_summary':
              // Authoritative full text — replaces accumulated chunks.
              if (event.data?.summary) setSummary(event.data.summary);
              else if (event.data?.text) setSummary(event.data.text);
              if (Array.isArray(event.data?.sources)) setSources(event.data.sources);
              break;
            case 'summary':
              // Emergency-style responses use `summary` as the canonical
              // answer instead of final_summary (web parity).
              if (event.data?.summary || event.data?.text) {
                setSummary(event.data.summary || event.data.text);
              }
              if (event.data?.status === 'completed') setStreaming(false);
              break;
            case 'followup_questions':
              if (Array.isArray(event.data?.questions)) setFollowups(event.data.questions);
              else if (Array.isArray(event.data)) setFollowups(event.data);
              break;
            case 'confidence_indicator':
              setConfidence(event.data);
              break;
            case 'validation_error':
              // Backend rejected the query (gibberish / unsafe / illegal).
              // Renders the web's error card; the stream keeps flowing so the
              // safer follow-up suggestions after it still arrive.
              setValidationError({
                message: event.data?.message || 'This query could not be processed.',
                severity: event.data?.severity || 'error',
                legal_reference: event.data?.legal_reference ?? null,
                source: event.data?.source ?? null,
                korean_law_url: event.data?.korean_law_url ?? null,
              });
              break;
            case 'metadata':
              // Only `completed` terminates. `validation_failed` arrives
              // BEFORE the validation_error payload — stopping here would
              // leave a blank screen (web parity).
              if (event.data?.status === 'completed') setStreaming(false);
              break;
            default:
              // worker_progress, keepalive, quality_score, … — the design
              // shows only "Searching for" while in flight (web parity).
              break;
          }
        },
        onDone: () => {
          setStreaming(false);
        },
        onError: (e) => {
          setStreaming(false);
          // Show translated copy; the raw exception goes to the log, not the UI.
          console.warn('[search] stream failed', e);
          setError(true);
        },
      },
    );

    return () => handle.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Rotate through the streamed search queries while waiting — loops rather
  // than resting on the last one, until the answer itself appears (web parity).
  useEffect(() => {
    if (searchQueries.length < 2 || summary || validationError) return;
    const id = setTimeout(() => {
      Animated.timing(tickerOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setTickerIdx((i) => (i + 1) % searchQueries.length);
        Animated.timing(tickerOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, 1600);
    return () => clearTimeout(id);
  }, [searchQueries, tickerIdx, summary, validationError, tickerOpacity]);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
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

  const currentQuery = searchQueries.length
    ? searchQueries[tickerIdx % searchQueries.length]
    : null;
  const showEarlyStrip = streaming && !summary && !validationError && (category || currentQuery);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#eaf4ff', '#f2f9ff']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={sx(24)} color="#1d192b" />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            {t('search.title')}
          </Text>
          <View style={{ width: sx(36) }} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* The user's question */}
          <View style={styles.queryBubble}>
            <Text style={styles.queryText}>{query}</Text>
          </View>

          {/* Early preview (web StreamingSearchTemplate): category chip +
              "Searching for <query>" ticker — the only in-flight indicator. */}
          {showEarlyStrip ? (
            <View style={styles.earlyStrip}>
              {category ? (
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{category}</Text>
                </View>
              ) : null}
              {currentQuery ? (
                <View style={styles.searchingRow}>
                  <Text style={styles.searchingLabel}>{t('search.searchingFor')}</Text>
                  <Animated.View style={[styles.queryChip, { opacity: tickerOpacity }]}>
                    <Ionicons name="search" size={sx(12)} color="#3289C9" />
                    <Text style={styles.queryChipText} numberOfLines={1}>
                      {currentQuery}
                    </Text>
                  </Animated.View>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Enforced service CTA (web ServiceCTA): pinned taxi card, visible
              from the first frame and above the answer once it streams in. */}
          {!validationError &&
            recommendations.map((rec) => (
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

          {/* Error */}
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={sx(20)} color="#ef4444" />
              <Text style={styles.errorText}>{t('search.error')}</Text>
            </View>
          ) : null}

          {/* Answer card */}
          {summary && !validationError ? (
            <View style={styles.answerCard}>
              <View style={styles.answerHeader}>
                <Image source={BIRD} style={styles.answerAvatar} resizeMode="contain" />
                <Text style={styles.answerBrand}>Konnect</Text>
                {confidence ? (
                  <View style={styles.confidencePill}>
                    <Text style={styles.confidenceText}>
                      {confidence.badge} {confidence.level}
                    </Text>
                  </View>
                ) : null}
              </View>
              <FormattedSummary text={summary} />
            </View>
          ) : null}

          {/* Sources */}
          {sources.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('search.sources')}</Text>
              {sources.map((s) => {
                // Hermes lacks a full URL implementation — extract host via regex.
                const host = s.url.match(/^https?:\/\/([^/]+)/)?.[1]?.replace(/^www\./, '') ?? s.url;
                return (
                  <Pressable key={s.index} style={styles.sourceCard} onPress={() => openUrl(s.url)}>
                    <View style={styles.sourceTag}>
                      <Text style={styles.sourceTagText}>{s.index}</Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.sourceTitle} numberOfLines={1}>
                        {s.title || host}
                      </Text>
                      <Text style={styles.sourceSnippet} numberOfLines={1}>
                        {s.url}
                      </Text>
                    </View>
                    <Ionicons name="open-outline" size={sx(16)} color="#93a5b9" />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Follow-up questions */}
          {followups.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('search.related')}</Text>
              {followups.map((q) => (
                <Pressable key={q} style={styles.relatedRow} onPress={() => onAsk(q)}>
                  <Text style={styles.relatedText}>{q}</Text>
                  <Ionicons name="arrow-forward" size={sx(16)} color="#93a5b9" />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}


const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 50 },
  safe: { flex: 1 },
  flex: { flex: 1 },

  topBar: {
    height: sy(48),
    paddingHorizontal: sx(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: sx(36),
    height: sx(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(18),
    color: '#1d192b',
    letterSpacing: -0.18,
  },

  content: { paddingHorizontal: sx(20), paddingBottom: sy(40) },

  queryBubble: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: '#527dff',
    borderRadius: sx(20),
    borderBottomRightRadius: sx(6),
    paddingVertical: sy(12),
    paddingHorizontal: sx(16),
    marginTop: sy(8),
    marginBottom: sy(20),
  },
  queryText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(15),
    lineHeight: sy(22),
    color: '#fff',
    letterSpacing: -0.15,
  },

  // Early preview (web): category chip + "Searching for" ticker.
  earlyStrip: { marginBottom: sy(12), gap: sy(8) },
  categoryChip: {
    alignSelf: 'flex-start',
    height: sy(22),
    paddingHorizontal: sx(10),
    borderRadius: 999,
    backgroundColor: '#e8f1fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(11),
    color: '#0d47a1',
    textTransform: 'capitalize',
  },
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
  confidencePill: {
    backgroundColor: '#f0f6ff',
    borderRadius: 999,
    paddingVertical: sy(3),
    paddingHorizontal: sx(10),
  },
  confidenceText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(11),
    color: '#3a4657',
  },

  section: { marginTop: sy(26) },
  sectionTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(16),
    color: '#221e31',
    letterSpacing: -0.16,
    marginBottom: sy(12),
  },
  sourceCard: {
    flexDirection: 'row',
    gap: sx(12),
    backgroundColor: '#fefefe',
    borderRadius: sx(14),
    padding: sx(14),
    marginBottom: sy(10),
    alignItems: 'center',
  },
  sourceTag: {
    width: sx(24),
    height: sx(24),
    borderRadius: 999,
    backgroundColor: '#eaefff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceTagText: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(12),
    color: '#527dff',
  },
  sourceTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(14),
    color: '#1d192b',
    letterSpacing: -0.14,
  },
  sourceSnippet: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(12),
    color: '#93a5b9',
    marginTop: sy(2),
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fefefe',
    borderRadius: sx(14),
    paddingVertical: sy(14),
    paddingHorizontal: sx(16),
    marginBottom: sy(10),
  },
  relatedText: {
    flex: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(14),
    color: '#332d41',
    letterSpacing: -0.14,
    marginRight: sx(12),
  },
});
