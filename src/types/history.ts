// History tab — Figma "Backend Functionality" section (node 10051:43907).
// Two sub-tabs: AI Chats (Kiki conversations) and Buzz (saved/liked activity).

/** Chronological bucket a history entry falls into. */
export type HistoryGroup = 'today' | 'yesterday' | 'lastWeek' | 'older';

/** Buzz content type filter values (Figma: Content ▼ Ping / Drop / Vibe). */
export type BuzzContentKind = 'ping' | 'drop' | 'vibe';

/** Buzz activity filter values (Figma: Activity ▼). */
export type BuzzActivity = 'saved' | 'liked' | 'myPosts' | 'myComments';

/** Sort options. AI Chats: newest/oldest. Buzz adds recently viewed. */
export type HistorySort = 'newest' | 'oldest' | 'recentlyViewed';

/** Time-range options (Figma: Today → All Time). */
export type HistoryTimeRange =
  | 'today'
  | 'last7'
  | 'last30'
  | 'last3m'
  | 'last6m'
  | 'thisYear'
  | 'allTime';

export interface AiChatHistoryItem {
  id: string;
  /** Conversation title — the question the user asked Kiki. */
  title: string;
  /** Relative time shown in the meta row, e.g. "2:14 PM", "Yesterday". */
  time: string;
  group: HistoryGroup;
  liked: boolean;
  /** Number of messages in the conversation (meta row). */
  messages: number;
}

export interface BuzzHistoryItem {
  id: string;
  kind: BuzzContentKind;
  /** Category label, e.g. "Living", "Food" (Figma search card shows "Living"). */
  category: string;
  title: string;
  author: string;
  time: string;
  location: string;
  group: HistoryGroup;
  liked: boolean;
  saved: boolean;
  /** How this item entered history (drives the Activity filter). */
  activity: BuzzActivity;
}

export interface BuzzHistoryFilters {
  activity: BuzzActivity | null;
  content: BuzzContentKind | null;
  sort: HistorySort;
  time: HistoryTimeRange;
}

export interface AiChatFilters {
  sort: HistorySort;
  time: HistoryTimeRange;
}
