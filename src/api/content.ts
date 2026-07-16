/**
 * content.ts — Home screen content + chat history.
 *
 * MOCK implementation: returns local data after a short delay. To go live:
 *   - getHomeContent → GET /content/home   (suggestion chips + greetings)
 *   - getHistory     → GET /history
 * Replace the mock bodies with the commented `request(...)` calls.
 */

import { greetings, history, suggestions } from '../mocks/data';
import { mockDelay /*, request */ } from './client';

export interface HomeContent {
  suggestions: string[];
  greetings: string[];
}

export interface HistoryItem {
  id: string;
  title: string;
  when: string;
}

/**
 * Fetches the Home screen suggestion chips and rotating greetings.
 * Currently mocked — returns local data.
 */
export async function getHomeContent(): Promise<HomeContent> {
  console.log('[api] getHomeContent → GET /content/home');
  await mockDelay();

  // ─── Real implementation (uncomment when backend is ready) ───
  // return request<HomeContent>('/content/home');

  console.log('[api] getHomeContent ✓');
  return { suggestions, greetings };
}

/**
 * Fetches the user's recent chat history.
 * Currently mocked — returns local data.
 */
export async function getHistory(): Promise<HistoryItem[]> {
  console.log('[api] getHistory → GET /history');
  await mockDelay();

  // ─── Real implementation (uncomment when backend is ready) ───
  // return request<HistoryItem[]>('/history');

  console.log('[api] getHistory ✓', history.length, 'items');
  return history;
}
