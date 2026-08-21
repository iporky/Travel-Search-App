import AsyncStorage from '@react-native-async-storage/async-storage';

// Client-generated visitor UUID (Tracking contract: the web keeps it in
// localStorage; here AsyncStorage). Stable across launches and through
// login, so pre- and post-login activity for this install join up under one
// visitor node on GET /tracking/flow. Independent of provider_id/device_id.
const KEY = 'konnect.visitorId';

let cached: string | null = null;

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getVisitorId(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
  } catch {
    // fall through to a fresh id
  }
  const id = uuid();
  cached = id;
  AsyncStorage.setItem(KEY, id).catch(() => {});
  return id;
}
