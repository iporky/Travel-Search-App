/**
 * client.ts — shared API client config + mock helpers.
 *
 * Every API module in this folder is currently MOCKED: it returns local data
 * after a small simulated network delay. When the real backend is ready, set
 * `API_BASE_URL` in src/config/index.ts, flip `USE_MOCKS` to false, and fill
 * in the `request()` body — each module already documents the exact endpoint
 * it should call.
 */

import { API_BASE_URL, USE_MOCKS as _USE_MOCKS } from '../config';

// Re-export so existing callers of `BASE_URL` / `USE_MOCKS` from this module keep working.
export const BASE_URL = API_BASE_URL;
export const USE_MOCKS = _USE_MOCKS;

/** Simulates network latency so mocked flows behave like real requests. */
export function mockDelay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Thin fetch wrapper for when you go live. Not used while USE_MOCKS is true.
 * Centralises base URL, JSON handling and error throwing so individual API
 * modules stay tiny.
 */
export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
