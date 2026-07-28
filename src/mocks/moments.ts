import { Moment } from '../types/moments';

// Category chips shown above the Moments feed. 'All' is prepended in the screen.
export const momentCategories = ['Living', 'Travel', 'Food', 'Nightlife', 'Study'];

const photo = (seed: string, size = 300) =>
  `https://picsum.photos/seed/${seed}/${size}/${size}`;

export const momentsFeed: Moment[] = [
  {
    id: 'm1',
    category: 'Living',
    text:
      'Finally got my apartment in Mangwon-dong set up! For anyone moving to Seoul — the used furniture markets near Hapjeong are a goldmine. Got this whole living room for under ₩300,000. Happy to share the exact shops if anyone needs them.',
    photos: [photo('m1a'), photo('m1b'), photo('m1c'), photo('m1d'), photo('m1e')],
    author: 'shivang',
    time: '2h ago',
    location: 'Seoul',
    likes: 1,
    isMine: true,
    comments: [
      {
        id: 'c1',
        author: 'minji',
        time: '1h ago',
        text: 'The shop under Hapjeong station overpass is the best one — ask for the owner, he speaks English!',
        likes: 12,
        commentCount: 2,
        replies: [
          {
            id: 'c1r1',
            author: 'shivang',
            time: '40m ago',
            text: "That's exactly where the sofa is from! Great taste 😄",
            likes: 4,
            commentCount: 0,
          },
        ],
      },
      {
        id: 'c2',
        author: 'daniel',
        time: '30m ago',
        text: 'Please share the list! Moving to Mapo next month.',
        likes: 3,
        commentCount: 0,
      },
    ],
  },
  {
    id: 'm2',
    category: 'Travel',
    text:
      'Day trip to Suwon Hwaseong Fortress — take the tourist trolley if you are short on time, it covers the whole wall in about 40 minutes. The archery experience near Yeonmudae is ₩2,000 for 10 arrows and absolutely worth it.',
    photos: [photo('m2a'), photo('m2b'), photo('m2c')],
    author: 'yuna',
    time: '5h ago',
    location: 'Suwon',
    likes: 24,
    comments: [
      {
        id: 'c3',
        author: 'marco',
        time: '3h ago',
        text: 'Did this last week — go at sunset, the wall lights up beautifully.',
        likes: 8,
        commentCount: 0,
      },
    ],
  },
  {
    id: 'm3',
    category: 'Food',
    text:
      'Gwangjang Market survival guide: skip the first row of stalls (tourist prices), head to the middle aisle for bindaetteok, and the mayak gimbap stall with the green sign takes cards. Go before 11am to avoid the queues.',
    photos: [photo('m3a'), photo('m3b'), photo('m3c'), photo('m3d')],
    author: 'sofia',
    time: '8h ago',
    location: 'Seoul',
    likes: 56,
    comments: [
      {
        id: 'c4',
        author: 'jae',
        time: '6h ago',
        text: 'The knife-cut noodle alley in the back is also incredible and half the price.',
        likes: 15,
        commentCount: 1,
        replies: [
          {
            id: 'c4r1',
            author: 'sofia',
            time: '5h ago',
            text: 'Adding that to the list for next weekend!',
            likes: 2,
            commentCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: 'm4',
    category: 'Nightlife',
    text:
      'Hongdae on a Friday vs Euljiro on a Friday are two different planets. If you want vinyl bars and quiet cocktails, Euljiro 3-ga back alleys are unbeatable — most bars are hidden on 2nd/3rd floors, just follow the small signs.',
    photos: [photo('m4a'), photo('m4b')],
    author: 'tom',
    time: '1d ago',
    location: 'Seoul',
    likes: 33,
    comments: [],
  },
  {
    id: 'm5',
    category: 'Study',
    text:
      'TOPIK II tip that nobody told me: past papers from topik.go.kr are free and the listening section reuses the same announcement formats every year. Two weeks of shadowing those got me from level 3 to level 4.',
    photos: [photo('m5a')],
    author: 'anna',
    time: '2d ago',
    location: 'Busan',
    likes: 41,
    comments: [
      {
        id: 'c5',
        author: 'leo',
        time: '1d ago',
        text: 'Which textbook did you pair with the past papers?',
        likes: 1,
        commentCount: 0,
      },
    ],
  },
];
