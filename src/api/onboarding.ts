/**
 * onboarding.ts � personalization onboarding flow.
 *
 * Three branching flows based on the user's purpose answer:
 *   Flow A (already_here)      -> purpose -> occupation -> interests
 *   Flow B (planning_trip)     -> purpose -> occupation -> stay_length -> interests
 *   Flow C (just_exploring)    -> purpose -> interests
 */

import auth from '@react-native-firebase/auth';
import DeviceInfo from 'react-native-device-info';
import { AUTH_API_URL } from '../config';

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
//   POST {AUTH_API_URL}/api/v1/onboarding/?device_id=<device_id>
//   headers: accept, Content-Type, Authorization: Bearer <firebase id token>
//   body: { username, preferred_language, purpose,
//           context: { travel_companion, duration, reason, ... },
//           destinations, interests }
//
// Called after EVERY Confirm press in the flow with the answers so far, so
// the backend always has the freshest partial profile.

export interface SubmitOnboardingArgs {
  /** Accumulated question answers, keyed by question key. */
  answers: Record<string, string[]>;
  /** App language code (e.g. 'en'). */
  preferredLanguage: string;
}

// App option id → backend enum, where they differ.
const PURPOSE_MAP: Record<string, string> = {
  planning_trip: 'trip',
  already_here: 'already_here',
  just_exploring: 'exploring',
};

export async function submitOnboarding(args: SubmitOnboardingArgs): Promise<void> {
  const fbUser = auth().currentUser;
  if (!fbUser) throw new Error('submitOnboarding: no signed-in user');

  const [firebaseToken, deviceId] = await Promise.all([
    fbUser.getIdToken(),
    DeviceInfo.getUniqueId(),
  ]);

  const a = args.answers;
  const context: Record<string, unknown> = {};
  const companion = a['traveling_with']?.[0];
  if (companion) context.travel_companion = companion;
  const duration = a['stay_length']?.[0] ?? a['stay_length_de']?.[0];
  if (duration) context.duration = duration;
  const reason = a['occupation']?.[0];
  if (reason) context.reason = reason;
  const people = a['number_of_people']?.[0];
  if (people) context.number_of_people = Number(people);

  const purposeId = a['purpose']?.[0] ?? '';
  const username = (fbUser.email?.split('@')[0] || fbUser.displayName || fbUser.uid)
    .replace(/\s+/g, '_')
    .toLowerCase();

  const body = {
    username,
    preferred_language: args.preferredLanguage,
    purpose: PURPOSE_MAP[purposeId] ?? purposeId,
    context,
    destinations: a['destinations'] ?? [],
    interests: a['interests'] ?? [],
  };

  console.log('[api] submitOnboarding → POST /api/v1/onboarding/', JSON.stringify(body));

  const res = await fetch(
    `${AUTH_API_URL}/api/v1/onboarding/?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${firebaseToken}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`submitOnboarding failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  console.log('[api] submitOnboarding ✓');
}
