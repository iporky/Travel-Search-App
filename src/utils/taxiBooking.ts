import { Linking } from 'react-native';

// Where "book a taxi" goes — ported from the website (konnect_react
// src/lib/taxiBooking.js). One Kakao short link per placement, not one shared
// link: Kakao issues a separate code per surface so bookings are attributed to
// where they came from. The key here is the same source_type the click is
// tracked under, so the two cannot drift.
export type TaxiSource = 'event' | 'receipt_banner' | 'search';

export const TAXI_BOOKING_URLS: Record<TaxiSource, string> = {
  event: 'https://service.kride.kakaomobility.com/2b6nor',
  receipt_banner: 'https://service.kride.kakaomobility.com/qlcel5',
  search: 'https://service.kride.kakaomobility.com/iqma9qp',
};

/** Opens the Kakao booking page for `source`. Tracking never gates this. */
export function openTaxiBooking(source: TaxiSource): void {
  const url = TAXI_BOOKING_URLS[source] ?? TAXI_BOOKING_URLS.receipt_banner;
  Linking.openURL(url).catch(() => {});
}
