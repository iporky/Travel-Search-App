import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  Keyboard,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { PaperAirplaneIcon } from 'react-native-heroicons/solid';
import { useTranslation } from 'react-i18next';
import { VoiceOverlay } from '../components/VoiceOverlay';
import { AskOptions, SearchRequest, SearchResultsScreen } from './SearchResultsScreen';

/** A search another tab hands to Home (App.tsx `homeQuery`). */
export interface HomeSearchRequest {
  query: string;
  /** Thread to continue (History follow-up); null/omitted starts a new one. */
  conversationId?: string | null;
}
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useAutocomplete } from '../hooks/useAutocomplete';
import { AutocompleteSuggestion, stageAutocompleteOutcome, ShownSuggestion } from '../api/autocomplete';
import { AUTOCOMPLETE_SEARCH_SVG } from '../assets/autocompleteAssets';
import { DotsLoader } from '../components/DotsLoader';
import { colors } from '../theme/tokens';
import { onboardingSource } from '../assets/onboardingAssets';
import { ReceiptStepsBanner } from '../components/ReceiptStepsBanner';
import { CashbackFlowScreen } from './cashback/CashbackFlowScreen';
import { track } from '../api/tracking';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;
const SEARCH_MIN_HEIGHT = sy(68);
const SEARCH_MAX_HEIGHT = sy(348);

// Expanded search composer metrics. One set of constants feeds BOTH the
// styles and the height math, and everything is derived from the text's real
// rendered line box (which follows the user's system font size via
// fontScale) rather than the screen height alone. When the two drift apart —
// the old paddings were sy()-scaled while the text wasn't — the input's frame
// ends up shorter than its content and Android scrolls the first line up
// under the composer's top border to keep the cursor visible, cropping the
// text on shorter/narrower phones and larger font settings.
const FONT_SCALE = PixelRatio.getFontScale();
const COMPOSER_FONT_SIZE = sx(16);
const COMPOSER_LINE_HEIGHT = sx(30); // style value; RN multiplies by fontScale
const COMPOSER_LINE_BOX = Math.ceil(COMPOSER_LINE_HEIGHT * FONT_SCALE);
const COMPOSER_BORDER = 2;
// Top padding grows with the line box so ascenders always clear the border.
const COMPOSER_PAD_TOP = Math.max(sy(10), Math.ceil(COMPOSER_LINE_BOX * 0.3));
// Bottom padding must clear the 40dp attach/send button row.
const COMPOSER_PAD_BOTTOM = Math.max(sy(50), sx(40) + sy(10));
const COMPOSER_VPAD = COMPOSER_PAD_TOP + COMPOSER_PAD_BOTTOM + COMPOSER_BORDER * 2;
// A single line must always fit, whatever the device's font scale.
const COMPOSER_MIN_HEIGHT = Math.max(SEARCH_MIN_HEIGHT, COMPOSER_LINE_BOX + COMPOSER_VPAD);
const COMPOSER_MAX_HEIGHT = Math.max(SEARCH_MAX_HEIGHT, COMPOSER_MIN_HEIGHT);

const LOGO = onboardingSource(
  require('../../assets/onboarding/logo.png') as ImageSourcePropType,
  'logo',
);
const BIRD = onboardingSource(
  require('../../assets/mascot/bird-hero.png') as ImageSourcePropType,
  'bird-hero',
);
const SEARCH_MIC_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.001 7.00244V11.0024C17.001 13.7638 14.7624 16.0024 12.001 16.0024C9.23956 16.0024 7.00098 13.7638 7.00098 11.0024V7.00244C7.00098 4.24102 9.23956 2.00244 12.001 2.00244C14.7624 2.00244 17.001 4.24102 17.001 7.00244Z" fill="#D8ECFB" stroke="#D8ECFB" stroke-width="1.5" stroke-linecap="round"/><path d="M20.001 11.0024C20.001 15.4207 16.4193 19.0024 12.001 19.0024M12.001 19.0024C7.5827 19.0024 4.00098 15.4207 4.00098 11.0024M12.001 19.0024V22.0024M12.001 22.0024H15.001M12.001 22.0024H9.00098" stroke="#D8ECFB" stroke-width="1.71429" stroke-linecap="round"/></svg>`;

