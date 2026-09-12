import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConversationsError, getConversationTranscript, listConversations } from '../api/conversations';
import { HistoryFilters, HistoryTimeRange } from '../types/history';
import {
  ConversationDetail,
  ConversationSummary,
  ConversationTurn,
  conversationActivityMs,
} from '../types/conversation';
import { ViewedMap } from '../utils/historyViewed';

/**
 * Conversation threads for the History tab + its search screen
 * (GET /api/v2/conversations, newest activity first, `before` cursor).
 *
 * The list endpoint has no filters of its own, so the chips are applied
 * here: the time window on `last_activity_at` (pages are newest-first, so
 * paging stops at the first row that falls out of the window), "Oldest"
 * as a reversal of the fully loaded list, and the keyword search as a
 * client-side title match — both of the latter load the whole (bounded)
 * list first; "Newest" / "Recently viewed" page incrementally on scroll.
 */
const PAGE_SIZE = 30;
/** Page size while loading everything (contract max 100). */
const BULK_PAGE_SIZE = 100;
/** Bound on the fully-loaded list (oldest sort / keyword search). */
const MAX_BULK_ITEMS = 500;

export type HistorySection = { key: string; title: string; data: ConversationSummary[] };

/** Start of the requested window (local time → Date), or undefined for All time. */
export function timeRangeStart(range: HistoryTimeRange, now = new Date()): Date | undefined {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case 'today':
      return start;
    case 'last7':
      start.setDate(start.getDate() - 6);
      return start;
    case 'last30':
      start.setDate(start.getDate() - 29);
      return start;
    case 'allTime':
    default:
      return undefined;
  }
}

function dedupe(list: ConversationSummary[]): ConversationSummary[] {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.conversation_id) ? false : (seen.add(c.conversation_id), true)));
}

