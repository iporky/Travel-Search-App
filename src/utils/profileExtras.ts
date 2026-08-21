import AsyncStorage from '@react-native-async-storage/async-storage';

// Local mirror of profile fields the backend profile schema doesn't model
// explicitly. The birthday travels inside `personalization` on PATCH/GET; this
// copy (per uid) is the fallback if the server ever drops the extra key.

export interface ProfileExtras {
  /** ISO YYYY-MM-DD. */
  birthday?: string;
}

const key = (uid: string) => `konnect.profileExtras.${uid}`;

export async function loadProfileExtras(uid: string): Promise<ProfileExtras> {
  try {
    const raw = await AsyncStorage.getItem(key(uid));
    return raw ? (JSON.parse(raw) as ProfileExtras) : {};
  } catch {
    return {};
  }
}

export async function saveProfileExtras(
  uid: string,
  patch: Partial<ProfileExtras>,
): Promise<ProfileExtras> {
  const current = await loadProfileExtras(uid);
  const next = { ...current, ...patch };
  try {
    await AsyncStorage.setItem(key(uid), JSON.stringify(next));
  } catch {
    // Non-fatal: the screen still shows the in-memory value.
  }
  return next;
}
