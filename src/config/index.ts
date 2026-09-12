/**
 * All backend traffic goes to ONE environment host.
 *
 * Local builds point at STAGING (not dev) since 2026-09-12: search streaming
 * (v2) + conversations, auth/profile/onboarding/events, tracking, receipts
 * and the About/Privacy WebView pages all derive from API_HOST, so nothing
 * leaks to another environment.
 *
 * To target another environment for a build, set the Expo public env var
 * (inlined into the JS bundle at build time by babel-preset-expo):
 *   EXPO_PUBLIC_API_HOST=https://dev.konnect.kr
 * either exported in the shell before `expo start` / the Gradle build, or in
 * a local `.env` file (see .env.example). NOTE: the Gradle JS-bundle task
 * doesn't track `.env`, so after changing it run `cd android && ./gradlew
 * clean` (or touch any source file) before `assembleRelease`, otherwise the
 * previously bundled host stays baked in.
 */
const DEFAULT_API_HOST = 'https://staging.konnect.kr';
export const API_HOST = (process.env.EXPO_PUBLIC_API_HOST || DEFAULT_API_HOST).replace(/\/+$/, '');

export const API_BASE_URL = API_HOST;
/** Streaming search backend (POST /api/v2/search) + /api/v2/conversations. */
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
