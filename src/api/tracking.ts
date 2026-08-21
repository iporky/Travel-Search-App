/**
 * tracking.ts — analytics events (Confluence "API Contract: Tracking and
 * Analytics", page 48660481).
 *
 *   POST {AUTH_API_URL}/api/v1/tracking/events?platform=<android|ios|web>
 *
 * Unauthenticated by design — no Authorization header is read on this route.
 * Identity comes from the body: `provider_id` (Firebase uid → user_id),
 * `visitor_id` (persistent install UUID → joins the flow on /tracking/flow),
 * and `device_id` (lets the server resolve the active session → session_id).
 * `source_id` is required when source_type is buzz_event/buzz_post/event/
 * search. `channel` is omitted so the server's defaults apply (event →
 * kakao_p1, search+cab_booking_click → kakao_p3, …). Page views are ordinary
 * rows: source_type=page_view + a required page_path (+ optional referrer).
 *
 * The backend logs login/register (on re-auth), logout, logout_all and
 * account_deleted internally — clients must NOT also post those.
 */
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { AUTH_API_URL } from '../config';
import { getVisitorId } from '../utils/visitorId';

export type TrackingSourceType =
  | 'buzz_event' | 'buzz_post' | 'event' | 'home' | 'search' | 'receipt_banner'
  | 'receipt_banner_click' | 'receipt_upload' | 'login' | 'register' | 'logout'
  | 'logout_all' | 'account_deleted' | 'feedback' | 'facebook_ads' | 'page_view';
export type TrackingChannel = 'kakao_p1' | 'kakao_p2' | 'kakao_p3' | 'kakao_p4' | 'kakao_p5' | 'kakao_p6';

export interface TrackEventBody {
  event_type: string;
  source_type: TrackingSourceType;
  source_id?: string | null;
  channel?: TrackingChannel | null;
  page_path?: string | null;
  referrer?: string | null;
  lat?: number | null;
  lng?: number | null;
  metadata?: Record<string, unknown> | null;
}

export async function trackEvent(body: TrackEventBody): Promise<void> {
  const url = `${AUTH_API_URL}/api/v1/tracking/events?platform=${Platform.OS}`;
  try {
    const [visitorId, deviceId] = await Promise.all([
      getVisitorId(),
      DeviceInfo.getUniqueId().catch(() => null),
    ]);
    const providerId = auth().currentUser?.uid ?? undefined;
    console.log('[api] track → POST', body.event_type, body.source_type, body.source_id ?? body.page_path ?? '');
    const res = await fetch(url, {
      method: 'POST',
      headers: { accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Omit provider_id entirely when signed out → user_id: null.
        ...(providerId ? { provider_id: providerId } : {}),
        visitor_id: visitorId,
        ...(deviceId ? { device_id: deviceId } : {}),
        ...body,
      }),
    });
    if (!res.ok) console.warn('[api] track failed', res.status);
  } catch (e) {
    // Analytics must never break the UI.
    console.warn('[api] track error', (e as Error)?.message ?? e);
  }
}

/** One page-view row (source_type page_view; page_path required by contract). */
export function trackPageView(pagePath: string, referrer?: string | null): Promise<void> {
  return trackEvent({
    event_type: 'page_view',
    source_type: 'page_view',
    page_path: pagePath,
    referrer: referrer ?? undefined,
  });
}

/** Convenience wrappers (mirrors the web client's usage). */
export const track = {
  eventView: (id: number) => trackEvent({ event_type: 'event_view', source_type: 'event', source_id: String(id) }),
  eventLike: (id: number, on: boolean) =>
    trackEvent({ event_type: on ? 'event_like' : 'event_unlike', source_type: 'event', source_id: String(id) }),
  eventSave: (id: number, on: boolean) =>
    trackEvent({ event_type: on ? 'event_save' : 'event_unsave', source_type: 'event', source_id: String(id) }),
  cabBookingClick: (id: number) =>
    trackEvent({ event_type: 'cab_booking_click', source_type: 'event', source_id: String(id) }),
  sourceClick: (id: number) =>
    trackEvent({ event_type: 'event_source_click', source_type: 'event', source_id: String(id) }),
  feedbackSubmitted: (kind: string) =>
    trackEvent({ event_type: 'feedback_submitted', source_type: 'feedback', metadata: { kind } }),
};
