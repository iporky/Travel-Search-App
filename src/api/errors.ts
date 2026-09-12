/**
 * Shared API error types.
 *
 * Lives apart from the endpoint modules so both the profile and onboarding
 * calls can raise the same error without importing each other.
 */

/** Thrown when a write is rejected because the username belongs to someone else. */
export class UsernameTakenError extends Error {
  readonly username: string;
  /** Alternatives the backend offered, if it named any. */
  readonly suggestions: string[];
  constructor(username: string, suggestions: string[]) {
    super(`Username "${username}" is taken`);
    this.name = 'UsernameTakenError';
    this.username = username;
    this.suggestions = suggestions;
  }
}

/**
 * Pull alternatives out of a 409 body. The onboarding create offers them
 * ({"error":"Username taken. Try: a, b"}); the profile PATCH just says the
 * name is taken, and the caller falls back to its own suggestions.
 */
export function parseUsernameSuggestions(body: string): string[] {
  const m = /Try:\s*([^"}]+)/i.exec(body);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((x) => x.trim().replace(/[.\s]+$/, ''))
    .filter(Boolean)
    .slice(0, 3);
}

/** Does this 409 body say the username is taken? */
export function isUsernameConflict(body: string): boolean {
  return /username\s+(is\s+)?(already\s+)?taken/i.test(body);
}
