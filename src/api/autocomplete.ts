/**
 * autocomplete.ts — search-bar autocomplete (Confluence "API Contract:
 * Search-bar autocomplete", page 66682883).
 *
 * Three calls, in the order a real interaction uses them:
 *   1. GET /api/v1/search/autocomplete?q=…   while typing (debounced, from 3
 *      characters). No login needed, but a signed-in user's Firebase token is
 *      mandatory on the call (contract rev. 2026-09-15).
 *   2. POST /tracking/events  event_type "search_query"   — recordSearchResponse()
 *      in tracking.ts; the only new thing is its `search_query_response_id`.
 *   3. POST /tracking/events  event_type "autocomplete_outcome" — once, right
 *      after #2, describing what autocomplete showed and what the person did
 *      with it. Typing alone never writes anything.
 *
 * `match_type`: "exact" is a literal continuation of what was typed; "fuzzy"
 * is a typo-corrected result. Both are listed as chips here (the mobile
 * design has no inline ghost text, which is the only place fuzzy is excluded).
 */
import auth from '@react-native-firebase/auth';
import { API_BASE_URL } from '../config';
import { trackEvent } from './tracking';

export type AutocompleteMatchType = 'exact' | 'fuzzy';

export interface AutocompleteSuggestion {
  /** The suggested question, original casing. */
  text: string;
  /** How many times this question has been asked — used for ranking. */
  score: number;
  match_type: AutocompleteMatchType;
}

/** The contract caps `q` at 200 characters. */
const MAX_QUERY_CHARS = 200;

export async function fetchAutocomplete(
  query: string,
  signal?: AbortSignal,
): Promise<AutocompleteSuggestion[]> {
  const q = query.trim().slice(0, MAX_QUERY_CHARS);
  if (!q) return [];
  const url = `${API_BASE_URL}/api/v1/search/autocomplete?q=${encodeURIComponent(q)}`;
  // Signed-in users must present their token; guests send none.
  const fbUser = auth().currentUser;
  const token = fbUser ? await fbUser.getIdToken().catch(() => null) : null;
  const res = await fetch(url, {
    headers: { accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    signal,
  });
  if (!res.ok) throw new Error(`autocomplete failed: HTTP ${res.status}`);
  const data = (await res.json()) as { suggestions?: AutocompleteSuggestion[] };
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}

// ── Outcome tracking (call #3) ───────────────────────────────────────────────

export interface ShownSuggestion {
  text: string;
  match_type: AutocompleteMatchType;
}

export interface AutocompleteOutcome {
  /** The query that was actually submitted. */
  finalQuery: string;
  /** What the list showed when the search was submitted (empty if nothing). */
  suggestionsShown: ShownSuggestion[];
  /** The chip the person tapped, or null if they typed their own thing. */
  selectedSuggestion: string | null;
}

let staged: AutocompleteOutcome | null = null;

/**
 * Remember what autocomplete did for the search that is about to run. The
 * outcome is reported once the search has been recorded (see search.ts), so
 * it can reference the `search_query_response_id`.
 */
export function stageAutocompleteOutcome(outcome: AutocompleteOutcome): void {
  staged = outcome;
}

/**
 * Fire the `autocomplete_outcome` event for a submitted search. Falls back to
 * "nothing was shown" when no outcome was staged for this query (voice,
 * follow-ups, history re-runs). `searchQueryResponseId` is null when the
 * search_query record did not yield one — the contract allows that.
 */
export async function reportAutocompleteOutcome(
  finalQuery: string,
  searchQueryResponseId: string | null,
): Promise<void> {
  const outcome =
    staged && staged.finalQuery === finalQuery
      ? staged
      : { finalQuery, suggestionsShown: [], selectedSuggestion: null };
  staged = null;
  await trackEvent({
    event_type: 'autocomplete_outcome',
    source_type: 'search',
    source_id: searchQueryResponseId,
    metadata: {
      final_query: outcome.finalQuery,
      autocomplete_used: outcome.selectedSuggestion != null,
      suggestions_shown: outcome.suggestionsShown,
      selected_suggestion: outcome.selectedSuggestion,
    },
  });
}
