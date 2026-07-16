import { CommunityItem } from '../components/CommunityCard';

// Suggestion chips shown on the Home screen — matching the design screenshots.
export const suggestions = [
  'Trip planning',
  'Engineering',
  'Code review',
  'Daily summary',
  'Weekend ideas',
  'Write a poem',
];

// Greeting headlines that rotate on the Home screen.
export const greetings = [
  'Where is your next\nadventure?',
  'How can I\nhelp you today?',
  "What's on your\nmind today?",
];

export const communityFeed: CommunityItem[] = [
  {
    id: '1',
    author: 'Asha',
    tag: 'Design • 2h',
    title: 'How do you handle dark-mode gradients?',
    preview:
      'I am exploring radial gradients for accent surfaces but they look muddy on dark backgrounds.',
    participants: 12,
  },
  {
    id: '2',
    author: 'Mateo',
    tag: 'AI • 5h',
    title: 'Best practices for streaming responses?',
    preview:
      'Looking for patterns to render token-by-token output without jank on lower-end Android.',
    participants: 8,
  },
  {
    id: '3',
    author: 'Lin',
    tag: 'Mobile • 1d',
    title: 'Animated voice button using Reanimated',
    preview: 'Sharing a small recipe to drive the listening pulse from RMS values in real time.',
    participants: 24,
  },
  {
    id: '4',
    author: 'Priya',
    tag: 'Product • 1d',
    title: 'Onboarding without dark patterns',
    preview: 'How are folks balancing activation goals with respect for the user?',
    participants: 6,
  },
];

export const history = [
  { id: 'h1', title: 'Trip itinerary for Lisbon', when: 'Today' },
  { id: 'h2', title: 'Refactor checkout flow', when: 'Yesterday' },
  { id: 'h3', title: 'Compare RN navigation libs', when: '2 days ago' },
  { id: 'h4', title: 'Brainstorm onboarding copy', when: 'Last week' },
];
