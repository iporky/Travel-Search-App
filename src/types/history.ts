// History tab — Figma "History for Aug release" (section 12232:59925).
// Kiki conversations only, listed from GET /api/v2/conversations (see
// types/conversation.ts for the rows), with a sort chip and a time-range chip.

/** Sort chip options (Figma sort sheet: Newest / Oldest / Recently Viewed). */
export type HistorySort = 'newest' | 'oldest' | 'recentlyViewed';

/** Time-range chip options (Figma date sheet: Today / Last 7 days / Last 30 days / All Time). */
export type HistoryTimeRange = 'today' | 'last7' | 'last30' | 'allTime';

export const HISTORY_SORTS: HistorySort[] = ['newest', 'oldest', 'recentlyViewed'];
export const HISTORY_TIME_RANGES: HistoryTimeRange[] = ['today', 'last7', 'last30', 'allTime'];

export interface HistoryFilters {
  sort: HistorySort;
  time: HistoryTimeRange;
}

/** Design defaults: sort Newest, date filter All time. */
export const DEFAULT_HISTORY_FILTERS: HistoryFilters = { sort: 'newest', time: 'allTime' };
