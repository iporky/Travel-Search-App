import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../theme/tokens';
import {
  DEFAULT_HISTORY_FILTERS,
  HISTORY_SORTS,
  HISTORY_TIME_RANGES,
  HistoryFilters,
  HistorySort,
  HistoryTimeRange,
} from '../types/history';
import { ConversationSummary } from '../types/conversation';
import { DropdownFilter } from '../components/history/FilterChips';
import { ConversationRow, OPEN_MS } from '../components/history/ConversationRow';
import { HistoryEmptyState } from '../components/history/HistoryEmptyState';
import { HistorySearchScreen } from './history/HistorySearchScreen';
import { ScreenTransition } from '../components/ScreenTransition';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';
import { useLanguage } from '../context/LanguageContext';
import { applyRecentlyViewed, useHistorySections, useConversations } from '../hooks/useConversations';
import { loadViewed, markViewed, ViewedMap } from '../utils/historyViewed';
import { track } from '../api/tracking';
import { PressableScale } from '../components/PressableScale';

// Figma "History for Aug release" (section 12354:55424 revision) — Kiki AI history:
//   • Header: "History" (Heading 35/ExtraBold) + search icon.
//   • Two filter chips — sort (default Newest) and date (default All time) —
//     each opening an action sheet; the chip shows the selected value and the
//     list refreshes on pick.
//   • Rows grouped by month ("August"), each a `Suggestion Chip/L` ACCORDION
//     (History_Expanded 12354:55779): tapping does NOT navigate — it expands
//     in place. Each row is now a Search v2 CONVERSATION; expanded, it shows
//     every question and answer of that thread as a chat transcript.
//   • Empty: bird + "Nothing here?" (no history at all) vs alert icon +
//     "No matching results" (filters return 0).
// Data: GET /api/v2/conversations (+ /{id} on expand), token-scoped
// (Confluence "API Contract: Search v2", page 68288514).

type Props = {
  /** Reports when a full-screen sub-view (search) is open so the app hides the tab bar. */
  onFullScreen?: (full: boolean) => void;
  /** A follow-up chip in a transcript was tapped: run it on the Home tab
      inside that conversation. */
  onAskFollowup: (question: string, conversationId: string) => void;
};

type Mode = { kind: 'list' } | { kind: 'search' };

/** Cell whose frame changes animate (see the SectionList below). Clips so a
    growing or shrinking card reveals or hides its transcript along its edge. */
const AnimatedCell = React.forwardRef<Animated.View, any>(function AnimatedCell(props, ref) {
  return (
    <Animated.View
      {...props}
      ref={ref}
      style={[props.style, cellStyles.clip]}
      layout={LinearTransition.duration(OPEN_MS).easing(Easing.out(Easing.cubic))}
    />
  );
});
const cellStyles = StyleSheet.create({ clip: { overflow: 'hidden' } });

