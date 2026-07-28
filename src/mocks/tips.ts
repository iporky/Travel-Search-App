import { Tip, TipCategoryGroup } from '../types/tips';

// Figma "Share a Tip" category picker (node 11478:74839) — three labelled groups.
export const tipCategoryGroups: TipCategoryGroup[] = [
  {
    title: 'Popular',
    categories: [
      '🍜 Food & Cafe',
      '📄 Visa',
      '🛍 Shopping',
      '🎉 Events',
      '💡 Daily Life',
      '💼 Jobs',
      '👥 Community',
    ],
  },
  {
    title: 'Essentials',
    categories: [
      '🚇 Transport',
      '🏥 Healthcare',
      '🏠 Housing',
      '🎓 Study',
      '🗣 Language',
      '💰 Save Money',
      '💳 Banking',
    ],
  },
  {
    title: 'Explore',
    categories: ['🏛 Culture', '📍 Hidden Gems', '🌃 Nightlife'],
  },
];

/** Chips shown above the Tips feed. */
export const tipFeedCategories = [
  '💡 Daily Life',
  '🚇 Transport',
  '🍜 Food & Cafe',
  '🏠 Housing',
  '📄 Visa',
];

/** The composer caps a tip at 40 characters (Figma character-counter note). */
export const TIP_MAX_LENGTH = 40;

export const tipsFeed: Tip[] = [
  {
    id: 't1',
    category: '🚇 Transport',
    text: 'Tap your card on the bus when you get off too.',
    author: 'shivang',
    time: '2h ago',
    location: 'Seoul',
    likes: 34,
    isMine: true,
  },
  {
    id: 't2',
    category: '💡 Daily Life',
    text: 'Convenience stores do 1+1 deals — check the shelf tag.',
    author: 'minji',
    time: '4h ago',
    location: 'Seoul',
    likes: 51,
  },
  {
    id: 't3',
    category: '🍜 Food & Cafe',
    text: 'Most restaurants refill side dishes free — just ask.',
    author: 'yuna',
    time: '7h ago',
    location: 'Busan',
    likes: 88,
  },
  {
    id: 't4',
    category: '🏠 Housing',
    text: 'Always check the maintenance fee before signing.',
    author: 'daniel',
    time: '1d ago',
    location: 'Seoul',
    likes: 27,
  },
  {
    id: 't5',
    category: '📄 Visa',
    text: 'Book HiKorea appointments 3 weeks ahead — they fill up.',
    author: 'amir',
    time: '1d ago',
    location: 'Incheon',
    likes: 63,
  },
  {
    id: 't6',
    category: '💰 Save Money',
    text: 'T-money card works in taxis and convenience stores.',
    author: 'sofia',
    time: '2d ago',
    location: 'Seoul',
    likes: 45,
  },
];
