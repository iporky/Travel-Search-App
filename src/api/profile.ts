/**
 * profile.ts — User profile API (Confluence "API Contract: Profile",
 * page 43909132 — the same contract the web Profile page uses).
 *
 *   • GET    {AUTH_API_URL}/api/v1/profile/{uid}?device_id=&platform=
 *            → ProfileResponse { user_id, email, username, name, phone,
 *              profile_picture, is_private, preferences{…},
 *              personalization{ description, interests }, about{ birthday } }
 *            (null when none exists — 404).
 *   • PATCH  {AUTH_API_URL}/api/v1/profile/{uid}?device_id=&platform=
 *            multipart/form-data, all optional: username / name / email /
 *            phone / preferences (JSON) / personalization (JSON) /
 *            about (JSON, e.g. '{"birthday":"1998-05-14"}') / is_private /
 *            profile_picture (file). Sub-document keys are written with
 *            dotted $set — a partial update never wipes sibling keys.
 *   • GET    …/profile/{uid}/settings                language (404 = not set)
 *   • PATCH  …/profile/{uid}/settings { language }   upsert
 *   • POST   …/profile/{uid}/sessions/signout?visitor_id=      end this session
 *   • POST   …/profile/{uid}/sessions/signout-all?visitor_id=  end every session
 *   • DELETE …/profile/{uid}?visitor_id=                        soft-delete
 *   (visitor_id is forwarded into the backend's own logout / logout_all /
 *    account_deleted tracking events, joining this device's flow — the
 *    backend fires those events itself; clients must not double-log them.)
 *
 * uid is the Firebase uid (stable across Google/Apple/Facebook).
 * headers: accept, Authorization: Bearer <firebase id token>.
 */
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { AUTH_API_URL } from '../config';
import { getVisitorId } from '../utils/visitorId';

/** preferences block (web Profile: appearance / language / …). */
export interface ProfilePreferences {
  appearance?: 'system' | 'light' | 'dark';
  language?: string | null;
  preferred_response_language?: string | null;
  auto_suggest?: boolean;
  homepage_widgets?: boolean;
}

/** personalization block: description (≤500 chars) + interests (deduped). */
export interface ProfilePersonalization {
  description?: string;
  interests?: string[];
}

/** about block — currently just the birthday (ISO YYYY-MM-DD). */
export interface ProfileAbout {
  birthday?: string | null;
}

/** Raw shape from the API (the photo field is `profile_picture`). */
interface RawUserProfile {
  user_id: string;
  email: string | null;
  username: string;
  name: string;
  phone?: string | null;
  profile_picture?: string | null;
  /** Legacy name, kept for tolerance if an older server responds. */
  profile_pic?: string | null;
  is_admin: boolean;
  is_active: boolean;
  updated_at: string;
  is_private?: boolean;
  preferences?: ProfilePreferences | null;
  personalization?: (ProfilePersonalization & { birthday?: string | null }) | null;
  about?: ProfileAbout | null;
}

export interface UserProfile {
  user_id: string;
  email: string | null;
  username: string;
  name: string;
  phone: string;
  /** Normalized public S3 photo URL (from the API's `profile_picture`). */
  profile_pic: string | null;
  is_admin: boolean;
  is_active: boolean;
  updated_at: string;
  is_private: boolean;
  preferences: ProfilePreferences;
  personalization: ProfilePersonalization;
  about: ProfileAbout;
}

/** Map the raw API payload to our internal shape (photo field → profile_pic). */
function normalizeProfile(raw: RawUserProfile): UserProfile {
  return {
    user_id: raw.user_id,
    email: raw.email,
    username: raw.username,
    name: raw.name,
    phone: raw.phone ?? '',
    profile_pic: raw.profile_picture ?? raw.profile_pic ?? null,
    is_admin: raw.is_admin,
    is_active: raw.is_active,
    updated_at: raw.updated_at,
    is_private: raw.is_private ?? false,
    preferences: raw.preferences ?? {},
    personalization: {
      description: raw.personalization?.description ?? '',
      interests: Array.isArray(raw.personalization?.interests) ? raw.personalization!.interests! : [],
    },
    about: {
      // Tolerate the older personalization.birthday spot from before `about` landed.
      birthday: raw.about?.birthday ?? raw.personalization?.birthday ?? null,
    },
  };
}

export interface UpdateProfileArgs {
  username?: string;
  name?: string;
  email?: string;
  phone?: string;
  /** Merged server-side with the stored block (send the keys you change). */
  preferences?: ProfilePreferences;
  /** Sent as one JSON blob — pass the full block (description + interests). */
  personalization?: ProfilePersonalization;
  /** about sub-document, e.g. { birthday: '1998-05-14' }. */
  about?: ProfileAbout;
  is_private?: boolean;
  /** Local file uri (from expo-image-picker) — uploaded as `profile_picture`. */
  photoUri?: string;
}

async function profileAuthContext() {
  const fbUser = auth().currentUser;
  if (!fbUser) throw new Error('profile: no signed-in user');
  const [firebaseToken, deviceId] = await Promise.all([
    fbUser.getIdToken(),
    DeviceInfo.getUniqueId(),
  ]);
  return { uid: fbUser.uid, firebaseToken, deviceId };
}

