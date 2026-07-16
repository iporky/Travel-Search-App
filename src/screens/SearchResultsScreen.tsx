import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
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
import { submitQuery, SearchResult } from '../api/search';
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

export function SearchResultsScreen({ query, onBack, onAsk }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<SearchResult | null>(null);

  // Gentle bobbing for the mascot while loading.
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
    let alive = true;
    setLoading(true);
    setResult(null);
    submitQuery({
      query,
      email: (user as any)?.email,
      outputLanguage: language.label,
      userLat: 37.5665,
      userLng: 126.978,
    })
      .then((r) => {
        if (alive) {
          setResult(r);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [query, user, language.label]);

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

          {loading ? (
            <View style={styles.loadingWrap}>
              <Animated.Image
                source={BIRD}
                style={[styles.loadingBird, { transform: [{ translateY: bobY }] }]}
                resizeMode="contain"
              />
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#527dff" />
                <Text style={styles.loadingText}>{t('search.thinking')}</Text>
              </View>
            </View>
          ) : result ? (
            <>
              {/* Answer card */}
              <View style={styles.answerCard}>
                <View style={styles.answerHeader}>
                  <Image source={BIRD} style={styles.answerAvatar} resizeMode="contain" />
                  <Text style={styles.answerBrand}>Konnect</Text>
                </View>
                <Text style={styles.answerText}>{result.answer}</Text>
              </View>

              {/* Sources */}
              {result.sources.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('search.sources')}</Text>
                  {result.sources.map((s, i) => (
                    <View key={i} style={styles.sourceCard}>
                      <Ionicons name="document-text-outline" size={sx(18)} color="#527dff" />
                      <View style={styles.flex}>
                        <Text style={styles.sourceTitle}>{s.title}</Text>
                        <Text style={styles.sourceSnippet}>{s.snippet}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {/* Related questions */}
              {result.related.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('search.related')}</Text>
                  {result.related.map((q) => (
                    <Pressable key={q} style={styles.relatedRow} onPress={() => onAsk(q)}>
                      <Text style={styles.relatedText}>{q}</Text>
                      <Ionicons name="arrow-forward" size={sx(16)} color="#93a5b9" />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.loadingText}>{t('search.error')}</Text>
          )}
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
  },
  answerText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(15),
    lineHeight: sy(24),
    color: '#1d192b',
    letterSpacing: -0.1,
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
    alignItems: 'flex-start',
  },
  sourceTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(14),
    color: '#1d192b',
    letterSpacing: -0.14,
  },
  sourceSnippet: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(13),
    lineHeight: sy(19),
    color: '#657586',
    marginTop: sy(3),
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
