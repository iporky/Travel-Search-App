import { AskComment } from './ask';

// Drops (Ping ▸ Drops) — photo-first posts shown in a grid + story row.
// Backend integration pending; fed from src/mocks/drops.ts for now.

export interface StoryUser {
  id: string;
  username: string;
  avatar: string;
  /** Unseen ring vs seen (dimmed) — Figma story bubble states. */
  seen?: boolean;
}

export interface Drop {
  id: string;
  userId: string;
  author: string;
  /** One or more photos; the grid shows the first, the detail swipes all. */
  photos: string[];
  caption: string;
  time: string;
  location: string;
  views: number;
  likes: number;
  comments: AskComment[];
  /** Owner → "..." offers Edit/Delete; otherwise Report. */
  isMine?: boolean;
}
