/**
 * search.ts — LIVE streaming search, Search v2 (Confluence "API Contract:
 * Search v2", page 68288514).
 *
 *   POST ${SEARCH_API_URL}/api/v2/search?platform=<android|ios>&device_id=<id>
 *   headers: { accept: application/x-ndjson, Content-Type: application/json,
 *              Authorization: Bearer <firebase id token> (when signed in) }
 *   body: { email, query, conversation_id, session_id, skip_resolution,
 *           output_language, top_k, min_similarity, user_lat, user_lng,
 *           metadata }
 *
 * Identity: the Bearer token goes to the API Gateway, whose authorizer turns
 * it into X-Konnect-User-Id (never set by the client). The search authorizer
 * never hard-denies — no/expired token just means the anonymous rate tier,
 * keyed on the body's `email`. That field is an opaque owner key, not a
 * validated address: the contract asks for the provider_id (Firebase uid);
 * signed-out callers send the install's visitor id so every anonymous device
 * is its own owner rather than everyone sharing one literal string.
 *
 * Conversations: omit/"" `conversation_id` to start a thread; send back the
 * id from the stream's `conversation` (or last `metadata`) event to continue
 * it. `skip_resolution: true` searches exactly as typed (no context rewrite).
 *
 * Response: 200 + NDJSON, one `{ type, data }` object per line — except
 * `stage_error` / `stage_degraded`, which carry `stage`/`detail`/`fatal` at
 * the top level (normalised into `data` here). `X-Validation-Failed: true`
 * marks a query the router blocked before the pipeline ran (the stream then
 * carries a canned refusal). Non-2xx responses are plain JSON: 422 malformed,
 * 429 `{detail}` + Retry-After (query_engine's limiter), 403
 * `{error:'access_denied', message}` (the gateway's limiter — no Retry-After),
 * 503 conversations disabled, 5xx `{detail}`.
 *
 * React Native's fetch() cannot read a body incrementally, so we stream via
 * XMLHttpRequest: `onprogress` fires as responseText grows and we extract
 * complete top-level JSON objects from the growing buffer with a brace-depth
 * scanner (robust to NDJSON and to concatenated pretty-printed objects).
 */

import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { SEARCH_API_URL } from '../config';
import { recordSearchResponse } from './tracking';
import { reportAutocompleteOutcome } from './autocomplete';
import { getVisitorId } from '../utils/visitorId';

// ── Event payload types (the subset the UI renders) ─────────────────────────
export interface StreamEvent {
  type: string;
  data: any;
}

export interface ServiceRecommendation {
  service_key: string;
  display_name: string;
  emoji: string;
  title: string;
  body: string;
  deep_link_url: string;
  deep_link_label: string;
}

export interface SearchSource {
  index: number;
  tag: string;
  url: string;
  title: string;
  type: string;
}

export interface ConfidenceIndicator {
  level: string;
  badge: string;
  source_count: number;
  citation_count: number;
}

/** `clarification` event — replaces the answer; a free-text reply is always valid. */
export interface Clarification {
  question: string;
  options: string[];
}

export interface SubmitQueryArgs {
  query: string;
  /** Fallback owner key when there is no Firebase user (rare — the visitor id is used first). */
  email?: string;
  /** App language code (e.g. 'en', 'ko') — mapped to the API's output_language. */
  languageCode?: string;
  sessionId?: string;
  /** Continue this thread; omit (or '') to start a new conversation. */
  conversationId?: string | null;
  /** Search exactly as typed — skip context resolution (use for corrections). */
  skipResolution?: boolean;
  userLat?: number;
  userLng?: number;
}

/** What the transport learned about a finished stream beyond its events. */
export interface StreamResult {
  /** The router blocked the query before the pipeline ran (`X-Validation-Failed`). */
  validationFailed: boolean;
  validationType: string | null;
  /** From the `conversation` event / last `metadata` event, when the turn joined a thread. */
  conversationId: string | null;
  messageId: string | null;
}

export type SearchErrorCode =
  | 'rate_limited' // 429 (query_engine's own limiter; retryAfter set when the header came)
  | 'access_denied' // 403 (the gateway's limiter; message is user-displayable)
  | 'invalid' // 422
  | 'unavailable' // 503 / 5xx
  | 'http'
  | 'network'
  | 'timeout';

export class SearchError extends Error {
  code: SearchErrorCode;
  status: number | null;
  /** Server-provided text meant for the user (gateway `message` / `detail`), if any. */
  userMessage: string | null;
  retryAfter: number | null;
  constructor(
    message: string,
    code: SearchErrorCode,
    extra: { status?: number | null; userMessage?: string | null; retryAfter?: number | null } = {},
  ) {
    super(message);
    this.name = 'SearchError';
    this.code = code;
    this.status = extra.status ?? null;
    this.userMessage = extra.userMessage ?? null;
    this.retryAfter = extra.retryAfter ?? null;
  }
}

