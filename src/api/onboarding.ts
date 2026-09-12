/**
 * onboarding.ts � personalization onboarding flow.
 *
 * Three branching flows based on the user's purpose answer:
 *   Flow A (already_here)      -> purpose -> occupation -> interests
 *   Flow B (planning_trip)     -> purpose -> occupation -> stay_length -> interests
 *   Flow C (just_exploring)    -> purpose -> interests
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';
import { AUTH_API_URL } from '../config';
import { track } from './tracking';
import { UsernameTakenError, parseUsernameSuggestions } from './errors';
import {
  DESTINATION_FROM_BACKEND,
  DESTINATION_TO_BACKEND,
  DURATION_FROM_BACKEND,
  DURATION_TO_BACKEND,
  INTEREST_FROM_BACKEND,
  INTEREST_TO_BACKEND,
  PURPOSE_FROM_BACKEND,
  PURPOSE_TO_BACKEND,
  REASON_FROM_BACKEND,
  REASON_TO_BACKEND,
  TRAVEL_COMPANION_FROM_BACKEND,
  TRAVEL_COMPANION_TO_BACKEND,
  fromBackend,
  listFromBackend,
  listToBackend,
  toBackend,
} from './onboardingEnums';

export type QuestionType = 'single' | 'multi';
export type QuestionLayout = 'list' | 'grid' | 'pill' | 'counter';

export interface OnboardingOption {
  id: string;
  label: string;
  iconAsset?: string;
  /** Optional subtitle shown below the label in list layout (e.g. city taglines). */
  subtitle?: string;
}

export interface OnboardingQuestion {
  key: string;
  prompt: string;
  helperText?: string;
  type: QuestionType;
  layout: QuestionLayout;
  options: OnboardingOption[];
}

// --- Individual question definitions ---

export const PURPOSE_QUESTION: OnboardingQuestion = {
  key: 'purpose',
  prompt: 'What brings you to Korea?',
  helperText: 'This helps us customize your experience',
  type: 'single',
  layout: 'list',
  options: [
    { id: 'planning_trip',  label: "I'm planning an upcoming trip", iconAsset: 'name_passport_4x' },
    { id: 'already_here',   label: "I'm already in Korea",          iconAsset: 'name_korea_4x'   },
    { id: 'just_exploring', label: "I'm just exploring Konnect",    iconAsset: 'name_konnect_4x' },
  ],
};

export const OCCUPATION_QUESTION: OnboardingQuestion = {
  key: 'occupation',
  prompt: 'What best describes you?',
  helperText: 'This helps us customize your experience',
  type: 'single',
  layout: 'grid',
  options: [
    { id: 'student',      label: 'Student',      iconAsset: 'name_student_4x'      },
    { id: 'employee',     label: 'Employee',     iconAsset: 'name_employee_4x'     },
    { id: 'vacation',     label: 'Vacation',     iconAsset: 'name_vacation_4x'     },
    { id: 'entrepreneur', label: 'Entrepreneur', iconAsset: 'name_entrepreneur_4x' },
    { id: 'freelancer',   label: 'Freelancer',   iconAsset: 'name_freelancer_4x'   },
    { id: 'other',        label: 'Other',        iconAsset: 'name_teacher_4x'      },
  ],
};

export const STAY_LENGTH_QUESTION: OnboardingQuestion = {
  key: 'stay_length',
  prompt: 'How long is your stay in Korea?',
  helperText: 'Tell us about your visit',
  type: 'single',
  layout: 'pill',
  options: [
    { id: 'few_days',     label: 'A few days'   },
    { id: 'about_a_week', label: 'About a week' },
    { id: 'few_months',   label: 'A few months' },
    { id: 'long_term',    label: 'Long term'    },
  ],
};

export const INTERESTS_QUESTION: OnboardingQuestion = {
  key: 'interests',
  prompt: 'What would you like to explore?',
  helperText: 'Multiple options allowed',
  type: 'multi',
  layout: 'list',
  options: [
    { id: 'food_cafes',        label: 'Food & Cafes',      iconAsset: 'name_food_4x'             },
    { id: 'shopping',          label: 'Shopping',           iconAsset: 'name_shopping_4x'         },
    { id: 'culture_history',   label: 'Culture & history',  iconAsset: 'name_culture_4x'          },
    { id: 'nightlife',         label: 'Nightlife',           iconAsset: 'name_nightlife_4x'        },
    { id: 'nature',            label: 'Nature',              iconAsset: 'name_nature_4x'           },
    { id: 'social_networking', label: 'Social Networking',  iconAsset: 'name_socialnetworking_4x' },
  ],
};

