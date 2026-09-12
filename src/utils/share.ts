/**
 * share.ts — mint a short link, then open the OS native share sheet.
 *
 * The flow mirrors the website: ask the backend for a short `share_url` for
 * this content, then hand that URL to React Native's built-in `Share`, which
 * raises the platform sheet (KakaoTalk, WhatsApp, WeChat, Messages, Copy Link,
 * …) — whatever the device offers. No bespoke share UI of our own.
 */

import { Share } from 'react-native';
import { shareEvent, shareSearchAnswer, eventShareLink, searchAnswerShareLink } from '../api/share';

export type ShareKind = 'event' | 'search';

export interface ShareContentOptions {
  kind: ShareKind;
  id: string | number;
  /** Optional label shared alongside the link (the event/question title). */
  title?: string;
}

/** Why a share didn't complete: minting failed, or the user closed the sheet. */
export type ShareFailure = 'mint' | 'dismissed' | null;

export interface ShareResult {
  ok: boolean;
  /** True when the short link came back from the backend rather than the fallback. */
  shortened: boolean;
  /** null when ok — callers only need to surface 'mint'. */
  failure: ShareFailure;
}

/**
 * Mint + share. Safe to call straight from an onPress: it never throws, and
 * the user dismissing the sheet is treated as a normal outcome, not an error.
 *
 * If minting fails the behaviour differs by kind — see inside.
 */
export async function shareContent({ kind, id, title }: ShareContentOptions): Promise<ShareResult> {
  let url: string;
  let shortened = false;

  try {
    url = kind === 'event' ? await shareEvent(id) : await shareSearchAnswer(String(id));
    shortened = true;
  } catch (err) {
    console.warn('[share] could not mint short link', err);

    if (kind === 'search') {
      // No fallback for a search. Its destination page gets its content from
      // GET /history/search/{id}/public, which only answers while an ACTIVE
      // share exists — so without a minted link that page is a guaranteed dead
      // end. Telling the user we couldn't share beats handing out a broken
      // link. A 404 here usually means "you don't own this search" rather than
      // "it doesn't exist", hence a generic message.
      return { ok: false, shortened: false, failure: 'mint' };
    }

    // An event page renders from its own id whether or not a share exists, so
    // the long link still works.
    url = eventShareLink(id);
  }

  try {
    // iOS uses `url` for a rich preview; Android reads `message`. Send both so
    // the link lands whichever platform the user is on.
    await Share.share(
      { url, message: title ? `${title}\n${url}` : url, title },
      { subject: title },
    );
    return { ok: true, shortened, failure: null };
  } catch (err) {
    // Dismissing the sheet rejects on some platforms — a no-op, not an error.
    console.warn('[share] share sheet dismissed or failed', err);
    return { ok: false, shortened, failure: 'dismissed' };
  }
}