export interface StreamHandlers {
  /** Called once per parsed { type, data } object, in arrival order. */
  onEvent: (event: StreamEvent) => void;
  /** Called when the stream ends normally (after the last event). */
  onDone: (result: StreamResult) => void;
  /** Called on network failure or non-2xx status. */
  onError: (error: SearchError) => void;
  /**
   * Optional. Called with the shareable response_id once the finished search
   * has been persisted. Fires after onDone and never blocks or gates it.
   */
  onRecorded?: (responseId: string) => void;
}

// The API expects an English language name (OutputLanguage enum).
const OUTPUT_LANGUAGE: Record<string, string> = {
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  vi: 'Vietnamese',
  th: 'Thai',
};

/** Contract: `query` is 1–1000 chars. */
const MAX_QUERY_CHARS = 1000;
/** Fan-out answers take 20–60 s; keepalives every ~3 s keep the socket warm. */
const STREAM_TIMEOUT_MS = 150_000;

/** RFC-4122-ish v4 UUID, good enough for a session id. */
export function makeSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extracts complete top-level JSON objects from `buffer`.
 * Returns the parsed-out raw object strings and the unconsumed remainder
 * (an object still being streamed in).
 */
function extractJsonObjects(buffer: string): { objects: string[]; rest: string } {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < buffer.length; i++) {
    const c = buffer[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
    } else if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start >= 0) {
        objects.push(buffer.slice(start, i + 1));
        start = -1;
      }
    }
  }

  const rest = depth > 0 && start >= 0 ? buffer.slice(start) : '';
  return { objects, rest };
}

/** `stage_error` / `stage_degraded` put their fields beside `type`; fold them into `data`. */
function normalizeEvent(raw: any): StreamEvent | null {
  if (!raw || typeof raw.type !== 'string') return null;
  if (raw.data === undefined && (raw.type === 'stage_error' || raw.type === 'stage_degraded')) {
    const { type, ...rest } = raw;
    return { type, data: rest };
  }
  return raw as StreamEvent;
}

/** Turn a non-2xx pre-stream response into a typed error (plain JSON body). */
function errorForStatus(status: number, text: string, retryAfterHeader: string | null): SearchError {
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // not JSON (e.g. an HTML error page) — fall through with no message
  }
  const detail = json?.detail;
  const detailText =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: any) => d?.msg).filter(Boolean).join('; ')
        : null;
  const message = typeof json?.message === 'string' ? json.message : detailText;
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) || null : null;
  const base = `Search failed: HTTP ${status}${message ? ` — ${message}` : ''}`;
  if (status === 429) return new SearchError(base, 'rate_limited', { status, userMessage: message, retryAfter });
  if (status === 403 && json?.error === 'access_denied') {
    return new SearchError(base, 'access_denied', { status, userMessage: message });
  }
  if (status === 422) return new SearchError(base, 'invalid', { status, userMessage: null });
  if (status === 503 || status >= 500) return new SearchError(base, 'unavailable', { status });
  return new SearchError(base, 'http', { status });
}

/**
 * Starts a streaming query. Events are delivered to `handlers.onEvent` as the
 * backend produces them. Returns a handle whose `cancel()` aborts the request
 * (safe to call after completion).
 */