export function HistoryScreen({ onFullScreen, onAskFollowup }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [viewed, setViewed] = useState<ViewedMap>({});
  // Which threads are expanded (accordion; several can be open at once, as in
  // the History_Expanded frame).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const viewedRef = useRef(viewed);
  viewedRef.current = viewed;

  useEffect(() => {
    loadViewed().then(setViewed);
  }, []);

  useEffect(() => onFullScreen?.(mode.kind !== 'list'), [mode.kind, onFullScreen]);

  useEffect(() => {
    if (mode.kind === 'list') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode({ kind: 'list' });
      return true;
    });
    return () => sub.remove();
  }, [mode.kind]);

  const history = useConversations({ filters });
  const ordered = filters.sort === 'recentlyViewed' ? applyRecentlyViewed(history.items, viewed) : history.items;
  // Month-wise sections ("Aug") regardless of the range filter — the per-day
  // "MMM D" grouping for short ranges is parked for now (product call).
  const sections = useHistorySections(ordered, 'month', language.voiceLocale);

  // Expanding counts as "viewing" the thread: it feeds the Recently Viewed
  // sort AND logs the contract's view_search event (source_id = the thread id).
  const noteViewed = useCallback((item: ConversationSummary) => {
    track.viewSearch(item.conversation_id);
    markViewed(item.conversation_id, viewedRef.current).then(setViewed);
  }, []);

  const toggleItem = useCallback(
    (item: ConversationSummary) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.conversation_id)) {
          next.delete(item.conversation_id);
        } else {
          next.add(item.conversation_id);
          noteViewed(item);
        }
        return next;
      });
    },
    [noteViewed],
  );

  const sortOptions = HISTORY_SORTS.map((v) => ({ value: v, label: t(`history.sort.${v}`) }));
  const timeOptions = HISTORY_TIME_RANGES.map((v) => ({ value: v, label: t(`history.time.${v}`) }));

  // ── Sub-views ──────────────────────────────────────────────────────────────
  if (mode.kind === 'search') {
    return (
      <ScreenTransition transitionKey="historySearch" mode="push">
        <HistorySearchScreen
          viewed={viewed}
          onBack={() => setMode({ kind: 'list' })}
          onViewed={noteViewed}
          onAskFollowup={onAskFollowup}
        />
      </ScreenTransition>
    );
  }

  // ── Main list ──────────────────────────────────────────────────────────────
  const filtersAtDefault =
    filters.sort === DEFAULT_HISTORY_FILTERS.sort && filters.time === DEFAULT_HISTORY_FILTERS.time;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('history.title')}</Text>
        <PressableScale style={styles.searchBtn} hitSlop={6} onPress={() => setMode({ kind: 'search' })}>
          <Ionicons name="search" size={24} color={colors.icon.primary} />
        </PressableScale>
      </View>

      <View style={styles.chipsRow}>
        <DropdownFilter
          valueLabel={t(`history.sort.${filters.sort}`)}
          options={sortOptions}
          onSelect={(v) => setFilters((f) => ({ ...f, sort: v as HistorySort }))}
        />
        <DropdownFilter
          valueLabel={t(`history.time.${filters.time}`)}
          options={timeOptions}
          onSelect={(v) => setFilters((f) => ({ ...f, time: v as HistoryTimeRange }))}
        />
      </View>

      {history.loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue[500]} />
        </View>
      ) : history.disabled ? (
        // The server has the conversations feature switched off — nothing to
        // retry, so say so instead of looping on an error.
        <View style={styles.center}>
          <Text style={styles.muted}>{t('history.unavailable')}</Text>
        </View>
      ) : history.error && history.items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{t('history.loadError')}</Text>
          <PressableScale style={styles.retryBtn} onPress={history.refresh}>
            <Text style={styles.retryText}>{t('events.retry')}</Text>
          </PressableScale>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.conversation_id}
          // Each list cell eases to its new frame when a thread expands or
          // collapses (and the rows beneath slide along) — a native frame
          // animation, so it stays smooth while the transcript is heavy.
          CellRendererComponent={AnimatedCell}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.rowGap} />}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionTitle,
                section.key !== sections[0]?.key && styles.sectionTitleSpaced,
              ]}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <ConversationRow
              item={item}
              expanded={expandedIds.has(item.conversation_id)}
              onToggle={toggleItem}
              onAskFollowup={onAskFollowup}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={history.refreshing} onRefresh={history.refresh} tintColor={colors.blue[500]} />
          }
          onEndReached={history.loadMore}
          onEndReachedThreshold={0.6}
          ListEmptyComponent={<HistoryEmptyState kind={filtersAtDefault ? 'noHistory' : 'noMatches'} />}
          ListFooterComponent={
            history.loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.blue[500]} />
              </View>
            ) : (
              <View style={styles.footer} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Transparent: the app-wide surfaceDim gradient shows through (design bg #f2f9ff).
  screen: { flex: 1 },
  // Figma Screen: pt 16 → Header (44 tall, px 20) → 24 gap → Content Area.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    marginTop: spacing[4],
    marginBottom: spacing[6],
    paddingHorizontal: spacing[5],
  },
  headerTitle: {
    fontFamily: 'NationalPark_800ExtraBold',
    fontSize: 35,
    lineHeight: 44,
    letterSpacing: -1.4,
    color: colors.text.primary,
  },
  searchBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Filter row: chips 4 apart, 20 side padding, 20 gap to the first group.
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[5],
    marginBottom: spacing[5],
  },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  // Group: Body/16/Bold title, 16 gap to its rows; groups 24 apart; rows 10 apart.
  sectionTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1300],
    marginBottom: spacing[4],
  },
  sectionTitleSpaced: { marginTop: spacing[6] },
  rowGap: { height: 10 },
  footer: { paddingVertical: spacing[6] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[8] },
  muted: { fontFamily: 'NationalPark_500Medium', fontSize: 14, color: colors.text.disabled, textAlign: 'center' },
  retryBtn: { paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radius.full, backgroundColor: colors.blue[500] },
  retryText: { fontFamily: 'NationalPark_600SemiBold', fontSize: 14, color: colors.gray[100] },
});