type HomeScreenProps = {
  /** When set (About page's place name, a History follow-up), run this
      search on arrival — inside `conversationId`'s thread when given. */
  initialQuery?: HomeSearchRequest | null;
  onInitialQueryConsumed?: () => void;
  /** Reports when the results chat is open so the app hides the tab bar. */
  onFullScreen?: (full: boolean) => void;
};

export function HomeScreen({ initialQuery, onInitialQueryConsumed, onFullScreen }: HomeScreenProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language } = useLanguage();
  // Both search surfaces are absolutely positioned, and this app is edge-to-edge
  // (the window never resizes for the keyboard), so they must be lifted manually.
  const keyboardHeight = useKeyboardHeight();

  const [query, setQuery] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerHeight, setComposerHeight] = useState(COMPOSER_MIN_HEIGHT);
  // When set, the full-screen search results chat is shown for this request.
  const [searchRequest, setSearchRequest] = useState<SearchRequest | null>(null);
  // The results chat replaces the bottom navigation with its own search bar.
  useEffect(() => {
    onFullScreen?.(!!searchRequest);
  }, [searchRequest, onFullScreen]);
  // Taxi-cashback banner flow (Figma "Banner popup") over the Home screen.
  const [cashbackOpen, setCashbackOpen] = useState(false);
  // Height left for the steps banner once the header, greeting and the
  // reserved dock footprint are laid out; the banner scales itself into it.
  const [bannerSpace, setBannerSpace] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const overlayInputRef = useRef<TextInput>(null);
  // Autocomplete for the sheet's composer (Figma "Auto complete" 12900:60306):
  // trending until two characters are typed, then debounced suggestions.
  const autocomplete = useAutocomplete(query, composerExpanded);
  // What the list showed at the moment a search was submitted — reported
  // as the autocomplete outcome once the search itself has been recorded.
  const shownRef = useRef<ShownSuggestion[]>([]);
  useEffect(() => {
    shownRef.current =
      autocomplete.status === 'results'
        ? autocomplete.suggestions.map((sug) => ({ text: sug.text, match_type: sug.match_type }))
        : [];
  }, [autocomplete]);

  // A query handed in from another tab (About page place name) runs at once.
  useEffect(() => {
    if (!initialQuery) return;
    runSearch(initialQuery.query, null, { conversationId: initialQuery.conversationId ?? null });
    onInitialQueryConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Runs a search: collapses the composer and opens the results screen.
  // `selected` is the autocomplete chip that was tapped, if any; `opts`
  // carries a follow-up's flags (search as typed).
  const runSearch = (text: string, selected: string | null = null, opts?: AskOptions) => {
    const q = text.trim();
    if (!q) return;
    stageAutocompleteOutcome({
      finalQuery: q,
      suggestionsShown: shownRef.current,
      selectedSuggestion: selected,
    });
    setShowVoice(false);
    setComposerExpanded(false);
    setComposerHeight(COMPOSER_MIN_HEIGHT);
    setQuery('');
    Keyboard.dismiss();
    setSearchRequest({
      query: q,
      skipResolution: !!opts?.skipResolution,
      conversationId: opts?.conversationId ?? null,
      key: Date.now(),
    });
  };

  // Voice: keeps listening until 2s of silence, then submits + navigates.
  const voice = useVoiceRecognition(language.voiceLocale, {
    silenceMs: 2000,
    onResult: (text) => runSearch(text),
  });

  const SUGGESTIONS = useMemo(
    () => [
      { emoji: '📄', label: t('home.suggestions.visa') },
      { emoji: '🍗', label: t('home.suggestions.chicken') },
      { emoji: '🪩', label: t('home.suggestions.taxi') },
    ],
    [t],
  );

  const TRENDING_SEARCHES = useMemo(
    () => [
      { emoji: '🎤', label: t('home.trending.kpop') },
      { emoji: '🍜', label: t('home.trending.food') },
      { emoji: '💄', label: t('home.trending.beauty') },
      { emoji: '🍁', label: t('home.trending.autumn') },
    ],
    [t],
  );

  // Surface only real permission errors; transient recognizer errors are
  // handled inside the hook (it keeps the mic alive).
  useEffect(() => {
    if (!voice.error) return;
    if (!voice.error.toLowerCase().includes('permission')) return;
    setShowVoice(false);
    Alert.alert(t('voice.permissionDenied'));
  }, [voice.error, t]);

  const openVoice = async () => {
    setShowVoice(true);
    const started = await voice.start();
    if (!started) {
      setShowVoice(false);
    }
  };

  const closeVoice = async () => {
    await voice.stop();
    setShowVoice(false);
  };

  const handleSubmit = () => {
    runSearch(query);
  };

  const handleComposerBlur = () => {
    if (!composerExpanded) return;
  };

  const handleComposerContentSize = (contentHeight: number) => {
    if (!composerExpanded) return;
    // The frame is content + the exact chrome around it (paddings + borders).
    // Anything less and the native input scrolls the first line under the top
    // border to keep the cursor visible.
    const nextHeight = Math.max(
      COMPOSER_MIN_HEIGHT,
      Math.min(COMPOSER_MAX_HEIGHT, Math.ceil(contentHeight) + COMPOSER_VPAD),
    );
    setComposerHeight(nextHeight);
  };

  const openSearchOverlay = () => {
    setComposerExpanded(true);
    setComposerHeight(COMPOSER_MIN_HEIGHT);
    inputRef.current?.blur();
    requestAnimationFrame(() => overlayInputRef.current?.focus());
  };

  const closeSearchOverlay = () => {
    setQuery('');
    setComposerExpanded(false);
    setComposerHeight(COMPOSER_MIN_HEIGHT);
    overlayInputRef.current?.blur();
    Keyboard.dismiss();
  };

  const firstName = (user?.name ?? 'traveler').split(' ')[0];

  return (
    <View style={styles.flex}>
      {/* Home is a fixed, non-scrolling screen: everything has to fit the
          viewport, so the banner below scales itself into whatever height is
          left rather than the page growing past the search dock. */}
      <View style={styles.content}>
        {/* Header: logo + beta pill */}
        <View style={styles.header}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={styles.betaPill}>
            <Text style={styles.betaText}>{t('signIn.beta')}</Text>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.hiText}>{t('home.hi', { name: firstName })}</Text>
          <Text style={styles.questionText} numberOfLines={1}>
            {t('home.specialOffer')}
          </Text>
        </View>

        {/* No glow/clouds — the Aug design keeps Home clean on the flat bg. */}

        {/* Receipt-cashback banner (Sep 1 round, 12915:85188) — three numbered
            steps over a "Get started" link, vertically centred in the space
            between the greeting and the search dock. The tap is tracked in its
            own right (receipt_banner_click — monitoring only, channel always
            null; web Home parity), then the flow opens. */}
        <View
          style={styles.bannerWrap}
          onLayout={(e) => setBannerSpace(e.nativeEvent.layout.height)}
        >
          <ReceiptStepsBanner
            availableHeight={bannerSpace}
            onPress={() => {
              track.receiptBannerClick();
              setCashbackOpen(true);
            }}
          />
        </View>

      </View>

      {/* New-user home is intentionally clean (greeting → bird → search pill);
          quick suggestions live in the search overlay's "Trending" list. */}

      {/* Neither search surface is rendered under an open results chat: an
          invisible focusable field there is where Android parks focus the
          moment the chat's own field lets go of it. */}
      {!composerExpanded && !searchRequest ? (
        <Animated.View
          entering={FadeIn.duration(220)}
          exiting={FadeOut.duration(140)}
          style={[styles.searchDock, keyboardHeight > 0 && { bottom: keyboardHeight + sy(8) }]}
        >
          {/* Figma Search Bar: solid #527dff with a #5ca8ff inner top rim —
              approximated as a vertical gradient (RN can't inset-shadow). */}
          <LinearGradient
            colors={['#5ca8ff', '#527dff']}
            locations={[0, 0.55]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.searchPill, { height: SEARCH_MIN_HEIGHT }]}
          >
            {/* Balances the mic/send button on the right so the centered
                placeholder stays on the pill's true centre. (The attachment
                "+" that used to sit here is removed until that ships.) */}
            <View style={styles.pillIconBtn} />

            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              onFocus={openSearchOverlay}
              onBlur={handleComposerBlur}
              placeholder={t('home.askPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.75)"
              style={styles.pillInput}
              returnKeyType="search"
            />

            {query.trim() ? (
              <Pressable onPress={handleSubmit} style={styles.pillIconBtn} hitSlop={8}>
                <PaperAirplaneIcon
                  size={sx(20)}
                  color="#fff"
                  style={{ transform: [{ rotate: '-45deg' }] }}
                />
              </Pressable>
            ) : (
              <Pressable onPress={openVoice} style={styles.pillIconBtn} hitSlop={8}>
                <SvgXml xml={SEARCH_MIC_SVG} width={sx(22)} height={sx(22)} />
              </Pressable>
            )}
          </LinearGradient>
        </Animated.View>
      ) : null}

      {/* The search sheet eases in (fade + a short rise of its content) and
          eases out on close, instead of appearing the instant the pill is
          focused; the dock fades away underneath it. */}
      {composerExpanded && !searchRequest ? (
        <Animated.View
          entering={FadeIn.duration(360)}
          exiting={FadeOut.duration(220)}
          style={[styles.searchOverlay, { paddingBottom: keyboardHeight }]}
        >
          {/* Opaque design bg — a translucent scrim let the mascot show
              through (visibly so behind Samsung's semi-transparent keyboard). */}
          <LinearGradient
            pointerEvents="none"
            colors={['#eaf4ff', '#f2f9ff']}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View entering={FadeInDown.duration(420).delay(40)} style={styles.searchOverlayCard}>
            <View style={styles.searchOverlayTopBar}>
              <Pressable onPress={closeSearchOverlay} hitSlop={8} style={styles.searchOverlayBackBtn}>
                <Ionicons name="chevron-back" size={sx(24)} color={colors.gray[1300]} />
              </Pressable>
            </View>

            {autocomplete.status === 'idle' ? (
              <>
                <Text style={styles.overlayHeading}>{t('home.trendingSearches')}</Text>
                <View style={styles.overlayTrendingList}>
                  {TRENDING_SEARCHES.map((item) => (
                    // Tapping a trending keyword searches it straight away
                    // (Home_TrendingSearch) — it is never staged in the composer.
                    <Pressable key={item.label} style={styles.overlayChip} onPress={() => runSearch(item.label)}>
                      <Text style={styles.overlayChipEmoji}>{item.emoji}</Text>
                      <Text style={styles.overlayChipLabel}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : autocomplete.status === 'empty' || autocomplete.status === 'error' ? (
              // Search_Autocomplete_NoResult / _Error: a centred two-line note;
              // the composer keeps working either way.
              <View style={styles.acMessage}>
                <Text style={styles.acMessageTitle}>
                  {t(autocomplete.status === 'empty' ? 'home.autocomplete.noResultsTitle' : 'home.autocomplete.errorTitle')}
                </Text>
                <Text style={styles.acMessageBody}>
                  {t(autocomplete.status === 'empty' ? 'home.autocomplete.noResultsBody' : 'home.autocomplete.errorBody')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.overlayHeading}>{t('home.autocomplete.trySearching')}</Text>
                {autocomplete.status === 'loading' ? (
                  <DotsLoader style={styles.acLoader} />
                ) : (
                  // Suggestions scroll vertically; tapping one runs the search at once.
                  <ScrollView
                    style={styles.acScroll}
                    contentContainerStyle={styles.acList}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                  >
                    {autocomplete.suggestions.map((sug) => (
                      <SuggestionChip
                        key={sug.text}
                        suggestion={sug}
                        typed={autocomplete.forQuery}
                        onPress={() => runSearch(sug.text, sug.text)}
                      />
                    ))}
                  </ScrollView>
                )}
              </>
            )}

            {/* Android reports the keyboard height in one step; slide the
                composer up with it rather than jumping. */}
            <Animated.View layout={LinearTransition.duration(260)} style={styles.overlayComposerWrap}>
              <View style={[styles.overlayComposer, { height: composerHeight }]}>
                <TextInput
                  ref={overlayInputRef}
                  value={query}
                  onChangeText={setQuery}
                  onContentSizeChange={(e) => handleComposerContentSize(e.nativeEvent.contentSize.height)}
                  multiline
                  placeholder=""
                  style={styles.overlayComposerInput}
                  textAlignVertical="top"
                  returnKeyType="default"
                />

                <Pressable onPress={handleSubmit} style={styles.overlayComposerRightBtn} hitSlop={8}>
                  <Ionicons name="arrow-up" size={sx(18)} color="#fff" />
                </Pressable>
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      ) : null}

      <VoiceOverlay
        visible={showVoice}
        onClose={closeVoice}
        transcript={voice.partialText}
        listening={voice.isListening}
      />

      {searchRequest ? (
        <SearchResultsScreen request={searchRequest} onBack={() => setSearchRequest(null)} />
      ) : null}

      {cashbackOpen ? <CashbackFlowScreen onClose={() => setCashbackOpen(false)} /> : null}
    </View>
  );
}

/**
 * One autocomplete chip (Figma "Suggestion Chip" 92:3774, small): search
 * glyph + the suggestion, with the part the person already typed in extra
 * bold so the eye lands on what the suggestion adds.
 */
function SuggestionChip({
  suggestion,
  typed,
  onPress,
}: {
  suggestion: AutocompleteSuggestion;
  typed: string;
  onPress: () => void;
}) {
  const text = suggestion.text;
  const q = typed.trim();
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  return (
    <Pressable style={styles.overlayChip} onPress={onPress}>
      <SvgXml xml={AUTOCOMPLETE_SEARCH_SVG} width={sx(24)} height={sx(24)} />
      <Text style={styles.overlayChipLabel} numberOfLines={1}>
        {at >= 0 ? (
          <>
            {text.slice(0, at)}
            <Text style={styles.overlayChipLabelTyped}>{text.slice(at, at + q.length)}</Text>
            {text.slice(at + q.length)}
          </>
        ) : (
          text
        )}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Reserves the search dock's footprint (dock bottom 16 + pill ≈ 56, plus
  // breathing room) so the banner is centred in space that is actually visible.
  content: { flex: 1, paddingBottom: sy(96) },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sx(20),
    paddingTop: sy(20),
    height: sy(55),
    gap: sx(8),
  },
  logo: { width: sx(92), height: sy(15) },
  betaPill: {
    backgroundColor: '#c9e3ff',
    borderRadius: 99,
    paddingHorizontal: sx(6),
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  betaText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(12),
    color: '#527dff',
    letterSpacing: -0.12,
    lineHeight: sx(15),
  },

  // Figma: 20px gap between the logo row and the greeting (11319:44218).
  greetingBlock: {
    paddingHorizontal: sx(20),
    paddingTop: sy(20),
  },
  hiText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    lineHeight: sx(21),
    color: '#657586',
    letterSpacing: -0.16,
  },
  // Heading/24/Semibold on a single line, 8 under the greeting (12915:85182).
  questionText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(24),
    lineHeight: sx(30),
    color: '#1d192b',
    letterSpacing: -0.24,
    marginTop: sy(8),
  },

  // Figma: bird top ≈335 of 812 — pushed down into the free middle area.
  // Flat screen background = the handswave Lottie's own frame color.
  // Centred in the space left between the greeting and the reserved dock
  // footprint, which lands the 372-tall steps banner at the design's y≈216.
  bannerWrap: { flex: 1, justifyContent: 'center' },
  // Figma Ellipse 2099 (375×131 @ y≈478): soft white halo behind the mascot.
  birdGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: sy(370),
    height: sy(230),
  },

  suggestions: {
    paddingHorizontal: 0,
    gap: sy(8),
  },
  suggestionsDock: {
    position: 'absolute',
    left: sx(20),
    right: sx(20),
    bottom: sy(92),
    zIndex: 6,
  },
  suggestionsTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(14),
    lineHeight: sx(20),
    color: '#657586',
    letterSpacing: -0.14,
    marginBottom: sy(4),
  },
  suggestionRow: {
    backgroundColor: '#fefefe',
    borderRadius: sx(16),
    paddingLeft: sx(16),
    paddingRight: sx(20),
    paddingVertical: sy(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(12),
  },
  suggestionEmoji: {
    fontSize: sx(14),
    lineHeight: sx(20),
  },
  suggestionLabel: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(14),
    lineHeight: sx(20),
    color: '#332d41',
    letterSpacing: -0.14,
  },

  searchDock: {
    position: 'absolute',
    left: sx(20),
    right: sx(20),
    bottom: sy(16),
  },
  // Figma shadow/Input/default: 0 14 40 rgba(0,119,255,0.2).
  searchPill: {
    borderRadius: sx(40),
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: sx(12),
    paddingRight: sx(16),
    gap: sx(8),
    shadowColor: '#0077ff',
    shadowOpacity: 0.2,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    justifyContent: 'flex-end',
  },
  // Figma "Short answer" (10092:45139): the sheet fills the space between the
  // top of the screen and the keyboard — trending pinned top, composer bottom.
  // A fixed minHeight here overflowed shorter screens once the keyboard opened,
  // pushing the close button and heading off-screen.
  searchOverlayCard: {
    flex: 1,
    paddingHorizontal: sx(20),
    paddingTop: sy(12),
    paddingBottom: sy(20),
  },
  // Onboarding/Navigation/TopBar: 44×44 back button, 4px in from the edge.
  searchOverlayTopBar: {
    height: sx(44),
    marginLeft: -sx(16),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  searchOverlayBackBtn: {
    width: sx(44),
    height: sx(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Heading/24/Bold (Figma 12900:60319 / :60336).
  overlayHeading: {
    marginTop: sy(6),
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(24),
    lineHeight: sx(30),
    color: colors.gray[1300],
    letterSpacing: -0.24,
    includeFontPadding: false,
  },
  overlayTrendingList: {
    marginTop: sy(16),
    gap: sy(6),
  },
  // Suggestion Chip (small): 32 tall, radius 24, 12px sides, 12px gap.
  overlayChip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    height: sx(32),
    backgroundColor: colors.surface.card,
    borderRadius: sx(24),
    paddingHorizontal: sx(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(12),
  },
  overlayChipEmoji: {
    fontSize: sx(14),
    lineHeight: sx(20),
    includeFontPadding: false,
  },
  // Body/14/Semibold, Semantic/Content/primary.
  overlayChipLabel: {
    flexShrink: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(14),
    lineHeight: sx(20),
    color: colors.text.primary,
    letterSpacing: -0.14,
    includeFontPadding: false,
  },
  overlayChipLabelTyped: {
    fontFamily: 'NationalPark_800ExtraBold',
  },
  acScroll: {
    marginTop: sy(16),
    flexGrow: 0,
    flexShrink: 1,
  },
  acList: {
    gap: sy(8),
    alignItems: 'flex-start',
    paddingBottom: sy(4),
  },
  acLoader: {
    marginTop: sy(16),
    marginLeft: sx(4),
  },
  // Search_Autocomplete_NoResult / _Error message block.
  acMessage: {
    marginTop: sy(80),
    paddingHorizontal: sx(24),
    alignItems: 'center',
    gap: sy(6),
  },
  acMessageTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(20),
    lineHeight: sx(26),
    color: colors.gray[1300],
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  acMessageBody: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(16),
    lineHeight: sx(24),
    color: colors.text.primary,
    letterSpacing: -0.16,
    textAlign: 'center',
  },
  // Anchored above the keyboard; the flex spacer above absorbs leftover height.
  overlayComposerWrap: {
    marginTop: 'auto',
    paddingTop: sy(16),
  },
  overlayComposer: {
    borderRadius: sx(18),
    borderWidth: COMPOSER_BORDER,
    borderColor: '#4f78ff',
    backgroundColor: '#ffffff',
    paddingHorizontal: sx(12),
    // Shared with the height math above — see COMPOSER_* constants. The top
    // padding tracks the rendered line box so text clears the border on every
    // phone and font-size setting.
    paddingTop: COMPOSER_PAD_TOP,
    paddingBottom: COMPOSER_PAD_BOTTOM,
  },
  overlayComposerInput: {
    flex: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: COMPOSER_FONT_SIZE,
    lineHeight: COMPOSER_LINE_HEIGHT,
    color: '#1d192b',
    letterSpacing: -0.18,
    textAlign: 'left',
    // No inner padding of its own (the wrapper owns it), and Android's font
    // padding stays ON so tall ascenders/emoji keep their ascent headroom.
    padding: 0,
  },
  overlayComposerRightBtn: {
    position: 'absolute',
    right: sx(12),
    bottom: sy(10),
    width: sx(32),
    height: sx(32),
    borderRadius: sx(16),
    backgroundColor: '#527dff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconBtn: {
    width: sx(44),
    height: sx(44),
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillIconLeft: {
    position: 'absolute',
    left: sx(8),
    bottom: sy(8),
  },
  pillIconRight: {
    position: 'absolute',
    right: sx(8),
    bottom: sy(8),
  },
  pillInput: {
    flex: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    color: '#fff',
    letterSpacing: -0.16,
    textAlign: 'center',
    // Android clips the NationalPark glyphs' descenders without these.
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingVertical: sy(16),
    paddingHorizontal: sx(12),
  },
});