export function streamQuery(
  args: SubmitQueryArgs,
  handlers: StreamHandlers,
): { cancel: () => void } {
  const xhr = new XMLHttpRequest();
  let pending = '';
  let consumed = 0;
  let finished = false;
  // Every event exactly as it arrived. Handed to the recorder untouched — it
  // extracts the stored search response (and dedupes) from these.
  const rawEvents: StreamEvent[] = [];
  const result: StreamResult = {
    validationFailed: false,
    validationType: null,
    conversationId: null,
    messageId: null,
  };
  // Filled in once the identity lookups resolve (see below); the recorder
  // needs the exact request body that was sent.
  let body: Record<string, unknown> & { query: string; session_id: string } | null = null;

  const pump = () => {
    const text = xhr.responseText ?? '';
    if (text.length <= consumed) return;
    pending += text.slice(consumed);
    consumed = text.length;

    const { objects, rest } = extractJsonObjects(pending);
    pending = rest;
    for (const raw of objects) {
      try {
        const event = normalizeEvent(JSON.parse(raw));
        if (!event) continue;
        rawEvents.push(event);
        // Thread back-references: the `conversation` event comes first (when
        // the turn joined a thread at all); the LAST `metadata` is authoritative.
        if (event.type === 'conversation' || event.type === 'metadata') {
          if (typeof event.data?.conversation_id === 'string' && event.data.conversation_id) {
            result.conversationId = event.data.conversation_id;
          }
          if (typeof event.data?.message_id === 'string' && event.data.message_id) {
            result.messageId = event.data.message_id;
          }
        }
        handlers.onEvent(event);
      } catch {
        // Skip malformed fragments rather than killing the stream.
      }
    }
  };

  const finish = (err?: SearchError) => {
    if (finished) return;
    finished = true;
    if (err) {
      handlers.onError(err);
      return;
    }
    handlers.onDone(result);

    // The answer is already on screen; persisting it is a background side
    // effect that yields the id "share" needs. Best-effort by design — failing
    // here only means this answer can't be shared, never that the search failed.
    // Autocomplete outcome (contract call #3) follows the search_query record
    // (#2) so it can carry that record's id; null when there is none.
    const sent = body;
    const reportOutcome = (responseId: string | null) =>
      reportAutocompleteOutcome(sent?.query ?? args.query.trim(), responseId).catch(() => {});
    if (handlers.onRecorded && sent && rawEvents.length) {
      recordSearchResponse({ sessionId: sent.session_id, request: sent, response: rawEvents })
        .then((responseId) => {
          if (responseId) handlers.onRecorded?.(responseId);
          return reportOutcome(responseId);
        })
        .catch((e) => {
          console.warn('[api] search not recorded:', (e as Error)?.message ?? e);
          return reportOutcome(null);
        });
    } else {
      reportOutcome(null);
    }
  };

  xhr.timeout = STREAM_TIMEOUT_MS;
  xhr.onprogress = pump;
  xhr.onload = () => {
    pump();
    if (xhr.status >= 200 && xhr.status < 300) {
      result.validationFailed = (xhr.getResponseHeader('X-Validation-Failed') ?? '').toLowerCase() === 'true';
      result.validationType = xhr.getResponseHeader('X-Validation-Type') || null;
      console.log('[api] streamQuery ✓ complete', result.conversationId ?? '(no conversation)');
      finish();
    } else {
      // Pre-stream failure: plain JSON, not NDJSON. Surface the gateway's /
      // limiter's message (user-displayable per contract) with a typed code.
      const text = String(xhr.responseText ?? '');
      console.warn('[api] streamQuery ✗', xhr.status, text.slice(0, 200));
      finish(errorForStatus(xhr.status, text, xhr.getResponseHeader('Retry-After')));
    }
  };
  xhr.onerror = () => finish(new SearchError('Network error — could not reach search service', 'network'));
  xhr.ontimeout = () => finish(new SearchError('Search timed out', 'timeout'));

  // Identity is async (token, device id, visitor id); open + send once it
  // resolves. A cancel() before then just never sends.
  const fbUser = auth().currentUser;
  Promise.all([
    fbUser ? fbUser.getIdToken().catch(() => null) : Promise.resolve(null as string | null),
    DeviceInfo.getUniqueId().catch(() => ''),
    getVisitorId().catch(() => ''),
  ]).then(([token, deviceId, visitorId]) => {
    if (finished) return;
    // Owner key (contract: provider_id / a stable id you control, not a
    // real address): the Firebase uid, else this install's visitor id.
    const owner = (fbUser?.uid || visitorId || args.email || 'guest').trim().slice(0, 254);
    body = {
      email: owner,
      query: args.query.trim().slice(0, MAX_QUERY_CHARS),
      conversation_id: args.conversationId ?? '',
      session_id: args.sessionId ?? makeSessionId(),
      skip_resolution: !!args.skipResolution,
      output_language: OUTPUT_LANGUAGE[args.languageCode ?? 'en'] ?? 'English',
      top_k: 10,
      min_similarity: 0.7,
      user_lat: args.userLat ?? 37.5665,
      user_lng: args.userLng ?? 126.978,
      metadata: { source: 'mobile', platform: Platform.OS },
    };
    const url =
      `${SEARCH_API_URL}/api/v2/search?platform=${Platform.OS}` +
      `&device_id=${encodeURIComponent(deviceId ?? '')}`;
    console.log(
      `[api] streamQuery → POST /api/v2/search`,
      JSON.stringify({ query: body.query, conversation_id: body.conversation_id, skip_resolution: body.skip_resolution }),
    );
    xhr.open('POST', url);
    xhr.setRequestHeader('accept', 'application/x-ndjson, application/json');
    xhr.setRequestHeader('Content-Type', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(JSON.stringify(body));
  });

  return {
    cancel: () => {
      finished = true; // suppress callbacks after an intentional abort
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    },
  };
}
