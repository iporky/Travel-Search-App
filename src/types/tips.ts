// Tips (Ping ▸ shared advice) — shared shapes.
// Backend integration pending; fed from src/mocks/tips.ts for now.

export interface Tip {
  id: string;
  /** Emoji-prefixed category, e.g. "💡 Daily Life". */
  category: string;
  text: string;
  author: string;
  time: string;
  location: string;
  likes: number;
  /** Owner → "..." offers Share/Edit/Delete; otherwise Share/Report. */
  isMine?: boolean;
}

export interface TipCategoryGroup {
  /** Group label shown above the chips: Popular / Essentials / Explore. */
  title: string;
  categories: string[];
}
