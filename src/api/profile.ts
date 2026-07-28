/**
 * profile.ts — User profile API (Confluence: "User Update API").
 *
 *   • GET   {AUTH_API_URL}/api/v1/profile/{userId}?device_id=<id>
 *           Returns the user's profile, or null when none exists (404).
 *   • PATCH {AUTH_API_URL}/api/v1/profile/{userId}?device_id=<id>
 *           multipart/form-data: username? / name? / email? / profile_picture?
 *           Returns the updated profile (profile_picture = public S3 HTTPS URL).
 *
 * userId is the Firebase uid (stable across Google/Facebook/Apple — Facebook may
 * return a null email, so uid is the only reliable identifier).
 * headers: accept, Authorization: Bearer <firebase id token>.
 */
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { AUTH_API_URL } from '../config';

/** Raw shape from the API (the photo field is `profile_picture`). */
interface RawUserProfile {
  user_id: string;
  email: string | null;
  username: string;
  name: string;
  profile_picture?: string | null;
  /** Legacy name, kept for tolerance if an older server responds. */
  profile_pic?: string | null;
  is_admin: boolean;
  is_active: boolean;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  email: string | null;
  username: string;
  name: string;
  /** Normalized public S3 photo URL (from the API's `profile_picture`). */
  profile_pic: string | null;
  is_admin: boolean;
  is_active: boolean;
  updated_at: string;
}

/** Map the raw API payload to our internal shape (photo field → profile_pic). */
function normalizeProfile(raw: RawUserProfile): UserProfile {
  return {
    user_id: raw.user_id,
    email: raw.email,
    username: raw.username,
    name: raw.name,
    profile_pic: raw.profile_picture ?? raw.profile_pic ?? null,
    is_admin: raw.is_admin,
    is_active: raw.is_active,
    updated_at: raw.updated_at,
  };
}

export interface UpdateProfileArgs {
  username?: string;
  name?: string;
  email?: string;
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

/** GET the profile for the signed-in user. Returns null on 404 (no record). */
export async function getProfile(): Promise<UserProfile | null> {
  const { uid, firebaseToken, deviceId } = await profileAuthContext();
  const url = `${AUTH_API_URL}/api/v1/profile/${encodeURIComponent(uid)}?device_id=${encodeURIComponent(deviceId)}`;
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

/** PATCH the profile (name / username / email / photo). Returns the new profile. */
export async function updateProfile(args: UpdateProfileArgs): Promise<UserProfile> {
  const { uid, firebaseToken, deviceId } = await profileAuthContext();
  const url = `${AUTH_API_URL}/api/v1/profile/${encodeURIComponent(uid)}?device_id=${encodeURIComponent(deviceId)}`;

  const form = new FormData();
  if (args.username != null) form.append('username', args.username);
  if (args.name != null) form.append('name', args.name);
  if (args.email != null) form.append('email', args.email);
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
