/**
 * search.ts — LIVE streaming query endpoint.
 *
 *   POST https://dev.konnect.kr/query/stream
 *   headers: { accept: application/json, Content-Type: application/json }
 *   body: { email, metadata: { source }, min_similarity, output_language,
 *           query, session_id, top_k, user_lat, user_lng }
 *
 * The response is a stream of JSON objects, each shaped { type, data }:
 *   category, service_recommendations, search_queries, template_metadata,
 *   worker_progress, keepalive, final_summary_chunk, final_summary,
 *   followup_questions, confidence_indicator, quality_score, metadata, …
 *
 * React Native's fetch() cannot read a body incrementally, so we stream via
 * XMLHttpRequest: `onprogress` fires as responseText grows and we extract
 * complete top-level JSON objects from the growing buffer with a brace-depth
 * scanner (robust to both NDJSON and concatenated pretty-printed objects).
 */

import { SEARCH_API_URL } from '../config';

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

export interface SubmitQueryArgs {
  query: string;
  email?: string;
  /** App language code (e.g. 'en', 'ko') — mapped to the API's output_language. */
  languageCode?: string;
  sessionId?: string;
  userLat?: number;
  userLng?: number;
}

export interface StreamHandlers {
  /** Called once per parsed { type, data } object, in arrival order. */
  onEvent: (event: StreamEvent) => void;
  /** Called when the stream ends normally (after the last event). */
  onDone: () => void;
  /** Called on network failure or non-2xx status. */
  onError: (error: Error) => void;
}

// The API expects an English language name.
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

  const pump = () => {
    const text = xhr.responseText ?? '';
    if (text.length <= consumed) return;
    pending += text.slice(consumed);
    consumed = text.length;

    const { objects, rest } = extractJsonObjects(pending);
    pending = rest;
    for (const raw of objects) {
      try {
        const event = JSON.parse(raw) as StreamEvent;
        if (event && typeof event.type === 'string') handlers.onEvent(event);
      } catch {
        // Skip malformed fragments rather than killing the stream.
      }
    }
  };

  const finish = (err?: Error) => {
    if (finished) return;
    finished = true;
    if (err) handlers.onError(err);
    else handlers.onDone();
  };

  const body = {
    email: args.email || 'user@example.com',
    metadata: { source: 'mobile' },
    min_similarity: 0.7,
    output_language: OUTPUT_LANGUAGE[args.languageCode ?? 'en'] ?? 'English',
    query: args.query.trim(),
    session_id: args.sessionId ?? makeSessionId(),
    top_k: 10,
    user_lat: args.userLat ?? 37.5665,
    user_lng: args.userLng ?? 126.978,
  };

  console.log('[api] streamQuery → POST /query/stream', body.query);

  xhr.open('POST', `${SEARCH_API_URL}/query/stream`);
  xhr.setRequestHeader('accept', 'application/json');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.timeout = 90_000; // the pipeline can take ~15-30s; leave generous headroom

  xhr.onprogress = pump;
  xhr.onload = () => {
    pump();
    if (xhr.status >= 200 && xhr.status < 300) {
      console.log('[api] streamQuery ✓ complete');
      finish();
    } else {
      finish(new Error(`Search failed: HTTP ${xhr.status}`));
    }
  };
  xhr.onerror = () => finish(new Error('Network error — could not reach search service'));
  xhr.ontimeout = () => finish(new Error('Search timed out'));

  xhr.send(JSON.stringify(body));

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
