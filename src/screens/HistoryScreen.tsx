import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../theme/tokens';
import {
  AiChatFilters,
  BuzzActivity,
  BuzzContentKind,
  BuzzHistoryFilters,
  HistoryGroup,
  HistorySort,
  HistoryTimeRange,
} from '../types/history';
import { aiChatHistory, buzzHistory } from '../mocks/history';
import { DropdownFilter, FilterOption } from '../components/history/FilterChips';
import { HistoryEventCard } from '../components/history/HistoryEventCard';
import { ActionSheetMenu } from '../components/buzz/ActionSheetMenu';
import { HistorySearchScreen } from './history/HistorySearchScreen';
import { ScreenTransition } from '../components/ScreenTransition';

// Figma: History_Kiki Chat (10936:78060) + History_Buzz (10936:77804).
// One screen, two top tabs:
//   • AI Chats — Sort + Time filters only
//   • Buzz — Activity / Content / Sort / Time filters
// Cards grouped chronologically (Today, Yesterday, Last Week). Header, tabs
// and filter bar are all fixed; only the card list scrolls beneath them.

type HistoryTab = 'aiChats' | 'buzz';

const HEADER_H = 56;
const GROUP_ORDER: HistoryGroup[] = ['today', 'yesterday', 'lastWeek', 'older'];

// Which chronological groups a time-range keeps (mock-level approximation).
const RANGE_GROUPS: Record<HistoryTimeRange, HistoryGroup[]> = {
  today: ['today'],
  last7: ['today', 'yesterday', 'lastWeek'],
  last30: ['today', 'yesterday', 'lastWeek', 'older'],
  last3m: ['today', 'yesterday', 'lastWeek', 'older'],
  last6m: ['today', 'yesterday', 'lastWeek', 'older'],
  thisYear: ['today', 'yesterday', 'lastWeek', 'older'],
  allTime: ['today', 'yesterday', 'lastWeek', 'older'],
};

const KIND_ICON: Record<BuzzContentKind, keyof typeof Ionicons.glyphMap> = {
  ping: 'chatbubbles-outline',
  drop: 'image-outline',
  vibe: 'calendar-outline',
};

type Props = {
  /** Reports when the search view is open so the app hides the tab bar. */
  onFullScreen?: (full: boolean) => void;
};

