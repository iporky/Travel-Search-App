import { useEffect, useRef, useState } from 'react';
import { AutocompleteSuggestion, fetchAutocomplete } from '../api/autocomplete';

export type AutocompleteStatus = 'idle' | 'loading' | 'results' | 'empty' | 'error';

export interface AutocompleteState {
  status: AutocompleteStatus;
  suggestions: AutocompleteSuggestion[];
  /** The query the current suggestions answer (for prefix highlighting). */
  forQuery: string;
}

/** Keystrokes settle for this long before a request goes out. */
const DEBOUNCE_MS = 250;
/** Below this the API answers with an empty list anyway; show Trending instead. */
const MIN_CHARS = 2;

const IDLE: AutocompleteState = { status: 'idle', suggestions: [], forQuery: '' };

/**
 * Debounced GET /search/autocomplete for the search sheet. While a new
 * request is in flight the previous suggestions stay on screen (no flicker
 * between keystrokes); the loading dots show only when there is nothing yet
 * to show. Stale responses are discarded and in-flight requests aborted.
 */
export function useAutocomplete(query: string, enabled: boolean): AutocompleteState {
  const [state, setState] = useState<AutocompleteState>(IDLE);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < MIN_CHARS) {
      seq.current += 1;
      setState(IDLE);
      return;
    }
    const mySeq = (seq.current += 1);
    const controller = new AbortController();
    setState((s) => (s.suggestions.length ? s : { ...s, status: 'loading' }));
    const timer = setTimeout(async () => {
      try {
        const list = await fetchAutocomplete(q, controller.signal);
        if (seq.current !== mySeq) return;
        setState({ status: list.length ? 'results' : 'empty', suggestions: list, forQuery: q });
      } catch (e) {
        if (controller.signal.aborted || seq.current !== mySeq) return;
        console.warn('[autocomplete] failed', (e as Error)?.message ?? e);
        setState({ status: 'error', suggestions: [], forQuery: q });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  return state;
}
