import AsyncStorage from '@react-native-async-storage/async-storage';

// Profile fields the redesigned Profile screen shows but the backend profile
// API doesn't carry yet (bio, birthday, preferences, toggles…). Persisted
// per-uid in AsyncStorage; swap for API calls when the backend adds them.

export interface ProfilePreferences {
  food?: string;
  budget?: string;
  stay?: string;
}

export interface NotificationPrefs {
  push: boolean;
  email: boolean;
  sms: boolean;
  likes: boolean;
  comments: boolean;
  followers: boolean;
  messages: boolean;
  appUpdates: boolean;
  promotions: boolean;
}

export interface ProfileExtras {
  bio?: string;
  birthday?: string;
  nationality?: string;
  currentStatus?: string;
  occupation?: string;
  backupEmail?: string;
  phone?: string;
  phoneVerified?: boolean;
  preferences?: ProfilePreferences;
  lookingFor?: string[];
  privateAccount?: boolean;
  allowLocation?: boolean;
  notifications?: Partial<NotificationPrefs>;
}

export const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  push: true,
  email: false,
  sms: false,
  likes: true,
  comments: true,
  followers: false,
  messages: true,
  appUpdates: true,
  promotions: false,
};

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
