/**
 * auth.ts — backend SSO verification.
 *
 * After a successful Firebase sign-in (Google / Facebook / Apple), the app
 * notifies our backend so it can verify the Firebase ID token and register
 * the device/session:
 *
 *   POST {AUTH_API_URL}/api/v1/auth/sso/verify-firebase
 *   body: { firebase_token, device_id, platform }
 *
 * device_id comes from react-native-device-info's getUniqueId() — a stable
 * per-install identifier. platform is 'android' | 'ios'.
 */

import { AUTH_API_URL } from '../config';

export interface VerifyFirebaseArgs {
  firebaseToken: string;
  deviceId: string;
  platform: string;
}

export async function verifyFirebaseSso(args: VerifyFirebaseArgs): Promise<unknown> {
  const url = `${AUTH_API_URL}/api/v1/auth/sso/verify-firebase`;
  console.log('[api] verifyFirebaseSso → POST /api/v1/auth/sso/verify-firebase', {
    device_id: args.deviceId,
    platform: args.platform,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firebase_token: args.firebaseToken,
      device_id: args.deviceId,
      platform: args.platform,
    }),
  });

  if (!res.ok) {
    throw new Error(`verify-firebase failed: HTTP ${res.status}`);
  }
  const data = await res.json().catch(() => null);
  console.log('[api] verifyFirebaseSso ✓');
  return data;
}
