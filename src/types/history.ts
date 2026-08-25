// History tab — Figma "History for Aug release" (section 12232:59925).
// Kiki AI questions only, listed from the backend search log
// (GET /api/v1/history/search), with a sort chip and a time-range chip.

/** Sort chip options (Figma sort sheet: Newest / Oldest / Recently Viewed). */
export type HistorySort = 'newest' | 'oldest' | 'recentlyViewed';

/** Time-range chip options (Figma date sheet: Today / Last 7 days / Last 30 days / All Time). */
export type HistoryTimeRange = 'today' | 'last7' | 'last30' | 'allTime';

export const HISTORY_SORTS: HistorySort[] = ['newest', 'oldest', 'recentlyViewed'];
export const HISTORY_TIME_RANGES: HistoryTimeRange[] = ['today', 'last7', 'last30', 'allTime'];

/** One source cited by a stored answer (shape not enforced by the contract). */
export interface HistorySource {
  index?: number;
  tag?: string;
  url?: string;
  title?: string;
  type?: string;
}

/** One question the user asked Kiki (a row in the History list). */
export interface SearchHistoryItem {
  /** The search_query_responses document id (stringified Mongo _id). */
  id: string;
  /** The question as typed (contract field `question`). */
  user_query: string;
  /** ISO timestamp (UTC) the search was logged. */
  started_at: string;
  /** Pipeline category, e.g. "visa" — null when the search wasn't classified. */
  category?: string | null;
  /** The synthesized answer, if the search produced one. */
  answer?: string | null;
  /** Cited sources, as stored by the search system. */
  sources?: HistorySource[] | null;
  followup_questions?: string[] | null;
}

export interface HistoryFilters {
  sort: HistorySort;
  time: HistoryTimeRange;
}

/** Design defaults: sort Newest, date filter All time. */
export const DEFAULT_HISTORY_FILTERS: HistoryFilters = { sort: 'newest', time: 'allTime' };
