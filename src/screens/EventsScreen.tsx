import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme/tokens';
import { LoadingImage } from '../components/LoadingImage';
import { ScreenTransition } from '../components/ScreenTransition';
import { ApiEventCard } from '../components/events/ApiEventCard';
import { shareContent } from '../utils/share';
import {
  EMPTY_EVENT_FILTERS,
  EventFilters,
  EventFilterSheet,
  isFilterActive,
} from '../components/events/EventFilterSheet';
import { useLanguage } from '../context/LanguageContext';
import { ApiEvent, getEvent, getEvents, getEventsGrouped, track, updateEventEngagement } from '../api/events';
import { openTaxiBooking } from '../utils/taxiBooking';

// Events tab in the Vibes feed layout (Figma 11478:76666): section heading
// with filter icon, 12px-gapped Buzz/Eventcards. Data comes from the live
// events API, lazily paged (GET /events?page&limit — [] marks the end),
// grouped client-side into This week / This month / then per month, with
// wishlisted events pinned in their own section at the top.
// Filter sheet (options icon): a date pick swaps the paged feed for the
// server's selected_time_range bucket; category + popularity apply client-side.

const PAGE_SIZE = 20;

type Mode = { kind: 'feed' } | { kind: 'detail'; id: number };
type Section = { key: string; title: string; data: ApiEvent[] };
type Props = { onFullScreen?: (full: boolean) => void };

