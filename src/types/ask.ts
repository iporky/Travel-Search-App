// Ask (Ping ▸ community Q&A) — shared shapes.
// Backend integration pending; fed from src/mocks/ask.ts for now.

export interface AskComment {
  id: string;
  author: string;
  time: string;
  text: string;
  likes: number;
  /** Owner of the comment → the '...' sheet offers Delete instead of Report only. */
  isMine?: boolean;
  replies?: AskComment[];
}

export interface AskPost {
  id: string;
  category: string;
  /** The question itself — the headline shown in the feed card. */
  title: string;
  /** Optional longer detail shown on the post detail screen. */
  body?: string;
  author: string;
  time: string;
  location: string;
  likes: number;
  /** Owner → '...' offers Edit/Delete; otherwise Delete(own comment)/Report. */
  isMine?: boolean;
  comments: AskComment[];
}

export type AskSort = 'New' | 'Popular';
