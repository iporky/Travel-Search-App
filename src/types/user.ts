/** Authenticated user returned by AuthContext. */
export interface User {
  id: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  provider: string;
}

/** Payload sent to the backend when a new user signs up. */
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
