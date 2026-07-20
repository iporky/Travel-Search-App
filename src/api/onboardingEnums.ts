/**
 * onboardingEnums.ts — the single source of truth for onboarding enum values.
 *
 * The backend accepts a fixed set of enum values (mirrored below from the
 * Python API). The app uses its own option ids for UI rendering + flow
 * branching, which don't always match the backend spelling. We translate at
 * the API boundary only — UI/branching keep using the app ids.
 *
 *   app option id  ──*_TO_BACKEND──▶  backend enum value   (outgoing: POST/PATCH)
 *   backend value  ──*_FROM_BACKEND─▶ app option id        (incoming: GET preload)
 */

// ─── Backend enums (mirrored from the Python API — do not edit casually) ──────
export const BACKEND_PURPOSE = ['trip', 'in_korea', 'exploring'] as const;
export const BACKEND_REASON = [
  'student', 'employee', 'vacation', 'entrepreneur', 'freelancer', 'other',
] as const;
export const BACKEND_TRAVEL_COMPANION = [
  'solo', 'partner', 'family', 'friends', 'group',
] as const;
// few_months + long_term are being added on the backend; the app passes them through.
export const BACKEND_DURATION = [
  'few_days', 'about_a_week', 'few_weeks', 'few_months', 'long_term',
] as const;
export const BACKEND_DESTINATION = [
  'seoul', 'busan', 'jeju_island', 'incheon', 'gyeongju',
  'suwon', 'gangneung', 'yeosu', 'jeonju', 'daegu',
] as const;
export const BACKEND_INTEREST = [
  'food_and_cafes', 'shopping', 'culture_and_history', 'nightlife', 'nature', 'social_networking',
] as const;

// ─── App option id → backend enum value ───────────────────────────────────────
export const PURPOSE_TO_BACKEND: Record<string, string> = {
  planning_trip: 'trip',
  already_here: 'in_korea',
  just_exploring: 'exploring',
};

export const REASON_TO_BACKEND: Record<string, string> = {
  student: 'student',
  employee: 'employee',
  vacation: 'vacation',
  entrepreneur: 'entrepreneur',
  freelancer: 'freelancer',
  other: 'other',
};

export const TRAVEL_COMPANION_TO_BACKEND: Record<string, string> = {
  solo: 'solo',
  partner: 'partner',
  family: 'family',
  friends: 'friends',
  group: 'group',
};

export const DURATION_TO_BACKEND: Record<string, string> = {
  few_days: 'few_days',
  about_a_week: 'about_a_week',
  few_weeks: 'few_weeks',
  // Backend is adding these; app passes them through so the UI selection is sent.
  few_months: 'few_months', // STAY_LENGTH (Flow A & B)
  long_term: 'long_term', //   STAY_LENGTH and STAY_LENGTH_DE
};

export const DESTINATION_TO_BACKEND: Record<string, string> = {
  seoul: 'seoul',
  busan: 'busan',
  jeju: 'jeju_island',
  incheon: 'incheon',
  gyeongju: 'gyeongju',
  suwon: 'suwon',
  gangneung: 'gangneung',
  yeosu: 'yeosu',
  jeonju: 'jeonju',
  daegu: 'daegu',
};

export const INTEREST_TO_BACKEND: Record<string, string> = {
  food_cafes: 'food_and_cafes',
  shopping: 'shopping',
  culture_history: 'culture_and_history',
  nightlife: 'nightlife',
  nature: 'nature',
  social_networking: 'social_networking',
};

// ─── Reverse maps (backend value → app option id), for GET preload ────────────
function invert(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(map)) out[map[key]] = key;
  return out;
}

export const PURPOSE_FROM_BACKEND = invert(PURPOSE_TO_BACKEND);
export const REASON_FROM_BACKEND = invert(REASON_TO_BACKEND);
export const TRAVEL_COMPANION_FROM_BACKEND = invert(TRAVEL_COMPANION_TO_BACKEND);
export const DURATION_FROM_BACKEND = invert(DURATION_TO_BACKEND);
export const DESTINATION_FROM_BACKEND = invert(DESTINATION_TO_BACKEND);
export const INTEREST_FROM_BACKEND = invert(INTEREST_TO_BACKEND);

// ─── Translation helpers ──────────────────────────────────────────────────────
/** Single value app id → backend value (undefined if not mappable). */
export function toBackend(
  map: Record<string, string>,
  id: string | undefined,
): string | undefined {
  return id == null ? undefined : map[id];
}

/** Array of app ids → backend values, dropping any that don't map. */
export function listToBackend(
  map: Record<string, string>,
  ids: string[] | undefined,
): string[] {
  return (ids ?? []).map((id) => map[id]).filter((v): v is string => v != null);
}

/** Single backend value → app id (falls back to the raw value if unknown). */
export function fromBackend(
  map: Record<string, string>,
  value: string | undefined,
): string | undefined {
  return value == null ? undefined : map[value] ?? value;
}

/** Array of backend values → app ids (falls back to raw values if unknown). */
export function listFromBackend(
  map: Record<string, string>,
  values: string[] | undefined,
): string[] {
  return (values ?? []).map((v) => map[v] ?? v);
}
