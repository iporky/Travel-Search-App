import { AskPost } from '../types/ask';

export const askCategories = ['Living', 'Travel', 'Food', 'Study'];

export const askFeed: AskPost[] = [
  {
    id: 'a1',
    category: 'Living',
    title: 'Can I use Kakao Taxi without a Korean phone number?',
    body: "Just landed and my Korean SIM won't arrive until next week. I have a foreign number and a Korean bank card — is that enough to register, or does the app hard-require a 010 number?",
    author: 'shivang',
    time: '2h ago',
    location: 'Seoul',
    likes: 12,
    isMine: true,
    comments: [
      {
        id: 'ac1',
        author: 'minji',
        time: '1h ago',
        text: 'You can sign up with a foreign number, but payment needs a Korean card or Kakao Pay. Cash on arrival also works — just tell the driver.',
        likes: 8,
        replies: [
          {
            id: 'ac1r1',
            author: 'shivang',
            time: '40m ago',
            text: 'Perfect, I have a Korean card already. Thanks!',
            likes: 2,
            isMine: true,
          },
        ],
      },
      {
        id: 'ac2',
        author: 'daniel',
        time: '25m ago',
        text: 'Uber works in Seoul too and accepts foreign cards — good backup.',
        likes: 3,
      },
    ],
  },
  {
    id: 'a2',
    category: 'Living',
    title: 'Best car rental services in Seoul?',
    body: 'Looking to rent for a weekend trip to Gangneung. International licence — which companies actually accept it without fuss?',
    author: 'yuna',
    time: '5h ago',
    location: 'Seoul',
    likes: 7,
    comments: [
      {
        id: 'ac3',
        author: 'marco',
        time: '3h ago',
        text: 'Lotte Rent-a-Car and SK Rent-a-Car both take an International Driving Permit. Bring your home licence and passport too.',
        likes: 15,
      },
    ],
  },
  {
    id: 'a3',
    category: 'Food',
    title: 'Where can I find good halal food near Itaewon?',
    body: 'Any recommendations beyond the main mosque street? Would love somewhere open late.',
    author: 'amir',
    time: '8h ago',
    location: 'Seoul',
    likes: 24,
    comments: [
      {
        id: 'ac4',
        author: 'sofia',
        time: '6h ago',
        text: 'Eid restaurant just below the mosque is excellent and open until 10pm. Murree is also solid.',
        likes: 11,
      },
    ],
  },
  {
    id: 'a4',
    category: 'Study',
    title: 'Is TOPIK level 4 enough for a university application?',
    author: 'anna',
    time: '1d ago',
    location: 'Busan',
    likes: 31,
    comments: [],
  },
  {
    id: 'a5',
    category: 'Travel',
    title: 'Day trip from Seoul — Nami Island or Suwon?',
    body: 'Only have one free Saturday and can not decide. Travelling solo.',
    author: 'tom',
    time: '2d ago',
    location: 'Seoul',
    likes: 18,
    comments: [
      {
        id: 'ac5',
        author: 'jae',
        time: '1d ago',
        text: 'Suwon if you like history and want to be back by evening. Nami is prettier but the round trip eats the whole day.',
        likes: 6,
      },
    ],
  },
];
