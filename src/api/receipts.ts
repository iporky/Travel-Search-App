/**
 * receipts.ts — receipt uploads for the taxi-cashback flow (Confluence
 * "API Contract: Receipts", page 48627714; mirrors the web client
 * konnect_react src/services/receiptsAPI.js).
 *
 *   POST {AUTH_API_URL}/api/v1/receipts/?platform=<android|ios>&device_id=<id>
 *        multipart/form-data: provider_id (Firebase uid, must match the token
 *        owner), file, category?
 *   Authorization: Bearer <firebase id token> — required. device_id is
 *   REQUIRED on ios/android per the contract's common parameters.
 *
 * Allowed types and the size cap mirror the server env defaults so bad files
 * fail fast before any bytes leave the phone.
 */
import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { AUTH_API_URL } from '../config';

export const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export interface ReceiptFile {
  uri: string;
  name: string;
  /** MIME type reported by the document picker. */
  mimeType: string | null;
  /** Size in bytes when the picker reports it (used for the fast-fail check). */
  size: number | null;
}

/** Non-empty message when the candidate violates the documented limits. */
export function validateReceiptFile(file: ReceiptFile | null): string {
  if (!file) return 'Please choose a file.';
  if (!file.mimeType || !ALLOWED_RECEIPT_TYPES.includes(file.mimeType)) {
    return 'Unsupported file type. Please upload a JPG, PNG or PDF.';
  }
  if (file.size != null && file.size > MAX_RECEIPT_SIZE_BYTES) {
    return 'That file is larger than 10 MB.';
  }
  return '';
}

export async function uploadReceipt(
  file: ReceiptFile,
  opts: { category?: string } = {},
): Promise<{ receipt_id: string }> {
  const fbUser = auth().currentUser;
  if (!fbUser) throw new Error('Please log in to upload your receipt.');
  const [token, deviceId] = await Promise.all([
    fbUser.getIdToken(),
    DeviceInfo.getUniqueId().catch(() => ''),
  ]);

  const form = new FormData();
  form.append('provider_id', fbUser.uid);
  if (opts.category) form.append('category', opts.category);
  form.append('file', {
    uri: file.uri,
    name: file.name || 'receipt',
    type: file.mimeType || 'application/octet-stream',
  } as any);

  const url =
    `${AUTH_API_URL}/api/v1/receipts/?platform=${Platform.OS}` +
    (deviceId ? `&device_id=${encodeURIComponent(deviceId)}` : '');
  console.log('[api] receipts → POST', url, file.name, file.mimeType, file.size ?? '?');

  const res = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    // 413 comes from nginx, not the gateway — an HTML page with no JSON.
    const fallback =
      res.status === 413
        ? 'That file is too large to upload. Please choose one under 10 MB.'
        : `Receipt upload failed: HTTP ${res.status}`;
    throw new Error(data?.message || fallback);
  }
  const body = await res.json();
  console.log('[api] receipts ✓', body?.receipt_id);
  return body;
}
