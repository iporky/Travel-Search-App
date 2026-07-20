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
  return { fbUser, firebaseToken, deviceId, email: fbUser.email ?? '' };
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
  const username = (fbUser.email?.split('@')[0] || fbUser.displayName || fbUser.uid)
    .replace(/\s+/g, '_')
    .toLowerCase();

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
 * Fetch any existing onboarding record for the signed-in user's email +
 * device. Returns null when none exists (HTTP 404) so the caller knows to
 * CREATE via POST on the first Confirm rather than PATCH.
 */
export async function getOnboarding(): Promise<OnboardingRecord | null> {
  const { firebaseToken, deviceId, email } = await onboardingAuthContext();
  if (!email) return null;

  const url = `${AUTH_API_URL}/api/v1/onboarding/${encodeURIComponent(email)}?device_id=${encodeURIComponent(deviceId)}`;
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
    return null;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`getOnboarding failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  const data = (await res.json().catch(() => null)) as OnboardingRecord | null;
  console.log('[api] getOnboarding ✓', JSON.stringify(data));
  return data;
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
  const { fbUser, firebaseToken, deviceId, email } = await onboardingAuthContext();
  const body = buildOnboardingBody(args.answers, args.preferredLanguage, fbUser);

  const url =
    args.method === 'POST'
      ? `${AUTH_API_URL}/api/v1/onboarding/?device_id=${encodeURIComponent(deviceId)}`
      : `${AUTH_API_URL}/api/v1/onboarding/${encodeURIComponent(email)}?device_id=${encodeURIComponent(deviceId)}`;

  console.log(`[api] saveOnboarding → ${args.method} ${url}`, JSON.stringify(body));

  const res = await fetch(url, {
    method: args.method,
    headers: {
      accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${firebaseToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`saveOnboarding(${args.method}) failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  console.log(`[api] saveOnboarding(${args.method}) ✓`);
}
