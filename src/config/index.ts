export const API_BASE_URL = 'https://api.konnect.app';
/** Live streaming search backend (POST /query/stream). */
export const SEARCH_API_URL = 'https://dev.konnect.kr';
/**
 * Auth backend (POST /api/v1/auth/sso/verify-firebase).
 * The sample curl targets localhost:8000 — point this at the deployed auth
 * service when it's up (assumed same host as search for now).
 */
export const AUTH_API_URL = 'https://dev.konnect.kr';
/** Non-search APIs (users, community, content) are still mocked. */
export const USE_MOCKS = true;

export const STORAGE_KEYS = {
  PERSONALIZATION_PREFIX: 'konnect_personalized_',
  PROFILE_NAME_PREFIX: 'konnect_profile_name_',
};
