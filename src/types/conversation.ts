// Search v2 conversation threads — Confluence "API Contract: Search v2"
// (page 68288514), section /api/v2/conversations. Field names are the
// wire names, untouched, so the types double as documentation of the API.

/** One thread in the History list (`ConversationSummary`, newest activity first). */
export interface ConversationSummary {
  conversation_id: string;
  /** The query that opened the thread; null until its first turn completes. */
  title: string | null;
  message_count: number;
  turn_count: number;
  created_at: string | null;
  last_activity_at: string | null;
  expires_at: string | null;
}

/** One stored message — a question (role user) or its answer (role assistant). */
export interface ConversationMessage {
  message_id: string;
  role: 'user' | 'assistant' | string;
  content: string;
  turn_index: number;
  created_at: string | null;
  /** answered | clarification | rejected | errored | abandoned … (free-form on the wire). */
  terminal_state: string | null;
  /** The context-resolved query; equals `content` when nothing needed correcting. */
  resolved_query: string | null;
  top_results?: unknown[];
}

/** One question + (maybe) its answer. `answer` is null when the turn produced none. */
export interface ConversationTurn {
  turn_index: number;
  question: ConversationMessage;
  answer: ConversationMessage | null;
  followup_questions: string[];
  terminal_state: string | null;
}

/** GET /api/v2/conversations/{id} (`ConversationDetail`). */
export interface ConversationDetail {
  conversation_id: string;
  title: string | null;
  created_at: string | null;
  last_activity_at: string | null;
  expires_at: string | null;
  turn_count: number;
  /** Older turns exist beyond `turns` — page with `before_turn`. */
  has_more: boolean;
  turns: ConversationTurn[];
}

/** Epoch ms of a thread's latest activity (falls back to creation; 0 when unknown). */
export function conversationActivityMs(c: ConversationSummary): number {
  const t = Date.parse(c.last_activity_at ?? c.created_at ?? '');
  return Number.isNaN(t) ? 0 : t;
}
