/**
 * users.ts — backend user sync.
 *
 * MOCK implementation: logs the payload and simulates a successful round-trip.
 * To go live, replace the body of `addUser` with a real `fetch(BASE_URL + '/users', …)`.
 */

export interface AddUserPayload {
  uid: string;
  name: string | null;
  profileName?: string | null;
  email: string | null;
  photoUrl: string | null;
  provider: string;
  createdAt: string;
}

export interface AddUserResult {
  ok: boolean;
  id: string;
}

// Swap this for your real backend base URL when ready.
// const BASE_URL = 'https://api.konnect.app';

/**
 * Pushes the authenticated user's details to our backend so they exist in our DBs.
 * Currently mocked — no real network call is made.
 */
export async function addUser(payload: AddUserPayload): Promise<AddUserResult> {
  console.log('[api] addUser → POST /users', JSON.stringify(payload, null, 2));

  // Simulate network latency so the flow behaves like a real request.
  await new Promise((resolve) => setTimeout(resolve, 350));

  // ─── Real implementation (uncomment + set BASE_URL when backend is ready) ───
  // const res = await fetch(`${BASE_URL}/users`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload),
  // });
  // if (!res.ok) throw new Error(`addUser failed: ${res.status}`);
  // return (await res.json()) as AddUserResult;

  console.log('[api] addUser ✓ stored user', payload.uid);
  return { ok: true, id: payload.uid };
}
