/**
 * conversations.ts — Search v2 conversation threads (Confluence "API
 * Contract: Search v2", page 68288514, section /api/v2/conversations).
 *
 *   GET    {SEARCH_API_URL}/api/v2/conversations?limit=&before=
 *   GET    {SEARCH_API_URL}/api/v2/conversations/{id}?limit=&before_turn=
 *   DELETE {SEARCH_API_URL}/api/v2/conversations/{id}
 *
 * These sit behind the gateway's STRICT authorizer: `Authorization: Bearer
 * <firebase id token>` is required, and a missing/expired session is a hard
 * 401 (unlike /api/v2/search, which degrades to the anonymous tier). The
 * gateway resolves the token into X-Konnect-User-Id, which scopes every call
 * to the caller; the optional `email` query param is ignored once that header
 * is present, so it is not sent. `platform` + `device_id` ride on the query
 * string like every other gateway call.
 *
 * All responses are ordinary buffered JSON (not NDJSON). Failures throw a
 * ConversationsError carrying the HTTP status: 503 = the conversations
 * feature is switched off server-side (treat as "no history", not as an
 * error to retry), 404 = not found OR not yours (deliberately the same).
 */
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { SEARCH_API_URL } from '../config';
import { ConversationDetail, ConversationSummary, ConversationTurn } from '../types/conversation';

export class ConversationsError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ConversationsError';
    this.status = status;
  }
  /** 503 — CONVERSATION_MEMORY_ENABLED is off; the whole feature is absent. */
  get disabled(): boolean {
    return this.status === 503;
  }
  get unauthorized(): boolean {
    return this.status === 401;
  }
}

/** Max turns per detail page (contract: `limit` 1–100). */
const TURNS_PAGE = 100;
/** Hard stop when paging a very long thread backwards. */
const MAX_TURN_PAGES = 5;

function qs(params: Record<string, string | number | null | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

async function request<T>(
  method: 'GET' | 'DELETE',
  path: string,
  params: Record<string, string | number | null | undefined>,
): Promise<T | null> {
  const fbUser = auth().currentUser;
  if (!fbUser) throw new ConversationsError('conversations: no signed-in user', 401);
  const [token, deviceId] = await Promise.all([
    fbUser.getIdToken(),
    DeviceInfo.getUniqueId().catch(() => ''),
  ]);
  const url = `${SEARCH_API_URL}${path}${qs({ ...params, platform: Platform.OS, device_id: deviceId })}`;
  console.log(`[api] conversations → ${method} ${path}`);
  const res = await fetch(url, {
    method,
    headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let detail = '';
    try {
      const j = JSON.parse(text);
      detail = typeof j?.detail === 'string' ? j.detail : typeof j?.message === 'string' ? j.message : '';
    } catch {
      // not JSON — keep the raw text
    }
    throw new ConversationsError(
      `${method} ${path} failed: HTTP ${res.status} ${detail || text.slice(0, 200)}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export interface ConversationPage {
  conversations: ConversationSummary[];
  /** Send back as `before` for the next page; null on the last page. */
  nextBefore: string | null;
}

/** GET /api/v2/conversations — newest `last_activity_at` first. */
export async function listConversations(
  args: { limit?: number; before?: string | null } = {},
): Promise<ConversationPage> {
  const body = await request<{ conversations?: ConversationSummary[]; next_before?: string | null }>(
    'GET',
    '/api/v2/conversations',
    { limit: args.limit ?? 20, before: args.before ?? undefined },
  );
  const conversations = (body?.conversations ?? []).filter(
    (c) => c && typeof c.conversation_id === 'string' && c.conversation_id,
  );
  return { conversations, nextBefore: body?.next_before || null };
}

/** GET /api/v2/conversations/{id} — one page of turns (latest first on the wire). */
export async function getConversation(
  id: string,
  args: { limit?: number; beforeTurn?: number } = {},
): Promise<ConversationDetail> {
  const body = await request<ConversationDetail>(
    'GET',
    `/api/v2/conversations/${encodeURIComponent(id)}`,
    { limit: args.limit ?? TURNS_PAGE, before_turn: args.beforeTurn },
  );
  if (!body) throw new ConversationsError('conversations: empty response', 500);
  return { ...body, turns: Array.isArray(body.turns) ? body.turns : [] };
}

/**
 * The whole thread, oldest turn first — follows `has_more` backwards with
 * `before_turn` (bounded) so the History transcript never shows a truncated
 * chat without saying so.
 */
export async function getConversationTranscript(id: string): Promise<ConversationDetail> {
  const first = await getConversation(id);
  const byIndex = new Map<number, ConversationTurn>();
  for (const t of first.turns) byIndex.set(t.turn_index, t);
  let hasMore = !!first.has_more;
  let pages = 1;
  while (hasMore && pages < MAX_TURN_PAGES && byIndex.size) {
    const lowest = Math.min(...byIndex.keys());
    if (lowest <= 0) break;
    const page = await getConversation(id, { beforeTurn: lowest });
    for (const t of page.turns) byIndex.set(t.turn_index, t);
    hasMore = !!page.has_more && page.turns.length > 0;
    pages++;
  }
  const turns = [...byIndex.values()].sort((a, b) => a.turn_index - b.turn_index);
  return { ...first, turns, has_more: hasMore };
}

/** DELETE /api/v2/conversations/{id} — soft delete (204). */
export async function deleteConversation(id: string): Promise<void> {
  await request('DELETE', `/api/v2/conversations/${encodeURIComponent(id)}`, {});
}