// Flow A: User resides in Korea - no stay-duration question
export const FLOW_A_QUESTIONS: OnboardingQuestion[] = [
  PURPOSE_QUESTION,
  OCCUPATION_QUESTION,
  INTERESTS_QUESTION,
];

// Flow B: User is visiting/planning - includes stay-duration question
export const FLOW_B_QUESTIONS: OnboardingQuestion[] = [
  PURPOSE_QUESTION,
  OCCUPATION_QUESTION,
  STAY_LENGTH_QUESTION,
  INTERESTS_QUESTION,
];

// Flow C: User is just exploring Konnect - no profession/stay-duration question
export const FLOW_C_QUESTIONS: OnboardingQuestion[] = [
  PURPOSE_QUESTION,
  INTERESTS_QUESTION,
];

// ─── Flow D & E questions ─────────────────────────────────────────────────────

export const TRAVELING_WITH_QUESTION: OnboardingQuestion = {
  key: 'traveling_with',
  prompt: 'Who are you traveling with?',
  helperText: 'This helps us customize your experience',
  type: 'single',
  layout: 'list',
  options: [
    { id: 'solo',    label: 'Solo',    iconAsset: 'name_solo_4x'    },
    { id: 'partner', label: 'Partner', iconAsset: 'name_partner_4x' },
    { id: 'family',  label: 'Family',  iconAsset: 'name_home_4x'    },
    { id: 'friends', label: 'Friends', iconAsset: 'name_friend_4x'  },
    { id: 'group',   label: 'Group',   iconAsset: 'name_group_4x'   },
  ],
};

/** Renders as a numeric stepper widget — not a standard option list. */
export const NUMBER_OF_PEOPLE_QUESTION: OnboardingQuestion = {
  key: 'number_of_people',
  prompt: 'How many people are you traveling with?',
  type: 'single',
  layout: 'counter',
  options: [],
};

/** Stay-length variant used in Flows D & E (different labels from Flow A/B). */
export const STAY_LENGTH_DE_QUESTION: OnboardingQuestion = {
  key: 'stay_length_de',
  prompt: 'How long is your stay in Korea?',
  helperText: 'Tell us about your visit',
  type: 'single',
  layout: 'pill',
  options: [
    { id: 'few_days',     label: 'Just a few days' },
    { id: 'about_a_week', label: 'About a week'    },
    { id: 'few_weeks',    label: 'A few weeks'     },
    { id: 'long_term',    label: 'Long term'       },
  ],
};

export const DESTINATIONS_QUESTION: OnboardingQuestion = {
  key: 'destinations',
  prompt: 'Where do you plan to go?',
  helperText: 'Multiple options allowed',
  type: 'multi',
  layout: 'list',
  options: [
    { id: 'seoul',     label: 'Seoul',     subtitle: 'Never-ending Nightlife',   iconAsset: 'name_seoul_4x'     },
    { id: 'busan',     label: 'Busan',     subtitle: 'Beaches & Fresh Seafood',  iconAsset: 'name_busan_4x'     },
    { id: 'jeju',      label: 'Jeju',      subtitle: 'Black Pork & Tangerines',  iconAsset: 'name_jeju_4x'      },
    { id: 'gyeongju',  label: 'Gyeongju',  subtitle: 'Ancient Capital of Korea', iconAsset: 'name_gyeongju_4x'  },
    { id: 'incheon',   label: 'Incheon',   subtitle: 'Gateway to Korea',         iconAsset: 'name_incheon_4x'   },
    { id: 'suwon',     label: 'Suwon',     subtitle: 'Historic Fortress City',   iconAsset: 'name_suwon_4x'     },
    { id: 'gangneung', label: 'Gangneung', subtitle: 'Coffee & Surfing',         iconAsset: 'name_gangneung_4x' },
    { id: 'yeosu',     label: 'Yeosu',     subtitle: 'Romantic Ocean Views',     iconAsset: 'name_yeosu_4x'     },
    { id: 'jeonju',    label: 'Jeonju',    subtitle: 'Bibimbap & Hanok',         iconAsset: 'name_jeonju_4x'    },
    { id: 'daegu',     label: 'Daegu',     subtitle: 'Hot Summers',              iconAsset: 'name_daegu_4x'     },
  ],
};

