/**
 * community.ts — community / "Buzz" feed.
 *
 * MOCK implementation: returns the local feed after a short delay. To go live:
 *   - getCommunityFeed → GET /community/feed
 * Replace the mock body with the commented `request(...)` call.
 */

import { CommunityItem } from '../components/CommunityCard';
import { communityFeed } from '../mocks/data';
import { mockDelay /*, request */ } from './client';

/**
 * Fetches the community feed shown on the Buzz screen.
 * Currently mocked — returns local data.
 */
export async function getCommunityFeed(): Promise<CommunityItem[]> {
  console.log('[api] getCommunityFeed → GET /community/feed');
  await mockDelay();

  // ─── Real implementation (uncomment when backend is ready) ───
  // return request<CommunityItem[]>('/community/feed');

  console.log('[api] getCommunityFeed ✓', communityFeed.length, 'items');
  return communityFeed;
}
