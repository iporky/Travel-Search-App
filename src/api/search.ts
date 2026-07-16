/**
 * search.ts — query/answer endpoint for the Home search + voice flow.
 *
 * MOCK implementation: returns hardcoded answers after a short delay.
 *
 * Real endpoint (from backend spec):
 *   POST https://dev.konnect.kr/query/stream
 *   headers: { accept: application/json, Content-Type: application/json }
 *   body: {
 *     email, metadata: { source }, min_similarity, output_language,
 *     query, session_id, top_k, user_lat, user_lng
 *   }
 * To go live: flip USE_MOCKS to false in src/config, and replace the mock
 * body below with the `request(...)` call that is commented out.
 */

import { mockDelay /*, request, BASE_URL */ } from './client';

export interface SearchSource {
  title: string;
  snippet: string;
}

export interface SearchResult {
  query: string;
  answer: string;
  sources: SearchSource[];
  related: string[];
}

export interface SubmitQueryArgs {
  query: string;
  email?: string;
  outputLanguage?: string;
  sessionId?: string;
  userLat?: number;
  userLng?: number;
}

// ── Hardcoded answers ────────────────────────────────────────────────────────
// Keyed by simple keyword match; falls back to a generic answer.
const CANNED: Array<{ match: RegExp; result: Omit<SearchResult, 'query'> }> = [
  {
    match: /soju|drink|bomb|somaek/i,
    result: {
      answer:
        "A soju bomb (somaek) pairs best with rich, savory Korean anju (안주). " +
        "The classics are Korean fried chicken (chimaek-style), samgyeopsal (grilled pork belly), " +
        "spicy tteokbokki, golbaengi muchim (spicy sea snails), and pajeon (savory pancake). " +
        "Bar snacks like dried squid and nuts are common too. The idea is fatty, salty, or spicy " +
        "food to balance the drink.",
      sources: [
        { title: 'Korean Drinking Culture 101', snippet: 'Anju is the food you eat while drinking — never drink on an empty stomach.' },
        { title: 'Best Anju Pairings', snippet: 'Fried chicken and samgyeopsal top the list for soju + beer.' },
      ],
      related: [
        'What is somaek and how do I make it?',
        'Best Korean fried chicken near me',
        'Korean drinking etiquette for foreigners',
      ],
    },
  },
  {
    match: /visa|immigration|d-?\d|arc|residence/i,
    result: {
      answer:
        "For a Korean visa, start at the Hi Korea portal (hikorea.go.kr) to book an appointment " +
        "at your local immigration office. Tourists from many countries get K-ETA or visa-free entry; " +
        "for longer stays you'll need the right visa type (e.g. D-2 student, E-7 work, F-6 marriage). " +
        "Bring your passport, application form, photo, and proof of purpose. Processing usually takes " +
        "2–4 weeks.",
      sources: [
        { title: 'Hi Korea — Official Portal', snippet: 'Book immigration appointments and check visa requirements.' },
        { title: 'K-ETA Guide', snippet: 'Electronic travel authorization for visa-free visitors.' },
      ],
      related: [
        'How do I apply for K-ETA?',
        'D-2 student visa requirements',
        'How to extend my visa in Korea',
      ],
    },
  },
  {
    match: /bbq|barbecue|samgyeopsal|galbi|meat|restaurant|eat|food/i,
    result: {
      answer:
        "For Korean BBQ in Seoul, the most popular districts are Mapo (Mapo-galmaegi skirt meat), " +
        "Majang-dong (Korea's largest meat market — ultra-fresh beef), and Gangnam for upscale hanwoo. " +
        "For a lively first-timer experience, head to Hongdae or Konkuk University area. Look for places " +
        "with a crowd of locals and charcoal (숯불) grills for the best flavor.",
      sources: [
        { title: 'Seoul BBQ Neighborhoods', snippet: 'Mapo, Majang-dong and Gangnam each offer a different BBQ style.' },
        { title: 'Charcoal vs Gas Grill', snippet: 'Charcoal (숯불) grills give a smokier, more authentic taste.' },
      ],
      related: [
        'What is hanwoo beef?',
        'Korean BBQ side dishes explained',
        'Best budget Korean BBQ in Seoul',
      ],
    },
  },
  {
    match: /jeju/i,
    result: {
      answer:
        "Jeju in July is warm and lush but it's also the rainy season's tail and peak domestic travel " +
        "month, so expect humidity and crowds. It's still worth it: hike Hallasan early morning, visit " +
        "Seongsan Ilchulbong at sunrise, relax on Hyeopjae Beach, and tour the east-coast cafes. Book " +
        "flights and cars early — July is busy. Pack rain gear and sunscreen.",
      sources: [
        { title: 'Jeju Seasonal Guide', snippet: 'July is warm, humid, and one of the busiest travel months.' },
        { title: 'Top Jeju Sights', snippet: 'Hallasan, Seongsan Ilchulbong, and Hyeopjae Beach are must-sees.' },
      ],
      related: [
        'How many days do I need in Jeju?',
        'Do I need a car in Jeju?',
        'Best beaches in Jeju',
      ],
    },
  },
  {
    match: /taxi|kakao|transport|subway|bus|gangnam/i,
    result: {
      answer:
        "The easiest way to get a taxi in Korea is the Kakao T app — it works like Uber, shows the fare, " +
        "and lets you pay by card so there's no language barrier. Regular street taxis are metered and " +
        "cheap; orange/silver are standard, black are premium. For Gangnam nightlife, taxis are plentiful " +
        "but surge late at night, so booking via Kakao T early is smart. The subway runs until around " +
        "midnight.",
      sources: [
        { title: 'Kakao T', snippet: 'Korea\'s dominant ride-hailing and taxi app.' },
        { title: 'Seoul Taxi Types', snippet: 'Standard (orange/silver) vs premium (black) taxis.' },
      ],
      related: [
        'How much does a taxi from Incheon cost?',
        'Does the Seoul subway run at night?',
        'How to pay for taxis without cash',
      ],
    },
  },
];

