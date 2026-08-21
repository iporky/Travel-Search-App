import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';

/**
 * Local "recently viewed" ledger for History rows. The backend search log
 * has no view tracking, so the History sort option "Recently Viewed" orders
 * by the last time the user re-opened a question from the History tab.
 * Map of row id → epoch ms, capped so it never grows unbounded.
 */
const MAX_ENTRIES = 300;

export type ViewedMap = Record<string, number>;

export async function loadViewed(): Promise<ViewedMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY_VIEWED);
    return raw ? (JSON.parse(raw) as ViewedMap) : {};
  } catch {
    return {};
  }
}

export async function markViewed(id: string, current: ViewedMap): Promise<ViewedMap> {
  const next: ViewedMap = { ...current, [id]: Date.now() };
  const keys = Object.keys(next);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => next[a] - next[b])
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete next[k]);
  }
  AsyncStorage.setItem(STORAGE_KEYS.HISTORY_VIEWED, JSON.stringify(next)).catch(() => {});
  return next;
}