// Flow D: Planning trip — solo or with partner
// purpose → traveling_with → stay_length_de → destinations → interests
export const FLOW_D_QUESTIONS: OnboardingQuestion[] = [
  PURPOSE_QUESTION,
  TRAVELING_WITH_QUESTION,
  STAY_LENGTH_DE_QUESTION,
  DESTINATIONS_QUESTION,
  INTERESTS_QUESTION,
];

// Flow E: Planning trip — group (family / friends / group tour)
// purpose → traveling_with → number_of_people → stay_length_de → interests
export const FLOW_E_QUESTIONS: OnboardingQuestion[] = [
  PURPOSE_QUESTION,
  TRAVELING_WITH_QUESTION,
  NUMBER_OF_PEOPLE_QUESTION,
  STAY_LENGTH_DE_QUESTION,
  INTERESTS_QUESTION,
];

/**
 * Returns the initial question list for a given purpose answer.
 *   'already_here'   → Flow A  (purpose → occupation → [stay_length?] → interests)
 *   'just_exploring' → Flow C  (purpose → interests)
 *   'planning_trip'  → Flow D  initial (purpose → traveling_with → …)
 *                      OnboardingFlow switches to FLOW_E after traveling_with is answered
 *                      if the user picks family / friends / group.
 */
export function getQuestionsForPurpose(purposeId: string): OnboardingQuestion[] {
  if (purposeId === 'already_here') return FLOW_A_QUESTIONS;
  if (purposeId === 'just_exploring') return FLOW_C_QUESTIONS;
  // planning_trip starts with D; branches to E after traveling_with answer
  return FLOW_D_QUESTIONS;
}

// --- API: live onboarding sync ---
//
// Lifecycle across the flow:
//   • GET   {AUTH_API_URL}/api/v1/onboarding/{email}?device_id=<id>
//           On flow start, check whether a record already exists for this
//           email + device. If so, its selections are preloaded and every
//           following write is a PATCH (no create).
//   • POST  {AUTH_API_URL}/api/v1/onboarding/?device_id=<id>
//           Fired ONCE, on the first screen's Confirm, to CREATE the record —
//           only when no record existed for this email + device.
//   • PATCH {AUTH_API_URL}/api/v1/onboarding/{email}?device_id=<id>
//           Fired on every subsequent Confirm (and on the first screen too,
//           when a record already existed) to update the partial profile.
//
// headers: accept, Authorization: Bearer <firebase id token>
//          (+ Content-Type for POST/PATCH).

export interface SubmitOnboardingArgs {
  /** Accumulated question answers, keyed by question key. */
  answers: Record<string, string[]>;
  /** App language code (e.g. 'en'). */
  preferredLanguage: string;
}

/** Shape of the backend onboarding record (GET response / POST+PATCH body). */
export interface OnboardingRecord {
  purpose?: string;
  context?: {
    reason?: string;
    travel_companion?: string;
    group_size?: number;
    duration?: string;
  };
  destinations?: string[];
  interests?: string[];
  preferred_language?: string;
  username?: string;
  platform?: string;
}

// App option id ↔ backend enum translation lives in ./onboardingEnums.

/** Resolve the signed-in user, a fresh Firebase ID token, and the device id. */
async function onboardingAuthContext() {
  const fbUser = auth().currentUser;
  if (!fbUser) throw new Error('onboarding: no signed-in user');
  const [firebaseToken, deviceId] = await Promise.all([
    fbUser.getIdToken(),
    DeviceInfo.getUniqueId(),
  ]);
  // Identify the record by the Firebase uid (stable; Facebook may return no
  // email). email is kept only for optional payload use.
  return { fbUser, firebaseToken, deviceId, uid: fbUser.uid, email: fbUser.email ?? '' };
}

/**
 * The username the user picked on the username screen. The backend enforces a
 * globally unique username, so the name has to be one the user actually chose
 * and saw confirmed as free — deriving it from the account silently collides
 * with other people and every save then fails.
 */
let chosenUsername: string | null = null;

/** Record the name the user settled on, so onboarding writes carry it. */
export function setChosenUsername(name: string): void {
  chosenUsername = name.trim() || null;
}

/** Account-derived fallback, used only until the user picks a name. */
function baseUsername(fbUser: FirebaseAuthTypes.User): string {
  return (fbUser.email?.split('@')[0] || fbUser.displayName || fbUser.uid)
    .replace(/\s+/g, '_')
    .toLowerCase();
}

