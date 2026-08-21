// History tab — Figma "History for Aug release" (section 12232:59925).
// Kiki AI questions only, listed from the backend search log
// (GET /api/v1/search/history), with a sort chip and a time-range chip.

/** Sort chip options (Figma sort sheet: Newest / Oldest / Recently Viewed). */
export type HistorySort = 'newest' | 'oldest' | 'recentlyViewed';

/** Time-range chip options (Figma date sheet: Today / Last 7 days / Last 30 days / All Time). */
export type HistoryTimeRange = 'today' | 'last7' | 'last30' | 'allTime';

export const HISTORY_SORTS: HistorySort[] = ['newest', 'oldest', 'recentlyViewed'];
export const HISTORY_TIME_RANGES: HistoryTimeRange[] = ['today', 'last7', 'last30', 'allTime'];

/** One question the user asked Kiki (a row in the History list). */
export interface SearchHistoryItem {
  /** The tracking_events document id (stringified Mongo _id). */
  id: string;
  /** The question as typed. */
  user_query: string;
  /** ISO timestamp (UTC) the search was received. */
  started_at: string;
}

export interface HistoryFilters {
  sort: HistorySort;
  time: HistoryTimeRange;
}

/** Design defaults: sort Newest, date filter All time. */
export const DEFAULT_HISTORY_FILTERS: HistoryFilters = { sort: 'newest', time: 'allTime' };
