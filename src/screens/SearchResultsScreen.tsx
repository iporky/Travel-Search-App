import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
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

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const BIRD = onboardingSource(
  require('../../assets/mascot/bird-hero.png') as ImageSourcePropType,
  'bird-hero',
);

interface Props {
  query: string;
  onBack: () => void;
  /** Submit a follow-up query (replaces the current results). */
  onAsk: (query: string) => void;
}

// ── Lightweight renderer for the summary's markdown-ish text ────────────────
// Handles: "### " headings, "- " bullets, **bold** inline, [Web N] citations.
function InlineText({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[Web \d+\])/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={mdStyles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (/^\[Web \d+\]$/.test(part)) {
          return (
            <Text key={i} style={mdStyles.citation}>
              {' '}{part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

function FormattedSummary({ text }: { text: string }) {
  const blocks = useMemo(() => text.split('\n').map((l) => l.trimEnd()), [text]);
  return (
    <View style={mdStyles.container}>
      {blocks.map((line, i) => {
        if (!line.trim()) return <View key={i} style={mdStyles.gap} />;
        if (line.startsWith('### ')) {
          return <InlineText key={i} text={line.slice(4)} style={mdStyles.h3} />;
        }
        if (line.startsWith('- ')) {
          return (
            <View key={i} style={mdStyles.bulletRow}>
              <Text style={mdStyles.bulletDot}>•</Text>
              <InlineText text={line.slice(2)} style={[mdStyles.body, mdStyles.bulletText]} />
            </View>
          );
        }
        return <InlineText key={i} text={line} style={mdStyles.body} />;
      })}
    </View>
  );
}

export function SearchResultsScreen({ query, onBack, onAsk }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [streaming, setStreaming] = useState(true);
  const [progress, setProgress] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ServiceRecommendation[]>([]);
  const [summary, setSummary] = useState('');
  const [sources, setSources] = useState<SearchSource[]>([]);
  const [followups, setFollowups] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<ConfidenceIndicator | null>(null);
  const [error, setError] = useState<string | null>(null);

  // One session id per screen instance so follow-ups share a session.
  const sessionId = useRef(makeSessionId()).current;

  // Gentle bobbing for the mascot while the pipeline works.
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -sy(10)] });

  useEffect(() => {
    // Reset per query.
    setStreaming(true);
    setProgress(null);
    setRecommendations([]);
    setSummary('');
    setSources([]);
    setFollowups([]);
    setConfidence(null);
    setError(null);

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
            case 'worker_progress':
              if (event.data?.message) setProgress(String(event.data.message));
              break;
            case 'service_recommendations':
              if (Array.isArray(event.data?.recommendations)) {
                setRecommendations(event.data.recommendations);
              }
              break;
            case 'final_summary_chunk':
              if (event.data?.chunk) setSummary((prev) => prev + event.data.chunk);
              break;
            case 'final_summary':
              // Authoritative full text — replaces accumulated chunks.
              if (event.data?.summary) setSummary(event.data.summary);
              if (Array.isArray(event.data?.sources)) setSources(event.data.sources);
              setProgress(null);
              break;
            case 'followup_questions':
              if (Array.isArray(event.data?.questions)) setFollowups(event.data.questions);
              break;
            case 'confidence_indicator':
              setConfidence(event.data);
              break;
            case 'metadata':
              setStreaming(false);
              setProgress(null);
              break;
            default:
              // category, search_queries, keepalive, quality_score, … — not rendered.
              break;
          }
        },
        onDone: () => {
          setStreaming(false);
          setProgress(null);
        },
        onError: (e) => {
          setStreaming(false);
          setProgress(null);
          setError(e.message);
        },
      },
    );

    return () => handle.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const showLoadingHero = streaming && !summary && recommendations.length === 0 && !error;

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

          {/* Service recommendation cards — often the first thing to arrive */}
          {recommendations.map((rec) => (
            <View key={rec.service_key} style={styles.recCard}>
              <View style={styles.recHeader}>
                <Text style={styles.recEmoji}>{rec.emoji}</Text>
                <View style={styles.flex}>
                  <Text style={styles.recTitle}>{rec.title}</Text>
                  <Text style={styles.recBrand}>{rec.display_name}</Text>
                </View>
              </View>
              <Text style={styles.recBody}>{rec.body.trim()}</Text>
              <Pressable style={styles.recBtn} onPress={() => openUrl(rec.deep_link_url)}>
                <Text style={styles.recBtnText}>{rec.deep_link_label}</Text>
                <Ionicons name="arrow-forward" size={sx(14)} color="#fff" />
              </Pressable>
            </View>
          ))}

          {/* Loading hero while nothing has arrived yet */}
          {showLoadingHero ? (
            <View style={styles.loadingWrap}>
              <Animated.Image
                source={BIRD}
                style={[styles.loadingBird, { transform: [{ translateY: bobY }] }]}
                resizeMode="contain"
              />
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#527dff" />
                <Text style={styles.loadingText}>{progress ?? t('search.thinking')}</Text>
              </View>
            </View>
          ) : null}

          {/* Live pipeline progress while the answer is still being built */}
          {!showLoadingHero && streaming && progress ? (
            <View style={styles.progressRow}>
              <ActivityIndicator size="small" color="#527dff" />
              <Text style={styles.progressText}>{progress}</Text>
            </View>
          ) : null}

          {/* Error */}
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={sx(20)} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Answer card */}
          {summary ? (
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

const mdStyles = StyleSheet.create({
  container: { gap: sy(2) },
  gap: { height: sy(10) },
  h3: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(16),
    lineHeight: sy(24),
    color: '#1d192b',
    letterSpacing: -0.16,
    marginTop: sy(6),
  },
  body: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(15),
    lineHeight: sy(24),
    color: '#1d192b',
    letterSpacing: -0.1,
  },
  bold: { fontFamily: 'NationalPark_700Bold' },
  citation: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(11),
    color: '#527dff',
  },
  bulletRow: { flexDirection: 'row', gap: sx(8), paddingRight: sx(8) },
  bulletDot: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(15),
    lineHeight: sy(24),
    color: '#527dff',
  },
  bulletText: { flex: 1 },
});

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

  recCard: {
    backgroundColor: '#fff',
    borderRadius: sx(18),
    padding: sx(16),
    marginBottom: sy(14),
    shadowColor: '#0077ff',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: sx(10) },
  recEmoji: { fontSize: sx(28) },
  recTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(16),
    color: '#1d192b',
    letterSpacing: -0.16,
  },
  recBrand: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(12),
    color: '#657586',
  },
  recBody: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: '#3a4657',
    marginTop: sy(8),
  },
  recBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(6),
    backgroundColor: '#527dff',
    borderRadius: 999,
    paddingVertical: sy(8),
    paddingHorizontal: sx(16),
    marginTop: sy(12),
  },
  recBtnText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(13),
    color: '#fff',
    letterSpacing: -0.13,
  },

  loadingWrap: {
    alignItems: 'center',
    paddingTop: sy(40),
    gap: sy(20),
  },
  loadingBird: { width: sx(120), height: sy(96) },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: sx(10) },
  loadingText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(15),
    color: '#657586',
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(10),
    paddingVertical: sy(10),
    paddingHorizontal: sx(4),
  },
  progressText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(13),
    color: '#657586',
  },

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