export function HistoryScreen({ onFullScreen }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<HistoryTab>('aiChats');
  const [searching, setSearching] = useState(false);

  const [aiFilters, setAiFilters] = useState<AiChatFilters>({
    sort: 'newest',
    time: 'thisYear',
  });
  const [buzzFilters, setBuzzFilters] = useState<BuzzHistoryFilters>({
    activity: null,
    content: null,
    sort: 'newest',
    time: 'thisYear',
  });

  const [likedAi, setLikedAi] = useState<Record<string, boolean>>(
    () => Object.fromEntries(aiChatHistory.map((i) => [i.id, i.liked])),
  );
  const [likedBuzz, setLikedBuzz] = useState<Record<string, boolean>>(
    () => Object.fromEntries(buzzHistory.map((i) => [i.id, i.liked])),
  );
  const [savedBuzz, setSavedBuzz] = useState<Record<string, boolean>>(
    () => Object.fromEntries(buzzHistory.map((i) => [i.id, i.saved])),
  );
  const [menuFor, setMenuFor] = useState<string | null>(null);

  useEffect(() => onFullScreen?.(searching), [searching, onFullScreen]);

  useEffect(() => {
    if (!searching) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSearching(false);
      return true;
    });
    return () => sub.remove();
  }, [searching]);

  const sortOptions: FilterOption[] = [
    { value: 'newest', label: t('history.sort.newest') },
    { value: 'oldest', label: t('history.sort.oldest') },
    ...(tab === 'buzz'
      ? [{ value: 'recentlyViewed', label: t('history.sort.recentlyViewed') }]
      : []),
  ];
  const timeOptions: FilterOption[] = (
    ['today', 'last7', 'last30', 'last3m', 'last6m', 'thisYear', 'allTime'] as const
  ).map((v) => ({ value: v, label: t(`history.time.${v}`) }));
  const activityOptions: FilterOption[] = (
    ['saved', 'liked', 'myPosts', 'myComments'] as const
  ).map((v) => ({ value: v, label: t(`history.activity.${v}`) }));
  const contentOptions: FilterOption[] = (['ping', 'drop', 'vibe'] as const).map((v) => ({
    value: v,
    label: t(`history.content.${v}`),
  }));

  const aiGroups = useMemo(() => {
    const allowed = RANGE_GROUPS[aiFilters.time];
    const items = aiChatHistory.filter((i) => allowed.includes(i.group));
    const order = aiFilters.sort === 'oldest' ? [...GROUP_ORDER].reverse() : GROUP_ORDER;
    return order
      .map((g) => ({ group: g, items: items.filter((i) => i.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [aiFilters]);

  const buzzGroups = useMemo(() => {
    const allowed = RANGE_GROUPS[buzzFilters.time];
    let items = buzzHistory.filter((i) => allowed.includes(i.group));
    if (buzzFilters.activity) {
      items = items.filter((i) =>
        buzzFilters.activity === 'saved'
          ? savedBuzz[i.id]
          : buzzFilters.activity === 'liked'
            ? likedBuzz[i.id]
            : i.activity === buzzFilters.activity,
      );
    }
    if (buzzFilters.content) items = items.filter((i) => i.kind === buzzFilters.content);
    const order = buzzFilters.sort === 'oldest' ? [...GROUP_ORDER].reverse() : GROUP_ORDER;
    return order
      .map((g) => ({ group: g, items: items.filter((i) => i.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [buzzFilters, likedBuzz, savedBuzz]);

  if (searching) {
    return (
      <ScreenTransition transitionKey="historySearch" mode="push">
        <HistorySearchScreen onBack={() => setSearching(false)} />
      </ScreenTransition>
    );
  }

  const groups = tab === 'aiChats' ? aiGroups : buzzGroups;

  return (
    <View style={styles.screen}>
      {/* Fixed top block: header + tabs + filter bar. Only the list scrolls. */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('history.title')}</Text>
        <Pressable hitSlop={10} onPress={() => setSearching(true)}>
          <Ionicons name="search" size={20} color="#0a1422" />
        </Pressable>
      </View>

      <View style={styles.tabsWrap}>
        <View style={styles.tabs}>
          {(['aiChats', 'buzz'] as const).map((key) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setTab(key)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {t(`history.tabs.${key}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsScroll}
        >
          {tab === 'buzz' && (
            <>
              <DropdownFilter
                label={t('history.filters.activity')}
                valueLabel={
                  buzzFilters.activity
                    ? t(`history.activity.${buzzFilters.activity}`)
                    : t('history.filters.activity')
                }
                active={buzzFilters.activity != null}
                title={t('history.filters.activity')}
                options={activityOptions}
                selected={buzzFilters.activity}
                clearable
                onSelect={(v) =>
                  setBuzzFilters((f) => ({ ...f, activity: v as BuzzActivity | null }))
                }
              />
              <DropdownFilter
                label={t('history.filters.content')}
                valueLabel={
                  buzzFilters.content
                    ? t(`history.content.${buzzFilters.content}`)
                    : t('history.filters.content')
                }
                active={buzzFilters.content != null}
                title={t('history.filters.content')}
                options={contentOptions}
                selected={buzzFilters.content}
                clearable
                onSelect={(v) =>
                  setBuzzFilters((f) => ({ ...f, content: v as BuzzContentKind | null }))
                }
              />
            </>
          )}
          <DropdownFilter
            label={t('history.filters.sort')}
            valueLabel={t(
              `history.sort.${tab === 'aiChats' ? aiFilters.sort : buzzFilters.sort}`,
            )}
            active={(tab === 'aiChats' ? aiFilters.sort : buzzFilters.sort) !== 'newest'}
            title={t('history.filters.sort')}
            options={sortOptions}
            selected={tab === 'aiChats' ? aiFilters.sort : buzzFilters.sort}
            onSelect={(v) => {
              if (!v) return;
              if (tab === 'aiChats') setAiFilters((f) => ({ ...f, sort: v as HistorySort }));
              else setBuzzFilters((f) => ({ ...f, sort: v as HistorySort }));
            }}
          />
          <DropdownFilter
            label={t('history.filters.time')}
            valueLabel={t(
              `history.time.${tab === 'aiChats' ? aiFilters.time : buzzFilters.time}`,
            )}
            active={(tab === 'aiChats' ? aiFilters.time : buzzFilters.time) !== 'thisYear'}
            title={t('history.filters.time')}
            options={timeOptions}
            selected={tab === 'aiChats' ? aiFilters.time : buzzFilters.time}
            onSelect={(v) => {
              if (!v) return;
              if (tab === 'aiChats')
                setAiFilters((f) => ({ ...f, time: v as HistoryTimeRange }));
              else setBuzzFilters((f) => ({ ...f, time: v as HistoryTimeRange }));
            }}
          />
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {groups.length === 0 ? (
          <Text style={styles.empty}>{t('history.empty')}</Text>
        ) : (
          groups.map(({ group, items }) => (
            <View key={group} style={styles.groupBlock}>
              {items.map((item) =>
                'messages' in item ? (
                  <HistoryEventCard
                    key={item.id}
                    caption={t('history.kikiChat')}
                    title={item.title}
                    thumbIcon="sparkles-outline"
                    time={item.time}
                    liked={!!likedAi[item.id]}
                    faded={group === 'lastWeek' || group === 'older'}
                    onPress={() => {}}
                    onToggleLike={() =>
                      setLikedAi((m) => ({ ...m, [item.id]: !m[item.id] }))
                    }
                  />
                ) : (
                  <HistoryEventCard
                    key={item.id}
                    caption={`${t(`history.content.${item.kind}`)} · ${item.category}`}
                    title={item.title}
                    thumbIcon={KIND_ICON[item.kind]}
                    location={item.location}
                    time={item.time}
                    liked={!!likedBuzz[item.id]}
                    saved={!!savedBuzz[item.id]}
                    faded={group === 'lastWeek' || group === 'older'}
                    onPress={() => {}}
                    onToggleLike={() =>
                      setLikedBuzz((m) => ({ ...m, [item.id]: !m[item.id] }))
                    }
                    onLongPress={() => setMenuFor(item.id)}
                  />
                ),
              )}
            </View>
          ))
        )}
      </ScrollView>

      <ActionSheetMenu
        visible={menuFor != null}
        items={
          menuFor
            ? [
                {
                  label: savedBuzz[menuFor]
                    ? t('history.actions.unsave')
                    : t('history.actions.save'),
                  onPress: () =>
                    setSavedBuzz((m) => ({ ...m, [menuFor]: !m[menuFor] })),
                },
              ]
            : []
        }
        onClose={() => setMenuFor(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Figma frame background: #f8f9fb.
  screen: { flex: 1, backgroundColor: '#f8f9fb' },
  header: {
    height: HEADER_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    backgroundColor: 'rgba(248,249,251,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: '#c5c6cc',
  },
  headerTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    color: '#0a1422',
  },
  tabsWrap: { backgroundColor: '#f8f9fb' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: '#c5c6cc',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabBtnActive: { borderBottomColor: '#0a1422' },
  tabText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: '#585f6a',
  },
  tabTextActive: {
    fontFamily: 'NationalPark_600SemiBold',
    color: '#0a1422',
  },
  chipsScroll: { flexGrow: 0 },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: spacing[4],
  },
  listContent: {
    paddingTop: spacing[4],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[16],
    gap: spacing[6],
  },
  groupBlock: { gap: spacing[3] },
  empty: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing[10],
  },
});
