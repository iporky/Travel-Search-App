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

export interface OnboardingAnswers {
  [key: string]: string | string[];
}

export interface SubmitOnboardingPayload {
  uid: string;
  answers: OnboardingAnswers;
  completedAt: string;
}

export interface SubmitOnboardingResult {
  ok: boolean;
}
