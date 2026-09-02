/**
 * All backend traffic goes to the single dev environment.
 * (Consolidated behind one host so nothing leaks to another environment —
 * search streaming, auth/profile/onboarding/events, tracking and the
 * About/Privacy WebView pages all derive from API_HOST.)
 */
export const API_HOST = 'https://dev.konnect.kr';

export const API_BASE_URL = API_HOST;
/** Live streaming search backend (POST /query/stream). */
export const SEARCH_API_URL = API_HOST;
/** Auth / profile / onboarding / events (/api/v1/...). */
export const AUTH_API_URL = API_HOST;
/** Non-search APIs (users, community, content) are still mocked. */
export const USE_MOCKS = true;

/**
 * TESTING ONLY — forces the full onboarding flow (intro → username/photo →
 * questions) on every launch and sign-in, even for users who already have a
 * backend profile. Flip to false to restore the normal once-per-user behavior.
 */
export const FORCE_ONBOARDING = false;

export const STORAGE_KEYS = {
  PERSONALIZATION_PREFIX: 'konnect_personalized_',
  PROFILE_NAME_PREFIX: 'konnect_profile_name_',
  /** History tab — local "recently viewed" ledger (row id → epoch ms). */
  HISTORY_VIEWED: 'konnect_history_viewed',
};
