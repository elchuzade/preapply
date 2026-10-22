// Shared data shapes. Mirrors data/schema.json; used by the extension and by /scripts.

export const QUESTION_TYPES = [
  'short_text',
  'long_text',
  'url',
  'video',
  'file',
  'choice',
  'references',
  'other',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type LimitUnit = 'words' | 'characters';

export interface Question {
  text: string;
  type: QuestionType;
  hint?: string;
  required?: boolean;
  limit?: number;
  limit_unit?: LimitUnit;
}

export interface Step {
  title: string;
  intro?: string;
  questions: Question[];
}

export interface Accelerator {
  id: string;
  name: string;
  country: string;
  website: string;
  match: { domains: string[]; apply_urls?: string[] };
  cohort?: string;
  deadline?: string;
  last_verified: string;
  verified_by?: string;
  notes?: string;
  steps: Step[];
}

export interface IndexEntry {
  id: string;
  name: string;
  country: string;
  path: string;
  domains: string[];
  apply_urls: string[];
  last_verified: string;
  question_count: number;
  required_count: number;
}

export interface AcceleratorIndex {
  generated_at: string;
  accelerators: IndexEntry[];
}

/** Data shipped inside the extension so it works before the first fetch. */
export interface BundledData {
  index: AcceleratorIndex;
  accelerators: Record<string, Accelerator>;
}
