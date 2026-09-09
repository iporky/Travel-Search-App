/**
 * share.ts — mint short "share links".
 *
 * Contract: "API Contract — Share links (Events + Buzz + Search)".
 *   POST /api/v1/share/event/{event_id}     -> { share_url }
 *   POST /api/v1/share/search/{response_id} -> { share_url }
 *
 * Body is `{ "link": "<the destination page for this content>" }`. The backend
 * validates `link` before anything else: its path must start with `/events/`
 * for an event share and `/search/` for a search share, else 422. Sharing the
 * same thing again within 7 days reuses the existing code.
 *
 * Live (not mocked) — a share link is only useful if it actually resolves.
 * Same call shape as events.ts: bearer token when signed in, plus device_id +
 * platform on the query string. `visitor_id` rides along too: it is the only
 * proof of ownership for something created anonymously.
 *
 * NOTE: the older per-resource routes (POST /events/{id}/share, POST
 * /history/search/{id}/share) were RETIRED — they 404, they are not aliases.
 */

import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { AUTH_API_URL } from '../config';
import { getVisitorId } from '../utils/visitorId';

export interface ShareResponse {
  share_url: string;
}

/**
 * Where a shared link ultimately lands. It has to be a host that actually
 * renders these pages — the web app serves /events/:id and /search/answer/:id —
 * so the app mints exactly the same destination the website does.
 */
const SHARE_LINK_HOST = AUTH_API_URL;

/** Destination URL for a shared event (path must start with /events/). */
export const eventShareLink = (eventId: string | number): string =>
  `${SHARE_LINK_HOST}/events/${eventId}`;

/** Destination URL for a shared search answer (path must start with /search/). */
export const searchAnswerShareLink = (responseId: string): string =>
  `${SHARE_LINK_HOST}/search/answer/${responseId}`;

function qs(params: Record<string, string | number | null | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

async function mint(path: string, link: string): Promise<string> {
  const fbUser = auth().currentUser;
  const [token, deviceId, visitorId] = await Promise.all([
    fbUser ? fbUser.getIdToken() : Promise.resolve(null),
    DeviceInfo.getUniqueId(),
    getVisitorId(),
  ]);

  const url = `${AUTH_API_URL}${path}${qs({
    platform: Platform.OS,
    device_id: deviceId,
    visitor_id: visitorId,
  })}`;

  const headers: Record<string, string> = {
    accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  console.log(`[api] share → POST ${url}`);
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ link }) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${path} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as ShareResponse;
  if (!data?.share_url) throw new Error('Share response had no share_url');
  return data.share_url;
}

/**
 * Mint a short link for an event. The id is trusted verbatim and never looked
 * up server-side, so pass a real one.
 */
export function shareEvent(eventId: string | number): Promise<string> {
  return mint(`/api/v1/share/event/${eventId}`, eventShareLink(eventId));
}

/**
 * Mint a short link for one past search answer. A 404 here means the caller
 * doesn't own it as often as "doesn't exist", so show a generic "can't share".
 */
export function shareSearchAnswer(responseId: string): Promise<string> {
  return mint(`/api/v1/share/search/${responseId}`, searchAnswerShareLink(responseId));
}
