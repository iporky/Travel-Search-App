import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSearchHistory } from '../api/history';
import { HistoryFilters, SearchHistoryItem } from '../types/history';
import { ViewedMap } from '../utils/historyViewed';

/**
 * Paged Kiki history for the History tab + its search screen.
 * Re-fetches from page 1 whenever the filters / query change (the sort and
 * time range are server-side); appends pages on `loadMore` while the backend
 * reports `has_next`.
 */
const PAGE_SIZE = 30;

export type HistorySection = { key: string; title: string; data: SearchHistoryItem[] };

export function useSearchHistory(args: {
  filters: HistoryFilters;
  queryText?: string;
  /** Skip fetching (e.g. search screen with an empty query). */
  enabled?: boolean;
}) {
  const { filters, queryText = '', enabled = true } = args;
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqSeq = useRef(0);

  const fetchPage = useCallback(
    async (p: number, mode: 'replace' | 'append' | 'refresh') => {
      if (!enabled) {
        setItems([]);
        setTotal(0);
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
        const res = await getSearchHistory({
          page: p,
          pageSize: PAGE_SIZE,
          sort: filters.sort,
          time: filters.time,
          queryText,
        });
        if (seq !== reqSeq.current) return; // superseded by a newer request
        setItems((cur) => {
          if (mode !== 'append') return res.items;
          const seen = new Set(cur.map((i) => i.id));
          return [...cur, ...res.items.filter((i) => !seen.has(i.id))];
        });
        setTotal(res.total);
        setHasNext(res.hasNext);
        setPage(res.page);
      } catch (e: any) {
        if (seq !== reqSeq.current) return;
        console.warn('[history] fetch failed', e?.message ?? e);
        setError(e?.message ?? 'error');
        if (mode !== 'append') {
          setItems([]);
          setTotal(0);
          setHasNext(false);
        }
      } finally {
        if (seq === reqSeq.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [enabled, filters.sort, filters.time, queryText],
  );

  useEffect(() => {
    fetchPage(1, 'replace');
  }, [fetchPage]);

  const refresh = useCallback(() => fetchPage(1, 'refresh'), [fetchPage]);
  const loadMore = useCallback(() => {
    if (!hasNext || loading || loadingMore || refreshing) return;
    fetchPage(page + 1, 'append');
  }, [fetchPage, hasNext, loading, loadingMore, refreshing, page]);

  return { items, total, loading, loadingMore, refreshing, error, hasNext, refresh, loadMore };
}

/** Local ordering for the "Recently Viewed" sort: last-opened first, unseen after (as loaded). */
export function applyRecentlyViewed(items: SearchHistoryItem[], viewed: ViewedMap): SearchHistoryItem[] {
  const seen = items.filter((i) => viewed[i.id]);
  const rest = items.filter((i) => !viewed[i.id]);
  seen.sort((a, b) => viewed[b.id] - viewed[a.id]);
  return [...seen, ...rest];
}

function parseIso(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Group rows into dated sections. Ranges wider than 30 days → by month
 * ("Aug"), 30 days or less (and search results) → by day ("Aug 3"); the year
 * is appended when it's not the current one. Sections follow first-appearance
 * order so a recently-viewed ordering doesn't scatter rows across duplicate
 * headers.
 */
export function useHistorySections(
  items: SearchHistoryItem[],
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
      const d = parseIso(it.started_at) ?? now;
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
