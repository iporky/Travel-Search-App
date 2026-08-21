/**
 * feedback.ts — Feedback / Contact Us submissions (same endpoint the web app
 * uses, konnect_react `src/services/feedbacksAPI.js`):
 *
 *   POST {AUTH_API_URL}/api/v1/feedbacks/?platform=&device_id=   multipart/form-data
 *   (device_id is required by the contract when a token is sent on ios/android)
 *     type (like | dislike | suggest), details, user_email?, feedback_reply?,
 *     source_type (events | home | search), source_id?, file?
 *
 * Auth is optional on the backend (anonymous is rate-limited to 1/day), so the
 * signed-in user's Firebase token is attached when there is one.
 */
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { AUTH_API_URL } from '../config';

export type FeedbackType = 'like' | 'dislike' | 'suggest';

export interface FeedbackArgs {
  type: FeedbackType;
  details: string;
  userEmail?: string | null;
  /** Whether the user wants a reply (Contact Us → true). */
  reply?: boolean;
  /** Local image uri to attach (expo-image-picker). */
  fileUri?: string | null;
}

function imageMime(uri: string): { mime: string; ext: string } {
  const ext = (uri.split('?')[0].split('.').pop() ?? 'jpg').toLowerCase();
  if (ext === 'png') return { mime: 'image/png', ext: 'png' };
  if (ext === 'webp') return { mime: 'image/webp', ext: 'webp' };
  return { mime: 'image/jpeg', ext: 'jpg' };
}

export async function submitFeedback(args: FeedbackArgs): Promise<void> {
  const fbUser = auth().currentUser;
  const [token, deviceId] = await Promise.all([
    fbUser ? fbUser.getIdToken().catch(() => null) : Promise.resolve(null),
    DeviceInfo.getUniqueId().catch(() => null),
  ]);

  const form = new FormData();
  form.append('type', args.type);
  form.append('details', args.details);
  if (args.userEmail) form.append('user_email', args.userEmail);
  form.append('feedback_reply', args.reply ? 'true' : 'false');
  // "home" is the one source that never needs a source_id.
  form.append('source_type', 'home');
  if (args.fileUri) {
    const { mime, ext } = imageMime(args.fileUri);
    form.append('file', { uri: args.fileUri, name: `feedback.${ext}`, type: mime } as any);
  }

  const url = `${AUTH_API_URL}/api/v1/feedbacks/?platform=${Platform.OS}${deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : ''}`;
  console.log('[api] feedback → POST', url, args.type, args.reply ? '(reply)' : '');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  if (!res.ok) {
    let message = `Feedback failed: HTTP ${res.status}`;
    try {
      const payload = await res.json();
      message = payload?.message || payload?.detail || message;
    } catch {
      // non-JSON body
    }
    throw new Error(message);
  }
}
