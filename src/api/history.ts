/**
 * history.ts — Kiki search history (Confluence "API Contract: History
 * (Search)", page 46268418).
 *
 *   GET {AUTH_API_URL}/api/v1/history/search
 *       ?q=&platform=&start_date=&end_date=&sort_by=&order=&page=&limit=
 *   Authorization: Bearer <firebase id token> — REQUIRED. Results are always
 *   scoped to the calling user server-side; no user_identifier param exists
 *   (deliberately — the old GET /search/history had an IDOR gap).
 *
 * Response is the shared PaginatedResponse envelope:
 *   { total, page, limit, count, total_pages, has_next, has_previous, filters,
 *     items: [{ id, question, answer, category, sources, followup_questions,
 *               platform, created_at }] }
 * (`question` was renamed from `query_text`; answer/category/sources/
 * followup_questions are new — the items are now the stored
 * search_query_responses rows, not tracking_events rows.)
 *
 * `sort_by` is whitelisted to created_at | query_text (the latter kept as the
 * accepted value for API stability — it maps to `question` internally);
 * order asc|desc; limit 1–100. "Recently viewed" has no server field — it's a
 * local ledger (utils/historyViewed) applied on top of newest-first.
 */
import auth from '@react-native-firebase/auth';
import { AUTH_API_URL } from '../config';
import { HistorySort, HistoryTimeRange, SearchHistoryItem } from '../types/history';

export interface HistoryPage {
  total: number;
  page: number;
  hasNext: boolean;
  items: SearchHistoryItem[];
}

export interface HistoryQuery {
  page: number;
  pageSize: number;
  sort: HistorySort;
  time: HistoryTimeRange;
  /** History search — server-side case-insensitive substring match on the query text. */
  queryText?: string;
}

/** Start of the requested window (local time → ISO UTC), or undefined for All time. */
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

function qs(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

interface RawItem {
  id: string;
  /** Contract field (renamed from `query_text`; "" if missing, never null). */
  question?: string;
  /** Pre-rename field name — tolerated so a stale backend still renders. */
  query_text?: string;
  answer?: string | null;
  category?: string | null;
  sources?: { index?: number; tag?: string; url?: string; title?: string; type?: string }[] | null;
  followup_questions?: string[] | null;
  platform: string | null;
  created_at: string;
}

export async function getSearchHistory(q: HistoryQuery): Promise<HistoryPage> {
  const fbUser = auth().currentUser;
  if (!fbUser) throw new Error('history: no signed-in user');
  const token = await fbUser.getIdToken();
  const from = timeRangeStart(q.time);
  // The contract's `q` is a raw Mongo regex — escape metacharacters so the
  // user's keyword is matched literally ("visa." shouldn't be a wildcard).
  const keyword = q.queryText?.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const url = `${AUTH_API_URL}/api/v1/history/search${qs({
    q: keyword || undefined,
    start_date: from?.toISOString(),
    sort_by: 'created_at',
    // "Recently viewed" is a local ordering applied on top of newest-first.
    order: q.sort === 'oldest' ? 'asc' : 'desc',
    page: q.page,
    limit: q.pageSize,
  })}`;
  console.log(`[api] history → GET ${url}`);
  const res = await fetch(url, {
    headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET /history/search failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const body = await res.json();
  const items: SearchHistoryItem[] = ((body.items ?? []) as RawItem[])
    .map((it) => ({ ...it, _q: (it?.question ?? it?.query_text ?? '').trim() }))
    .filter((it) => it._q)
    .map((it) => ({
      id: it.id,
      user_query: it._q,
      started_at: it.created_at ?? '',
      category: it.category ?? null,
      answer: it.answer ?? null,
      sources: Array.isArray(it.sources) ? it.sources : null,
      followup_questions: Array.isArray(it.followup_questions) ? it.followup_questions : null,
    }));
  return {
    total: Number(body.total ?? items.length),
    page: Number(body.page ?? q.page),
    hasNext: Boolean(body.has_next),
    items,
  };
}
