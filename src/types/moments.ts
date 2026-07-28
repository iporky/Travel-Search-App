// Moments (community feed) — shared shapes for the Buzz tab feature.
// Backend integration pending; fed from src/mocks/moments.ts for now.

export interface MomentComment {
  id: string;
  author: string;
  time: string;
  text: string;
  likes: number;
  commentCount: number;
  /** Nested replies rendered indented with a connector line. */
  replies?: MomentComment[];
}

export interface Moment {
  id: string;
  /** Category tag shown above the post text (e.g. Living, Travel). */
  category: string;
  text: string;
  /** Photo URLs shown as a 60px thumbnail strip; tap opens the photo viewer. */
  photos: string[];
  author: string;
  time: string;
  location: string;
  likes: number;
  comments: MomentComment[];
  /** Owner → "..." offers Edit/Delete; otherwise Report. */
  isMine?: boolean;
}
