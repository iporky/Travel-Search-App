/** A single item in the community / Buzz feed. */
export type CommunityItem = {
  id: string;
  author: string;
  tag: string;
  title: string;
  preview: string;
  participants: number;
};