export function useConversations(args: {
  filters: HistoryFilters;
  /** Keyword — matched against thread titles locally. */
  queryText?: string;
  /** Skip fetching (e.g. search screen with an empty query). */
  enabled?: boolean;
}) {
  const { filters, queryText = '', enabled = true } = args;
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The server reported the conversations feature switched off (503). */
  const [disabled, setDisabled] = useState(false);
  const reqSeq = useRef(0);

  const keyword = queryText.trim().toLowerCase();
  const windowStart = useMemo(() => timeRangeStart(filters.time)?.getTime(), [filters.time]);
  // Everything at once (bounded) when the order or the match can't come from the server.
  const loadAll = filters.sort === 'oldest' || keyword.length > 0;

  const fetchFrom = useCallback(
    async (before: string | null, mode: 'replace' | 'append' | 'refresh') => {
      if (!enabled) {
        setItems([]);
        setNextBefore(null);
        setHasNext(false);
        setLoading(false);
        return;
      }
      const seq = ++reqSeq.current;
      if (mode === 'replace') setLoading(true);
      else if (mode === 'append') setLoadingMore(true);
      else setRefreshing(true);
      setError(null);
      try {
        let acc: ConversationSummary[] = [];
        let cursor: string | null = before;
        let more = true;
        do {
          const page = await listConversations({ limit: loadAll ? BULK_PAGE_SIZE : PAGE_SIZE, before: cursor });
          if (seq !== reqSeq.current) return; // superseded by a newer request
          acc = acc.concat(page.conversations);
          cursor = page.nextBefore;
          more = !!cursor && page.conversations.length > 0;
          // Newest-first: once a page reaches past the window's start, every
          // later page is older still — nothing more to fetch.
          if (windowStart != null && page.conversations.some((c) => conversationActivityMs(c) < windowStart)) {
            more = false;
          }
          if (acc.length >= MAX_BULK_ITEMS) more = false;
        } while (loadAll && more);
        setItems((cur) => (mode === 'append' ? dedupe([...cur, ...acc]) : dedupe(acc)));
        setNextBefore(cursor);
        setHasNext(more);
        setDisabled(false);
      } catch (e: any) {
        if (seq !== reqSeq.current) return;
        if (e instanceof ConversationsError && e.disabled) {
          console.warn('[history] conversations disabled server-side');
          setDisabled(true);
          setItems([]);
          setHasNext(false);
        } else {
          console.warn('[history] fetch failed', e?.message ?? e);
          setError(e?.message ?? 'error');
          if (mode !== 'append') {
            setItems([]);
            setHasNext(false);
          }
        }
      } finally {
        if (seq === reqSeq.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [enabled, loadAll, windowStart],
  );

  useEffect(() => {
    fetchFrom(null, 'replace');
  }, [fetchFrom]);

  const refresh = useCallback(() => fetchFrom(null, 'refresh'), [fetchFrom]);
  const loadMore = useCallback(() => {
    if (!hasNext || loading || loadingMore || refreshing || !nextBefore) return;
    fetchFrom(nextBefore, 'append');
  }, [fetchFrom, hasNext, loading, loadingMore, refreshing, nextBefore]);

  // The chips, applied to what's loaded.
  const visible = useMemo(() => {
    let list = items;
    if (windowStart != null) list = list.filter((c) => conversationActivityMs(c) >= windowStart);
    if (keyword) list = list.filter((c) => (c.title ?? '').toLowerCase().includes(keyword));
    if (filters.sort === 'oldest') list = [...list].reverse();
    return list;
  }, [items, windowStart, keyword, filters.sort]);

  return {
    items: visible,
    total: visible.length,
    loading,
    loadingMore,
    refreshing,
    error,
    disabled,
    hasNext: hasNext && !loadAll,
    refresh,
    loadMore,
  };
}

/** Local ordering for the "Recently Viewed" sort: last-opened first, unseen after (as loaded). */
export function applyRecentlyViewed(items: ConversationSummary[], viewed: ViewedMap): ConversationSummary[] {
  const seen = items.filter((i) => viewed[i.conversation_id]);
  const rest = items.filter((i) => !viewed[i.conversation_id]);
  seen.sort((a, b) => viewed[b.conversation_id] - viewed[a.conversation_id]);
  return [...seen, ...rest];
}

/**
 * Group threads into dated sections by their latest activity. Ranges wider
 * than 30 days → by month ("Aug"), 30 days or less (and search results) →
 * by day ("Aug 3"); the year is appended when it's not the current one.
 * Sections follow first-appearance order so a recently-viewed ordering
 * doesn't scatter rows across duplicate headers.
 */
export function useHistorySections(
  items: ConversationSummary[],
  granularity: 'month' | 'day',
  locale: string,
): HistorySection[] {
  return useMemo(() => {
    const now = new Date();
    const fmt = (opts: Intl.DateTimeFormatOptions, d: Date, fallback: string) => {
      try {
        return new Intl.DateTimeFormat(locale, opts).format(d);
      } catch {
        return fallback;
      }
    };
    const sections: HistorySection[] = [];
    const byKey = new Map<string, HistorySection>();
    for (const it of items) {
      const ms = conversationActivityMs(it);
      const d = ms ? new Date(ms) : now;
      const sameYear = d.getFullYear() === now.getFullYear();
      let key: string;
      let title: string;
      if (granularity === 'month') {
        key = `${d.getFullYear()}-${d.getMonth()}`;
        title = fmt(
          sameYear ? { month: 'short' } : { month: 'short', year: 'numeric' },
          d,
          `${d.getMonth() + 1}/${d.getFullYear()}`,
        );
      } else {
        key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        title = fmt(
          sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' },
          d,
          `${d.getMonth() + 1}/${d.getDate()}`,
        );
      }
      let sec = byKey.get(key);
      // Only merge into an existing section if it's the most recent one —
      // keeps chronological lists contiguous and viewed-first lists honest.
      if (!sec || sections[sections.length - 1] !== sec) {
        sec = { key: `${key}-${sections.length}`, title, data: [] };
        byKey.set(key, sec);
        sections.push(sec);
      }
      sec.data.push(it);
    }
    return sections;
  }, [items, granularity, locale]);
}

// ── One thread's transcript (for the expanded History row) ──────────────────

export type TranscriptStatus = 'idle' | 'loading' | 'ready' | 'error';

/** Fetched transcripts, keyed by thread + its last activity so a thread that
 *  gained a turn since is refetched instead of served stale. */
const transcriptCache = new Map<string, ConversationDetail>();
const TRANSCRIPT_CACHE_MAX = 40;

function cacheKeyFor(item: ConversationSummary): string {
  return `${item.conversation_id}|${item.last_activity_at ?? ''}|${item.turn_count}`;
}

/**
 * Loads a thread's turns (GET /api/v2/conversations/{id}) once a row is
 * expanded; cached across collapses and list refreshes.
 */
export function useConversationTranscript(item: ConversationSummary, enabled: boolean) {
  const key = cacheKeyFor(item);
  const [state, setState] = useState<{
    key: string;
    status: TranscriptStatus;
    turns: ConversationTurn[];
    truncated: boolean;
  }>(() => {
    const cached = transcriptCache.get(key);
    return cached
      ? { key, status: 'ready', turns: cached.turns, truncated: cached.has_more }
      : { key, status: 'idle', turns: [], truncated: false };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const cached = transcriptCache.get(key);
    if (cached) {
      setState({ key, status: 'ready', turns: cached.turns, truncated: cached.has_more });
      return;
    }
    let cancelled = false;
    setState({ key, status: 'loading', turns: [], truncated: false });
    getConversationTranscript(item.conversation_id)
      .then((detail) => {
        if (cancelled) return;
        if (transcriptCache.size >= TRANSCRIPT_CACHE_MAX) {
          const oldest = transcriptCache.keys().next().value;
          if (oldest) transcriptCache.delete(oldest);
        }
        transcriptCache.set(key, detail);
        setState({ key, status: 'ready', turns: detail.turns, truncated: detail.has_more });
      })
      .catch((e) => {
        if (cancelled) return;
        console.warn('[history] transcript failed', (e as Error)?.message ?? e);
        setState({ key, status: 'error', turns: [], truncated: false });
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, key, attempt, item.conversation_id]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  // A key change (thread refreshed with new activity) shows as loading until the effect runs.
  const current = state.key === key ? state : { key, status: enabled ? ('loading' as const) : ('idle' as const), turns: [], truncated: false };
  return { status: current.status, turns: current.turns, truncated: current.truncated, retry };
}
