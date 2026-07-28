/**
 * content.ts — chat history.
 *
 * MOCK implementation: returns local data after a short delay. To go live:
 *   - getHistory → GET /history
 * Replace the mock body with the commented `request(...)` call.
 */

import { history } from '../mocks/data';
import { mockDelay /*, request */ } from './client';

export interface HistoryItem {
  id: string;
  title: string;
  when: string;
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
