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
 * kakao_p1, receipt_banner → kakao_p2, and search ONLY when event_type is
 * cab_booking_click → kakao_p3; every other combination defaults to null).
 * Page views are ordinary rows: source_type=page_view + a required page_path
 * (+ optional referrer). Pickup lat/lng are contract-optional; this app
 * declares no location permission, so they're never sent — the server falls
 * back to an IP→city lookup for event location.
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
  | 'logout_all' | 'account_deleted' | 'feedback' | 'facebook_ads' | 'page_view'
  | 'profile';
/** Full server enum — any other value on write is a 422. */
export type TrackingChannel =
  | 'kakao_p1' | 'kakao_p2' | 'kakao_p3' | 'kakao_p4' | 'kakao_p5' | 'kakao_p6'
  | 'profile_email' | 'profile_username' | 'profile_name' | 'profile_phone'
  | 'profile_privacy' | 'profile_photo' | 'profile_appearance'
  | 'profile_preferences_language' | 'profile_response_language'
  | 'profile_auto_suggest' | 'profile_homepage_widgets' | 'profile_bio'
  | 'profile_interests' | 'profile_birthday' | 'settings_language'
  | 'onboarding_username' | 'onboarding_preferred_language' | 'onboarding_purpose'
  | 'onboarding_context_reason' | 'onboarding_context_duration'
  | 'onboarding_destinations' | 'onboarding_interests' | 'onboarding_platform';

/** The profile-edit events (contract rows 7–12): source_type profile, no source_id. */
export type ProfileEditEventType =
  | 'edit_profile_about' | 'edit_profile_interests' | 'edit_profile_onboarding'
  | 'edit_profile_preferences' | 'edit_profile_username' | 'edit_profile_photo';

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

/**
 * Convenience wrappers — event_type / source_type / channel per the contract's
 * "12 new client-fired events" table (rows 1–12).
 */
export const track = {
  eventView: (id: number) => trackEvent({ event_type: 'event_view', source_type: 'event', source_id: String(id) }),
  // Rows 1–4: like_event / unlike_event / save_event / unsave_event.
  eventLike: (id: number, on: boolean) =>
    trackEvent({ event_type: on ? 'like_event' : 'unlike_event', source_type: 'event', source_id: String(id) }),
  eventSave: (id: number, on: boolean) =>
    trackEvent({ event_type: on ? 'save_event' : 'unsave_event', source_type: 'event', source_id: String(id) }),
  cabBookingClick: (id: number) =>
    trackEvent({ event_type: 'cab_booking_click', source_type: 'event', source_id: String(id) }),
  // Row 5: metadata carries the URL (channel is a constrained enum, can't).
  openEventLink: (id: number, url: string) =>
    trackEvent({
      event_type: 'open_event_link',
      source_type: 'event',
      source_id: String(id),
      metadata: { event_link: url },
    }),
  // Row 6: expanding a History accordion row = viewing that stored search.
  viewSearch: (searchHistoryRowId: string) =>
    trackEvent({ event_type: 'view_search', source_type: 'search', source_id: searchHistoryRowId }),
  // Rows 7–12: one row per edited field; channel names the field.
  profileEdit: (eventType: ProfileEditEventType, channel: TrackingChannel) =>
    trackEvent({ event_type: eventType, source_type: 'profile', channel }),
  // Home cashback banner tap — monitoring only, channel always null (web
  // Home.js handleBannerClick parity).
  receiptBannerClick: () =>
    trackEvent({ event_type: 'receipt_banner_click', source_type: 'receipt_banner_click' }),
  // Logged after a receipt upload SUCCEEDS, never on the click (web parity —
  // a failed upload is not a receipt uploaded).
  receiptUpload: () =>
    trackEvent({ event_type: 'receipt_upload', source_type: 'receipt_upload' }),
  feedbackSubmitted: (kind: string) =>
    trackEvent({ event_type: 'feedback_submitted', source_type: 'feedback', metadata: { kind } }),
};