const DEFAULT_RESULT: Omit<SearchResult, 'query'> = {
  answer:
    "Here's what I found. Konnect is your Korea travel companion — ask me about food, transport, " +
    "visas, events, or anything about getting around Korea, and I'll give you real-time, local answers. " +
    "Try being specific (e.g. a neighborhood or a dish) for the best results.",
  sources: [
    { title: 'Konnect Guide', snippet: 'Your AI companion for traveling and living in Korea.' },
  ],
  related: [
    'Best Korean BBQ in Seoul',
    'How do I apply for a Korean visa?',
    'Is Jeju worth visiting in July?',
  ],
};

/**
 * Submits a search query and returns an answer.
 * Currently mocked — returns hardcoded responses.
 */
export async function submitQuery(args: SubmitQueryArgs): Promise<SearchResult> {
  const query = args.query.trim();
  console.log('[api] submitQuery → POST /query/stream', JSON.stringify({
    email: args.email ?? 'user@example.com',
    metadata: { source: 'mobile' },
    min_similarity: 0.7,
    output_language: args.outputLanguage ?? 'English',
    query,
    session_id: args.sessionId ?? '550e8400-e29b-41d4-a716-446655440000',
    top_k: 10,
    user_lat: args.userLat ?? 37.5665,
    user_lng: args.userLng ?? 126.978,
  }));

  await mockDelay(700);

  // ─── Real implementation (uncomment when backend is ready) ───
  // return request<SearchResult>('/query/stream', {
  //   method: 'POST',
  //   headers: { accept: 'application/json' },
  //   body: JSON.stringify({
  //     email: args.email,
  //     metadata: { source: 'mobile' },
  //     min_similarity: 0.7,
  //     output_language: args.outputLanguage ?? 'English',
  //     query,
  //     session_id: args.sessionId,
  //     top_k: 10,
  //     user_lat: args.userLat ?? 37.5665,
  //     user_lng: args.userLng ?? 126.978,
  //   }),
  // });

  const hit = CANNED.find((c) => c.match.test(query));
  const base = hit ? hit.result : DEFAULT_RESULT;
  console.log('[api] submitQuery ✓', hit ? 'matched canned answer' : 'default answer');
  return { query, ...base };
}
