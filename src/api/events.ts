/**
 * events.ts — Events API (same backend + contract the react-frontend web
 * Events modal uses; shapes taken from test.konnect.kr/openapi.json).
 *
 *   • GET   /api/v1/events?group_by=month&device_id=…&platform=…
 *           Calendar-style grouped response:
 *             { this_week: [...], this_month: [...], "<Month name>": [...],
 *               selected_time_range: [...] }
 *           (range_start / range_end scope the selected_time_range bucket.)
 *   • GET   /api/v1/events?page=&limit=…             flat paged list
 *   • GET   /api/v1/events/saved                     the user's saved events
 *   • GET   /api/v1/events/{id}                      single event (counts a view)
 *   • PATCH /api/v1/events/{id}  { like_status?, save_status? }
 *
 * Every call carries the Firebase bearer token plus device_id + platform as
 * query params, per the backend's tracking contract.
 */
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { AUTH_API_URL } from '../config';

export interface ApiEvent {
  id: number;
  /** Event title. */
  text: string;
  date: string | null;
  schedule: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  description: string | null;
  organizer: string | null;
  duration: string | null;
  image: string | null;
  category: string | null;
  sourceUrl: string | null;
  sourceLabel: string | null;
  like_count: number;
  like_status: boolean;
  view_count: number;
  view_status: boolean;
  save_count: number;
  save_status: boolean;
}

/** GET /events?group_by=month response — bucket → events. */
export type GroupedEvents = Record<string, ApiEvent[]>;

async function ctx() {
  const fbUser = auth().currentUser;
  const [token, deviceId] = await Promise.all([
    fbUser ? fbUser.getIdToken() : Promise.resolve(null),
    DeviceInfo.getUniqueId(),
  ]);
  return { token, deviceId };
}

function qs(params: Record<string, string | number | null | undefined>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

async function call<T>(path: string, init: RequestInit & { query?: Record<string, any> } = {}): Promise<T> {
  const { token, deviceId } = await ctx();
  const url = `${AUTH_API_URL}${path}${qs({
    device_id: deviceId,
    platform: Platform.OS,
    ...(init.query ?? {}),
  })}`;
  const headers: Record<string, string> = {
    accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  console.log(`[api] events → ${init.method ?? 'GET'} ${url}`);
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${init.method ?? 'GET'} ${path} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Calendar-grouped events (this_week / this_month / <Month> / selected_time_range). */
export function getEventsGrouped(range?: { start: string; end: string }): Promise<GroupedEvents> {
  return call<GroupedEvents>('/api/v1/events', {
    query: {
      group_by: 'month',
      range_start: range?.start,
      range_end: range?.end,
    },
  });
}

/**
 * Flat paged list — the lazy-load path. Returns [] once exhausted (page past
 * the end), which the feed uses as its end-of-list signal. For authenticated
 * callers the backend already sorts saved (wishlisted) events first.
 */
export function getEvents(page = 1, limit = 20): Promise<ApiEvent[]> {
  return call<ApiEvent[]>('/api/v1/events', { query: { page, limit } });
}

export function getSavedEvents(page = 1, limit = 50): Promise<ApiEvent[]> {
  return call<ApiEvent[]>('/api/v1/events/saved', { query: { page, limit } });
}

/** Fetching a single event also registers a view on the backend. */
export function getEvent(id: number): Promise<ApiEvent> {
  return call<ApiEvent>(`/api/v1/events/${id}`);
}

export function updateEventEngagement(
  id: number,
  body: { like_status?: boolean; save_status?: boolean },
): Promise<ApiEvent> {
  return call<ApiEvent>(`/api/v1/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// Tracking moved to ./tracking (updated contract: visitor_id + device_id in
// the body, page_view rows, server-side channel defaults). Re-exported here
// for existing imports.
export { track, trackEvent } from './tracking';
export type { TrackingSourceType, TrackingChannel } from './tracking';