/** Build the request body (shared by POST create and PATCH update). */
function buildOnboardingBody(
  answers: Record<string, string[]>,
  preferredLanguage: string,
  fbUser: FirebaseAuthTypes.User,
) {
  const a = answers;
  const context: Record<string, unknown> = {};

  const companion = toBackend(TRAVEL_COMPANION_TO_BACKEND, a['traveling_with']?.[0]);
  if (companion) context.travel_companion = companion;

  // stay_length (Flow A/B) and stay_length_de (Flow D/E) both map to `duration`.
  // Unmappable options (few_months, long_term) resolve to undefined → omitted.
  const duration = toBackend(
    DURATION_TO_BACKEND,
    a['stay_length']?.[0] ?? a['stay_length_de']?.[0],
  );
  if (duration) context.duration = duration;

  const reason = toBackend(REASON_TO_BACKEND, a['occupation']?.[0]);
  if (reason) context.reason = reason;

  const people = a['number_of_people']?.[0];
  if (people) context.group_size = Number(people);

  const purposeId = a['purpose']?.[0];
  // Prefer a username already settled on: the one the stored record carries,
  // or the one a 409 retry minted. Only fall back to deriving it fresh.
  const username = chosenUsername ?? lastKnownRecord?.username ?? baseUsername(fbUser);

  return {
    username,
    preferred_language: preferredLanguage,
    purpose: toBackend(PURPOSE_TO_BACKEND, purposeId) ?? purposeId ?? '',
    context,
    destinations: listToBackend(DESTINATION_TO_BACKEND, a['destinations']),
    interests: listToBackend(INTEREST_TO_BACKEND, a['interests']),
    platform: Platform.OS,
  };
}

/**
 * Fetch any existing onboarding record for the signed-in user's Firebase uid +
 * device. Returns null when none exists (HTTP 404) so the caller knows to
 * CREATE via POST on the first Confirm rather than PATCH.
 */
export async function getOnboarding(): Promise<OnboardingRecord | null> {
  const { firebaseToken, deviceId, uid } = await onboardingAuthContext();

  const url = `${AUTH_API_URL}/api/v1/onboarding/${encodeURIComponent(uid)}?device_id=${encodeURIComponent(deviceId)}`;
  console.log('[api] getOnboarding → GET', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${firebaseToken}`,
    },
  });

  if (res.status === 404) {
    console.log('[api] getOnboarding — no existing record');
    lastKnownRecord = null;
    return null;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`getOnboarding failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json().catch(() => null)) as OnboardingRecord | null;
  console.log('[api] getOnboarding ✓', JSON.stringify(data));
  lastKnownRecord = data;
  return data;
}

// ── Onboarding edit tracking (contract rows 9a–9h) ───────────────────────────
// One edit_profile_onboarding event per field that actually CHANGED versus the
// last-known server record, fired after a successful PATCH (never on the
// first-time POST create — these are edit events). The baseline advances with
// every save so a multi-Confirm session doesn't re-report earlier changes.
let lastKnownRecord: OnboardingRecord | null = null;

const sameSet = (a?: string[], b?: string[]) => {
  const A = new Set(a ?? []);
  const B = new Set(b ?? []);
  return A.size === B.size && [...A].every((x) => B.has(x));
};

function fireOnboardingEditEvents(
  prev: OnboardingRecord,
  body: ReturnType<typeof buildOnboardingBody>,
) {
  const changed = (v: string | undefined, old: string | undefined) =>
    v !== undefined && v !== '' && v !== (old ?? undefined) && !(old == null && v === '');
  if (changed(body.username, prev.username)) {
    track.profileEdit('edit_profile_onboarding', 'onboarding_username');
  }
  if (changed(body.preferred_language, prev.preferred_language)) {
    track.profileEdit('edit_profile_onboarding', 'onboarding_preferred_language');
  }
  if (changed(body.purpose, prev.purpose)) {
    track.profileEdit('edit_profile_onboarding', 'onboarding_purpose');
  }
  const prevCtx = prev.context ?? {};
  const bodyCtx = body.context as { reason?: string; duration?: string };
  if (changed(bodyCtx.reason, prevCtx.reason)) {
    track.profileEdit('edit_profile_onboarding', 'onboarding_context_reason');
  }
  if (changed(bodyCtx.duration, prevCtx.duration)) {
    track.profileEdit('edit_profile_onboarding', 'onboarding_context_duration');
  }
  if (!sameSet(body.destinations, prev.destinations)) {
    track.profileEdit('edit_profile_onboarding', 'onboarding_destinations');
  }
  if (!sameSet(body.interests, prev.interests)) {
    track.profileEdit('edit_profile_onboarding', 'onboarding_interests');
  }
  if (changed(body.platform, prev.platform)) {
    track.profileEdit('edit_profile_onboarding', 'onboarding_platform');
  }
}