function profileUrl(uid: string, deviceId: string, suffix = '') {
  return `${AUTH_API_URL}/api/v1/profile/${encodeURIComponent(uid)}${suffix}?device_id=${encodeURIComponent(deviceId)}&platform=${Platform.OS}`;
}

/** GET the profile for the signed-in user. Returns null on 404 (no record). */
export async function getProfile(): Promise<UserProfile | null> {
  const { uid, firebaseToken, deviceId } = await profileAuthContext();
  const url = profileUrl(uid, deviceId);
  console.log('[api] getProfile → GET', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json', Authorization: `Bearer ${firebaseToken}` },
  });

  if (res.status === 404) {
    console.log('[api] getProfile — no existing profile');
    return null;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`getProfile failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const raw = (await res.json().catch(() => null)) as RawUserProfile | null;
  const data = raw ? normalizeProfile(raw) : null;
  console.log('[api] getProfile ✓', JSON.stringify(data));
  return data;
}

/** Guess a supported mime type from a local image uri. */
function imageMime(uri: string): { mime: string; ext: string } {
  const ext = (uri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
  if (ext === 'png') return { mime: 'image/png', ext: 'png' };
  if (ext === 'webp') return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

/** PATCH the profile (partial, multipart). Returns the updated profile. */
export async function updateProfile(args: UpdateProfileArgs): Promise<UserProfile> {
  const { uid, firebaseToken, deviceId } = await profileAuthContext();
  const url = profileUrl(uid, deviceId);

  const form = new FormData();
  if (args.username != null) form.append('username', args.username);
  if (args.name != null) form.append('name', args.name);
  if (args.email != null) form.append('email', args.email);
  if (args.phone != null) form.append('phone', args.phone);
  if (args.preferences != null) form.append('preferences', JSON.stringify(args.preferences));
  if (args.personalization != null) form.append('personalization', JSON.stringify(args.personalization));
  if (args.about != null) form.append('about', JSON.stringify(args.about));
  if (args.is_private != null) form.append('is_private', String(args.is_private));
  if (args.photoUri) {
    const { mime, ext } = imageMime(args.photoUri);
    // React Native's FormData file shape.
    form.append('profile_picture', {
      uri: args.photoUri,
      name: `profile.${ext}`,
      type: mime,
    } as any);
  }

  console.log('[api] updateProfile → PATCH', url, {
    username: args.username,
    name: args.name,
    personalization: args.personalization,
    about: args.about,
    preferences: args.preferences,
    hasPhoto: !!args.photoUri,
  });

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${firebaseToken}`,
      // NOTE: do NOT set Content-Type — fetch adds the multipart boundary itself.
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`updateProfile failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const data = normalizeProfile((await res.json()) as RawUserProfile);
  console.log('[api] updateProfile ✓', JSON.stringify(data));
  return data;
}

async function sessionCall(suffix: string, method: 'POST' | 'DELETE'): Promise<void> {
  const { uid, firebaseToken, deviceId } = await profileAuthContext();
  // visitor_id joins the backend's internal logout/logout_all/account_deleted
  // tracking event into this device's flow.
  const visitorId = await getVisitorId().catch(() => null);
  const url =
    profileUrl(uid, deviceId, suffix) +
    (visitorId ? `&visitor_id=${encodeURIComponent(visitorId)}` : '');
  console.log(`[api] profile ${method} ${suffix || '(account)'} →`, url);
  const res = await fetch(url, {
    method,
    headers: { accept: 'application/json', Authorization: `Bearer ${firebaseToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${suffix || 'profile'} failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
}

/** Settings → Sign out: end this device's backend session (then sign out locally). */
export const signOutSession = () => sessionCall('/sessions/signout', 'POST');
/** Settings → Sign out of All Sessions. */
export const signOutAllSessions = () => sessionCall('/sessions/signout-all', 'POST');
/** Settings → Delete Account (irreversible). */
export const deleteAccount = () => sessionCall('', 'DELETE');

// ─── User settings (language) — own collection, self-only ────────────────────

export interface UserSettings {
  language: string;
}

/** GET /profile/{uid}/settings — null when the user never set a language (404). */
export async function getSettings(): Promise<UserSettings | null> {
  const { uid, firebaseToken, deviceId } = await profileAuthContext();
  const url = profileUrl(uid, deviceId, '/settings');
  const res = await fetch(url, {
    headers: { accept: 'application/json', Authorization: `Bearer ${firebaseToken}` },
  });
  if (res.status === 404) return null; // "not set yet", per contract
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GET /settings failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const body = await res.json();
  return { language: body.language };
}

/** PATCH /profile/{uid}/settings — upserts the language preference. */
export async function updateSettings(language: string): Promise<void> {
  const { uid, firebaseToken, deviceId } = await profileAuthContext();
  const url = profileUrl(uid, deviceId, '/settings');
  console.log('[api] settings → PATCH', url, language);
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${firebaseToken}`,
    },
    body: JSON.stringify({ language }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PATCH /settings failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
}
