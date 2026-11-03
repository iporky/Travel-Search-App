import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Animated, { Easing, LinearTransition } from 'react-native-reanimated';
import { colors, spacing } from '../../theme/tokens';
import {
  DEFAULT_HISTORY_FILTERS,
  HISTORY_SORTS,
  HISTORY_TIME_RANGES,
  HistoryFilters,
  HistorySort,
  HistoryTimeRange,
} from '../../types/history';
import { ConversationSummary } from '../../types/conversation';
import { DropdownFilter } from '../../components/history/FilterChips';
import { ConversationRow, OPEN_MS } from '../../components/history/ConversationRow';
import { HistoryEmptyState } from '../../components/history/HistoryEmptyState';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';
import { useLanguage } from '../../context/LanguageContext';
import { applyRecentlyViewed, useHistorySections, useConversations } from '../../hooks/useConversations';
import { ViewedMap } from '../../utils/historyViewed';
import { PressableScale } from '../../components/PressableScale';

// Figma History_SearchResult (12354:55449 / 12354:55525): back arrow +
// search field (Onboarding/Input/Field), "245 results for "E7 Visa"" line,
// the same two filter chips, then results grouped by DAY ("August 1") as
// `Suggestion Chip/L` accordion rows — tapping expands the thread's chat
// transcript in place (no navigation). Zero matches → alert icon + "No
// matching results". The conversations API has no keyword search, so the
// keyword is matched against thread titles on the client.

type Props = {
  /** Local "recently viewed" ledger (for that sort option). */
  viewed: ViewedMap;
  onBack: () => void;
  /** Called when a row is expanded (feeds the Recently Viewed ledger). */
  onViewed: (item: ConversationSummary) => void;
  /** A follow-up chip was tapped: ask it in that thread on the Home tab. */
  onAskFollowup: (question: string, conversationId: string) => void;
};

/** Same eased cell frames as the main list (see HistoryScreen). */
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

export function HistorySearchScreen({ viewed, onBack, onViewed, onAskFollowup }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_HISTORY_FILTERS);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleItem = useCallback(
    (item: ConversationSummary) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(item.conversation_id)) {
          next.delete(item.conversation_id);
        } else {
          next.add(item.conversation_id);
          onViewed(item);
        }
        return next;
      });
    },
    [onViewed],
  );

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const hasQuery = debounced.length > 0;
  const history = useConversations({ filters, queryText: debounced, enabled: hasQuery });
  const ordered = filters.sort === 'recentlyViewed' ? applyRecentlyViewed(history.items, viewed) : history.items;
  const sections = useHistorySections(ordered, 'day', language.voiceLocale);

  const sortOptions = HISTORY_SORTS.map((v) => ({ value: v, label: t(`history.sort.${v}`) }));
  const timeOptions = HISTORY_TIME_RANGES.map((v) => ({ value: v, label: t(`history.time.${v}`) }));

  return (
    <KeyboardStickyView style={styles.screen}>
      {/* Onboarding/Navigation/TopBar: back (44) + input field. */}
      <View style={styles.topBar}>
        <PressableScale style={styles.backBtn} hitSlop={8} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.gray[1300]} />
        </PressableScale>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={22} color={colors.gray[900]} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t('history.searchPlaceholder')}
            placeholderTextColor={colors.gray[900]}
            autoFocus
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <PressableScale hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray[700]} />
            </PressableScale>
          )}
        </View>
      </View>

      {/* "245 results for "E7 Visa"" — Caption/12. */}
      {hasQuery && !history.loading && (
        <View style={styles.countRow}>
          <Text style={styles.countStrong}>{t('history.resultsCount', { count: history.total })}</Text>
          <Text style={styles.countMuted}> {t('history.for')} </Text>
          <Text style={styles.countQuery}>"{debounced}"</Text>
        </View>
      )}

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

      {!hasQuery ? (
        <View style={styles.flex} />
      ) : history.loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue[500]} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.conversation_id}
          CellRendererComponent={AnimatedCell}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.rowGap} />}
          renderSectionHeader={({ section }) => (
            <Text
              style={[styles.sectionTitle, section.key !== sections[0]?.key && styles.sectionTitleSpaced]}
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
          onEndReached={history.loadMore}
          onEndReachedThreshold={0.6}
          ListEmptyComponent={<HistoryEmptyState kind="noMatches" />}
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
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.default },
  flex: { flex: 1 },
  // TopBar: pt 16 / pb 4 / pl 4 / pr 20, 12 gap between back and field.
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingLeft: spacing[1],
    paddingRight: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[1],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Onboarding/Input/Field: bg accent-muted #eaefff, radius 8, px 12 / py 8, 6 gap.
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.blue[100],
    borderRadius: 8,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
    padding: 0,
  },
  // Results line: 8 below the bar, px 20; count SemiBold primary, "for" muted, term Bold blue.
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing[5],
    marginTop: spacing[1],
  },
  countStrong: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.primary,
  },
  countMuted: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[700],
  },
  countQuery: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.blue[500],
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[5],
    marginTop: spacing[5],
    marginBottom: spacing[5],
  },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[8] },
});