/**
 * Map a backend record into the flow's `answers` shape so previous selections
 * can be preloaded when the user re-enters onboarding.
 */
export function recordToAnswers(rec: OnboardingRecord): Record<string, string[]> {
  const answers: Record<string, string[]> = {};

  const purposeId = fromBackend(PURPOSE_FROM_BACKEND, rec.purpose);
  if (purposeId) answers.purpose = [purposeId];

  const ctx = rec.context ?? {};
  const reason = fromBackend(REASON_FROM_BACKEND, ctx.reason);
  if (reason) answers.occupation = [reason];
  const companion = fromBackend(TRAVEL_COMPANION_FROM_BACKEND, ctx.travel_companion);
  if (companion) answers.traveling_with = [companion];
  if (ctx.group_size != null) answers.number_of_people = [String(ctx.group_size)];

  const duration = fromBackend(DURATION_FROM_BACKEND, ctx.duration);
  if (duration) {
    // Flow D (planning_trip) uses the stay_length_de variant; others stay_length.
    const key = purposeId === 'planning_trip' ? 'stay_length_de' : 'stay_length';
    answers[key] = [duration];
  }

  const destinations = listFromBackend(DESTINATION_FROM_BACKEND, rec.destinations);
  if (destinations.length) answers.destinations = destinations;
  const interests = listFromBackend(INTEREST_FROM_BACKEND, rec.interests);
  if (interests.length) answers.interests = interests;

  return answers;
}

/**
 * Create (POST) or update (PATCH) the onboarding record.
 *   • method 'POST'  → /api/v1/onboarding/?device_id=…         (create)
 *   • method 'PATCH' → /api/v1/onboarding/{email}?device_id=…  (update)
 */
export async function saveOnboarding(
  args: SubmitOnboardingArgs & { method: 'POST' | 'PATCH' },
): Promise<void> {
  const { fbUser, firebaseToken, deviceId, uid } = await onboardingAuthContext();
  const body = buildOnboardingBody(args.answers, args.preferredLanguage, fbUser);

  const url =
    args.method === 'POST'
      ? `${AUTH_API_URL}/api/v1/onboarding/?device_id=${encodeURIComponent(deviceId)}`
      : `${AUTH_API_URL}/api/v1/onboarding/${encodeURIComponent(uid)}?device_id=${encodeURIComponent(deviceId)}`;

  const send = (payload: object) =>
    fetch(url, {
      method: args.method,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify(payload),
    });

  console.log(`[api] saveOnboarding → ${args.method} ${url}`, JSON.stringify(body));
  const res = await send(body);

  // A create collides when the username is already someone else's. That is the
  // username screen's business, not something to paper over here: it throws
  // carrying the backend's suggestions so the caller can send the user back to
  // pick another name.
  if (res.status === 409) {
    const text = await res.text().catch(() => '');
    throw new UsernameTakenError(body.username, parseUsernameSuggestions(text));
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`saveOnboarding(${args.method}) failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  console.log(`[api] saveOnboarding(${args.method}) ✓ as "${body.username}"`);

  // Contract rows 9a–9h: report which onboarding fields this save changed.
  if (args.method === 'PATCH' && lastKnownRecord) {
    try {
      fireOnboardingEditEvents(lastKnownRecord, body);
    } catch (e) {
      console.warn('[api] onboarding edit tracking failed', (e as Error)?.message ?? e);
    }
  }
  // Advance the baseline so the next Confirm diffs against what's now stored.
  lastKnownRecord = {
    ...(lastKnownRecord ?? {}),
    username: body.username,
    preferred_language: body.preferred_language,
    purpose: body.purpose,
    context: { ...(lastKnownRecord?.context ?? {}), ...(body.context as object) },
    destinations: body.destinations,
    interests: body.interests,
    platform: body.platform,
  };
}