export function EventsScreen({ onFullScreen }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { width: winW } = useWindowDimensions();
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'feed' });
  const [detailLoading, setDetailLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const inFlight = useRef(false);
  const [filters, setFilters] = useState<EventFilters>(EMPTY_EVENT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  // Date-filtered result set (server-side range query); null when no date filter.
  const [rangeEvents, setRangeEvents] = useState<ApiEvent[] | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);

  useEffect(() => onFullScreen?.(mode.kind !== 'feed'), [mode.kind, onFullScreen]);

  useEffect(() => {
    if (mode.kind === 'feed') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode({ kind: 'feed' });
      return true;
    });
    return () => sub.remove();
  }, [mode.kind]);

  // ── Lazy loading ───────────────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (p: number, replace: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (replace) {
        if (p === 1 && events.length === 0) setLoading(true);
      } else setLoadingMore(true);
      setError(null);
      try {
        const batch = await getEvents(p, PAGE_SIZE);
        setEvents((cur) => {
          const base = replace ? [] : cur;
          const seen = new Set(base.map((e) => e.id));
          return [...base, ...batch.filter((e) => !seen.has(e.id))];
        });
        setHasMore(batch.length >= PAGE_SIZE);
        setPage(p);
      } catch (e: any) {
        console.warn('[Events] page', p, 'failed', e?.message ?? e);
        if (replace) setError(t('events.loadError'));
      } finally {
        inFlight.current = false;
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  useEffect(() => {
    fetchPage(1, true);
  }, [fetchPage]);

  const refresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchPage(1, true);
  };
  const loadMore = () => {
    if (rangeEvents || !hasMore || loading || loadingMore || inFlight.current) return;
    fetchPage(page + 1, false);
  };

  // ── Date filter → server range query ───────────────────────────────────────
  useEffect(() => {
    if (!filters.day) {
      setRangeEvents(null);
      return;
    }
    let cancelled = false;
    setRangeLoading(true);
    getEventsGrouped({ start: filters.day, end: filters.day })
      .then((g) => {
        if (!cancelled) setRangeEvents(g.selected_time_range ?? []);
      })
      .catch((e) => {
        console.warn('[Events] range failed', e?.message ?? e);
        if (!cancelled) setRangeEvents([]);
      })
      .finally(() => {
        if (!cancelled) setRangeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.day]);

  // ── Client-side filters (category / popularity) ────────────────────────────
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ev of events) {
      const c = normCat(ev.category);
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  }, [events]);

  const source = rangeEvents ?? events;
  const visible = useMemo(() => {
    let list = source;
    if (filters.categories.length) {
      const set = new Set(filters.categories);
      list = list.filter((ev) => set.has(normCat(ev.category)));
    }
    return list;
  }, [source, filters.categories]);
  const filterActive = isFilterActive(filters);

  // A category filter can thin a page down to nothing; keep paging until the
  // visible list has something to show or the feed runs dry.
  useEffect(() => {
    if (rangeEvents || !filters.categories.length) return;
    if (visible.length >= 8 || !hasMore || loading || loadingMore || inFlight.current) return;
    fetchPage(page + 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.length, hasMore, loading, loadingMore, rangeEvents, filters.categories.length]);

  // ── Grouping: wishlist → this week → this month → each later month ─────────
  const sections = useMemo<Section[]>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + (7 - today.getDay()) - 1); // through Saturday
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthFmt = safeMonthFormatter(language.voiceLocale);

    const wishlist: ApiEvent[] = [];
    const thisWeek: ApiEvent[] = [];
    const thisMonth: ApiEvent[] = [];
    const later = new Map<string, { title: string; data: ApiEvent[] }>();

    for (const ev of visible) {
      if (ev.save_status) {
        wishlist.push(ev);
        continue;
      }
      const start = parseDate(ev.start_date ?? ev.date);
      const end = parseDate(ev.end_date) ?? start;
      // An event that's already running counts as "this week".
      const effective = start && start < today && end && end >= today ? today : start;
      if (!effective) {
        thisMonth.push(ev);
        continue;
      }
      if (effective <= weekEnd) thisWeek.push(ev);
      else if (effective <= monthEnd) thisMonth.push(ev);
      else {
        const key = `${effective.getFullYear()}-${String(effective.getMonth() + 1).padStart(2, '0')}`;
        const bucket = later.get(key) ?? { title: monthFmt(effective), data: [] };
        bucket.data.push(ev);
        later.set(key, bucket);
      }
    }

    const out: Section[] = [];
    if (wishlist.length) out.push({ key: 'wishlist', title: t('events.wishlist'), data: wishlist });
    if (thisWeek.length) out.push({ key: 'week', title: t('events.thisWeek'), data: thisWeek });
    if (thisMonth.length) out.push({ key: 'month', title: t('events.thisMonth'), data: thisMonth });
    for (const key of [...later.keys()].sort()) {
      const b = later.get(key)!;
      out.push({ key, title: b.title, data: b.data });
    }
    if (filters.sort) {
      const k = filters.sort === 'mostLiked' ? 'like_count' : filters.sort === 'mostViewed' ? 'view_count' : 'save_count';
      for (const sec of out) sec.data = [...sec.data].sort((a, b) => b[k] - a[k]);
    }
    return out;
  }, [visible, filters.sort, language.voiceLocale, t]);

  // ── Engagement ─────────────────────────────────────────────────────────────
  const patchLocal = (updated: ApiEvent) => {
    const merge = (cur: ApiEvent[]) => cur.map((e) => (e.id === updated.id ? { ...e, ...updated } : e));
    setEvents(merge);
    setRangeEvents((cur) => (cur ? merge(cur) : cur));
  };

  const toggle = async (ev: ApiEvent, field: 'like_status' | 'save_status') => {
    const nextVal = !ev[field];
    const countKey = field === 'like_status' ? 'like_count' : 'save_count';
    patchLocal({ ...ev, [field]: nextVal, [countKey]: Math.max(0, ev[countKey] + (nextVal ? 1 : -1)) });
    if (field === 'like_status') track.eventLike(ev.id, nextVal);
    else track.eventSave(ev.id, nextVal);
    try {
      patchLocal(await updateEventEngagement(ev.id, { [field]: nextVal }));
    } catch (e: any) {
      console.warn('[Events] engagement failed', e?.message ?? e);
      patchLocal(ev);
    }
  };

  const openDetail = async (ev: ApiEvent) => {
    setMode({ kind: 'detail', id: ev.id });
    setDetailLoading(true);
    track.eventView(ev.id);
    try {
      patchLocal(await getEvent(ev.id));
    } catch (e: any) {
      console.warn('[Events] detail failed', e?.message ?? e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Same flow as the website: ask the backend for a short share_url for this
  // event, then hand it to the OS share sheet. Guarded so a double-tap can't
  // mint twice; a failure still opens the sheet with the long link.
  const shareThisEvent = async (ev: ApiEvent) => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareContent({ kind: 'event', id: ev.id, title: ev.text });
    } finally {
      setSharing(false);
    }
  };

  // Same flow as the website's event modal: track the click (source_type
  // event → server-defaulted channel kakao_p1), then open the event-attributed
  // Kakao booking link. Tracking never gates the navigation.
  const bookTaxi = (ev: ApiEvent) => {
    track.cabBookingClick(ev.id);
    openTaxiBooking('event');
  };

  const openSource = (ev: ApiEvent) => {
    if (!ev.sourceUrl) return;
    // Contract row 5: open_event_link, the URL rides in metadata.event_link.
    track.openEventLink(ev.id, ev.sourceUrl);
    Linking.openURL(ev.sourceUrl).catch(() => {});
  };

  // ── Detail ─────────────────────────────────────────────────────────────────
  if (mode.kind === 'detail') {
    const ev = source.find((e) => e.id === mode.id);
    if (ev) {
      return (
        <ScreenTransition transitionKey={`event-${ev.id}`} mode="push">
          <EventDetail
            event={ev}
            loading={detailLoading}
            onBack={() => setMode({ kind: 'feed' })}
            onToggleLike={() => toggle(ev, 'like_status')}
            onToggleSave={() => toggle(ev, 'save_status')}
            onBookTaxi={() => bookTaxi(ev)}
            onOpenSource={() => openSource(ev)}
            onShare={() => shareThisEvent(ev)}
            sharing={sharing}
          />
        </ScreenTransition>
      );
    }
  }

  // ── Feed ───────────────────────────────────────────────────────────────────
  const cardW = winW - spacing[5] * 2 - 4; // design: 346 in a 375 frame

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>{t('events.title')}</Text>
      </View>

      <EventFilterSheet
        visible={filterOpen}
        initial={filters}
        categories={categoryOptions}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilters(f);
          setFilterOpen(false);
        }}
      />

      {loading || rangeLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.blue[500]} />
        </View>
      ) : error && events.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.muted}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchPage(1, true)}>
            <Text style={styles.retryText}>{t('events.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(e) => String(e.id)}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.blue[500]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListHeaderComponent={
            filterActive ? (
              <View style={styles.activeRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activeChips}
                >
                  {filters.day && (
                    <Pressable style={styles.activeChip} onPress={() => setFilters((f) => ({ ...f, day: null }))}>
                      <Ionicons name="calendar-outline" size={14} color={colors.blue[500]} />
                      <Text style={styles.activeChipText}>{formatDay(filters.day, language.voiceLocale)}</Text>
                      <Ionicons name="close" size={14} color={colors.blue[500]} />
                    </Pressable>
                  )}
                  {filters.categories.map((c) => (
                    <Pressable
                      key={c}
                      style={styles.activeChip}
                      onPress={() => setFilters((f) => ({ ...f, categories: f.categories.filter((x) => x !== c) }))}
                    >
                      <Text style={styles.activeChipText}>{c}</Text>
                      <Ionicons name="close" size={14} color={colors.blue[500]} />
                    </Pressable>
                  ))}
                  {filters.sort && (
                    <Pressable style={styles.activeChip} onPress={() => setFilters((f) => ({ ...f, sort: null }))}>
                      <Ionicons name="swap-vertical" size={14} color={colors.blue[500]} />
                      <Text style={styles.activeChipText}>{t(`events.sort.${filters.sort}`)}</Text>
                      <Ionicons name="close" size={14} color={colors.blue[500]} />
                    </Pressable>
                  )}
                </ScrollView>
                <Pressable hitSlop={8} onPress={() => setFilters(EMPTY_EVENT_FILTERS)}>
                  <Text style={styles.clearText}>{t('events.clear')}</Text>
                </Pressable>
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            // Figma "Section Heading" (Filter variant): 20/Bold title + filter icon.
            <View style={styles.sectionHeading}>
              <View style={styles.sectionTitleRow}>
                {section.key === 'wishlist' && (
                  <Ionicons name="bookmark" size={18} color={colors.blue[500]} />
                )}
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {section.key === sections[0]?.key && (
                <Pressable style={styles.filterBtn} hitSlop={10} onPress={() => setFilterOpen(true)}>
                  <Ionicons name="options-outline" size={24} color={colors.icon.primary} />
                  {filterActive && <View style={styles.filterDot} />}
                </Pressable>
              )}
            </View>
          )}
          renderItem={({ item, index, section }) => {
            // Zigzag continues across sections: offset by items before this section.
            const before = sections
              .slice(0, sections.findIndex((s) => s.key === section.key))
              .reduce((n, s) => n + s.data.length, 0);
            return (
              <ApiEventCard
                event={item}
                index={before + index}
                width={cardW}
                onPress={() => openDetail(item)}
                onToggleLike={() => toggle(item, 'like_status')}
                onToggleSave={() => toggle(item, 'save_status')}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={40} color={colors.gray[600]} />
              <Text style={styles.muted}>{t(filterActive ? 'events.noMatches' : 'events.empty')}</Text>
              {filterActive && (
                <View style={styles.emptyActions}>
                  <Pressable style={styles.retryBtn} onPress={() => setFilterOpen(true)}>
                    <Text style={styles.retryText}>{t('events.filters')}</Text>
                  </Pressable>
                  <Pressable style={styles.ghostBtn} onPress={() => setFilters(EMPTY_EVENT_FILTERS)}>
                    <Text style={styles.ghostText}>{t('events.clear')}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.blue[500]} />
              </View>
            ) : (rangeEvents || !hasMore) && visible.length > 0 ? (
              <Text style={[styles.muted, styles.footer]}>{t('events.endOfList')}</Text>
            ) : (
              <View style={styles.footer} />
            )
          }
        />
      )}
    </View>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** "Exhibition / Art" and "Exhibition/Art" are the same bucket upstream. */
function normCat(c: string | null): string {
  return (c ?? '').replace(/\s*\/\s*/g, ' / ').trim();
}

function formatDay(isoDay: string, locale: string): string {
  const d = parseDate(isoDay);
  if (!d) return isoDay;
  try {
    return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
  } catch {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
}

function safeMonthFormatter(locale: string): (d: Date) => string {
  try {
    const f = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
    return (d) => f.format(d);
  } catch {
    const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return (d) => `${names[d.getMonth()]} ${d.getFullYear()}`;
  }
}

// ─── Detail (Vibes EventDetailView layout) ────────────────────────────────────
function EventDetail({
  event,
  loading,
  onBack,
  onToggleLike,
  onToggleSave,
  onBookTaxi,
  onOpenSource,
  onShare,
  sharing,
}: {
  event: ApiEvent;
  loading: boolean;
  onBack: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onBookTaxi: () => void;
  onOpenSource: () => void;
  onShare: () => void;
  sharing: boolean;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.flex}>
      <View style={styles.detailTop}>
        <Pressable style={styles.backBtn} hitSlop={8} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.gray[1300]} />
        </Pressable>
        <View style={styles.detailTopActions}>
          {/* Mints a short link, then opens the OS share sheet. The glyph
              follows each platform's own share affordance. */}
          <Pressable hitSlop={8} onPress={onShare} disabled={sharing}>
            {sharing ? (
              <ActivityIndicator size="small" color={colors.icon.primary} />
            ) : (
              <Ionicons
                name={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'}
                size={24}
                color={colors.icon.primary}
              />
            )}
          </Pressable>
          <Pressable hitSlop={8} onPress={onToggleSave}>
            <Ionicons
              name={event.save_status ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={event.save_status ? colors.blue[500] : colors.icon.primary}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
        {event.image ? <LoadingImage source={{ uri: event.image }} style={styles.hero} /> : null}
        <View style={styles.hostRow}>
          <View style={styles.hostAvatar}>
            <Ionicons name="business-outline" size={14} color={colors.blue[500]} />
          </View>
          <Text style={styles.hostName} numberOfLines={1}>
            {event.organizer || event.sourceLabel || 'Seoul'}
          </Text>
          {event.category ? <Text style={styles.metaDot}>· {event.category}</Text> : null}
        </View>
        <Text style={styles.detailTitle}>{event.text}</Text>
        {event.description ? <Text style={styles.caption}>{event.description}</Text> : null}
        <View style={styles.metaBlock}>
          {event.location ? <MetaRow icon="location-outline" text={event.location} /> : null}
          {event.date ? <MetaRow icon="calendar-outline" text={event.date} /> : null}
          {event.schedule ? <MetaRow icon="time-outline" text={event.schedule} /> : null}
          {event.duration ? <MetaRow icon="hourglass-outline" text={event.duration} /> : null}
        </View>
        <View style={styles.statsRow}>
          <Pressable style={styles.stat} hitSlop={6} onPress={onToggleLike}>
            <Ionicons
              name={event.like_status ? 'heart' : 'heart-outline'}
              size={22}
              color={event.like_status ? colors.red[100] : colors.icon.primary}
            />
            <Text style={styles.statText}>{event.like_count}</Text>
          </Pressable>
          <View style={styles.stat}>
            <Ionicons name="bookmark-outline" size={22} color={colors.icon.primary} />
            <Text style={styles.statText}>{event.save_count}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={22} color={colors.icon.disabled} />
            <Text style={styles.statText}>{event.view_count}</Text>
          </View>
          {loading && <ActivityIndicator size="small" color={colors.blue[500]} />}
        </View>
        {event.sourceUrl ? (
          <Pressable style={styles.sourceBtn} onPress={onOpenSource}>
            <Ionicons name="open-outline" size={16} color={colors.blue[500]} />
            <Text style={styles.sourceText}>{event.sourceLabel || t('events.viewSource')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: spacing[3] + insets.bottom }]}>
        <Pressable style={styles.taxiBtn} onPress={onBookTaxi}>
          <Ionicons name="car-outline" size={20} color={colors.gray[100]} />
          <Text style={styles.taxiText}>{t('events.bookTaxi')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color={colors.gray[900]} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Same header spec as History (Figma "Main container": Heading 35 / ExtraBold, 44 tall, 16 top).
  topBar: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[1], height: 44 + spacing[4] + spacing[1], justifyContent: 'center' },
  screenTitle: {
    fontFamily: 'NationalPark_800ExtraBold',
    fontSize: 35,
    lineHeight: 44,
    letterSpacing: -1.4,
    color: colors.text.primary,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3], padding: spacing[8] },
  muted: { fontFamily: 'NationalPark_500Medium', fontSize: 14, color: colors.text.disabled, textAlign: 'center' },
  retryBtn: { paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radius.full, backgroundColor: colors.blue[500] },
  retryText: { fontFamily: 'NationalPark_600SemiBold', fontSize: 14, color: '#fff' },
  // Figma VibesFeed: 16 gap between filter block and list; cards 12 apart.
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  sep: { height: 12 },
  sectionGap: { height: 4 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[4],
    paddingBottom: 12,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sectionTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  footer: { paddingVertical: spacing[6] },
  filterBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  filterDot: {
    position: 'absolute',
    top: 4,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.blue[500],
    borderWidth: 1.5,
    borderColor: colors.surface.default,
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingTop: spacing[2] },
  activeChips: { gap: spacing[2], paddingRight: spacing[2] },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    backgroundColor: colors.surface.focus,
  },
  activeChipText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    letterSpacing: -0.12,
    color: colors.blue[500],
  },
  clearText: { fontFamily: 'NationalPark_600SemiBold', fontSize: 13, color: colors.gray[900] },
  emptyActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  ghostBtn: { paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radius.full, borderWidth: 1, borderColor: colors.gray[600] },
  ghostText: { fontFamily: 'NationalPark_600SemiBold', fontSize: 14, color: colors.gray[900] },
  // Detail
  detailTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  detailTopActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  detailContent: { paddingHorizontal: spacing[5], paddingBottom: spacing[10], gap: spacing[3] },
  hero: { width: '100%', height: 220, borderRadius: radius.xl, backgroundColor: colors.gray[400] },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  hostAvatar: { width: 28, height: 28, borderRadius: radius.full, backgroundColor: colors.surface.focus, alignItems: 'center', justifyContent: 'center' },
  hostName: { fontFamily: 'NationalPark_600SemiBold', fontSize: 14, letterSpacing: -0.14, color: colors.gray[1000], flexShrink: 1 },
  metaDot: { fontFamily: 'NationalPark_500Medium', fontSize: 12, color: colors.gray[700] },
  detailTitle: { fontFamily: 'NationalPark_700Bold', fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: colors.gray[1300] },
  caption: { fontFamily: 'NationalPark_400Regular', fontSize: 14, lineHeight: 22, color: colors.text.primary },
  metaBlock: { gap: spacing[2], paddingTop: spacing[1] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  metaText: { flex: 1, fontFamily: 'NationalPark_500Medium', fontSize: 14, lineHeight: 20, color: colors.gray[1000] },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[6], paddingTop: spacing[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surface.subtle },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontFamily: 'NationalPark_600SemiBold', fontSize: 14, color: colors.text.primary },
  sourceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  sourceText: { fontFamily: 'NationalPark_600SemiBold', fontSize: 14, color: colors.blue[500] },
  ctaBar: { paddingHorizontal: spacing[5], paddingTop: spacing[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surface.subtle },
  taxiBtn: { height: 52, borderRadius: radius.full, backgroundColor: colors.blue[500], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2] },
  taxiText: { fontFamily: 'NationalPark_600SemiBold', fontSize: 16, letterSpacing: -0.16, color: colors.gray[100] },
});
