import { AskComment } from './ask';

// Vibes (Ping ▸ Vibes) — local events you can join.
// Backend integration pending; fed from src/mocks/vibes.ts for now.

export interface VibeEvent {
  id: string;
  title: string;
  /** e.g. "11:00 AM". */
  time: string;
  /** Short place label shown next to the time, e.g. "Seongsu". */
  place: string;
  /** Human date label, e.g. "July 4th". */
  dateLabel: string;
  photos: string[];
  host: string;
  caption: string;
  /** Usernames whose avatars stack on the card. */
  participants: string[];
  /** Total participants (avatars show a subset, then "+N"). */
  participantCount: number;
  /** Cap on attendees; null = unlimited. */
  limit: number | null;
  likes: number;
  comments: AskComment[];
  joined?: boolean;
  saved?: boolean;
  /** Owner → "..." offers Edit/Delete; otherwise Report. */
  isMine?: boolean;
}

/** Filter-sheet selections. */
export interface VibeFilters {
  date: string | null;
  popularity: string | null;
  price: string | null;
  distance: string | null;
  categories: string[];
  language: string | null;
}

export const EMPTY_FILTERS: VibeFilters = {
  date: null,
  popularity: null,
  price: null,
  distance: null,
  categories: [],
  language: null,
};
