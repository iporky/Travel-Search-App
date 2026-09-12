import { Image, ImageSourcePropType, Platform } from 'react-native';

// Taxi-cashback (receipt banner) flow artwork — Figma "Banner popup"
// (section 12393:85037), exported 1:1 and bundled under assets/cashback/.
//
// CRITICAL (CLAUDE.md): freshly-added bundled PNGs render BLANK on Android
// release when referenced by require()'s numeric id — the id doesn't map to
// the generated drawable. The require() stays (so Metro bundles the drawable)
// but Android loads it by resource NAME (path lowercased, '/'→'_', other
// non-[a-z0-9_] chars dropped — verified in the APK's resource table:
// drawable/assets_cashback_bannerm etc.).
function cashbackSource(localSource: ImageSourcePropType, resourceName: string): ImageSourcePropType {
  if (Platform.OS === 'android') {
    const { width, height } = Image.resolveAssetSource(localSource) ?? { width: 0, height: 0 };
    return { uri: resourceName, width, height };
  }
  return localSource;
}

/** Home banner card (Banner_M, 350×127 design px). */
export const CASHBACK_BANNER_SOURCE = cashbackSource(
  require('../../assets/cashback/banner-m.png') as ImageSourcePropType,
  'assets_cashback_bannerm',
);

/** Home receipt-steps banner artwork (Sep 1 round, Figma 12915:85188). */
export const CASHBACK_STEP1_SOURCE = cashbackSource(
  require('../../assets/cashback/steps/step1-taxi.png') as ImageSourcePropType,
  'assets_cashback_steps_step1taxi',
);
export const CASHBACK_STEP2_SOURCE = cashbackSource(
  require('../../assets/cashback/steps/step2-receipt.png') as ImageSourcePropType,
  'assets_cashback_steps_step2receipt',
);
export const CASHBACK_STEP3_SOURCE = cashbackSource(
  require('../../assets/cashback/steps/step3-cashback.png') as ImageSourcePropType,
  'assets_cashback_steps_step3cashback',
);

/** Detail screen taxi illustration (Detail_Image). */
export const CASHBACK_DETAIL_SOURCE = cashbackSource(
  require('../../assets/cashback/detail-taxi.png') as ImageSourcePropType,
  'assets_cashback_detailtaxi',
);

/** Success dialog gift-box illustration (Confirmation). */
export const CASHBACK_CONFIRMATION_SOURCE = cashbackSource(
  require('../../assets/cashback/confirmation.png') as ImageSourcePropType,
  'assets_cashback_confirmation',
);

/** Upload circle icon (60px in design; #EAF4FF plate + #527DFF arrow). */
export const CASHBACK_UPLOAD_ICON_SVG = `<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="36" cy="36" r="36" fill="#EAF4FF"/>
<path d="M24 51.9996C22.9 51.9996 21.9583 51.6079 21.175 50.8246C20.3917 50.0413 20 49.0996 20 47.9996V43.9996C20 43.4329 20.1917 42.9579 20.575 42.5746C20.9583 42.1913 21.4333 41.9996 22 41.9996C22.5667 41.9996 23.0417 42.1913 23.425 42.5746C23.8083 42.9579 24 43.4329 24 43.9996V47.9996H48V43.9996C48 43.4329 48.1917 42.9579 48.575 42.5746C48.9583 42.1913 49.4333 41.9996 50 41.9996C50.5667 41.9996 51.0417 42.1913 51.425 42.5746C51.8083 42.9579 52 43.4329 52 43.9996V47.9996C52 49.0996 51.6083 50.0413 50.825 50.8246C50.0417 51.6079 49.1 51.9996 48 51.9996H24ZM34 27.6996L30.25 31.4496C29.85 31.8496 29.375 32.0413 28.825 32.0246C28.275 32.0079 27.8 31.7996 27.4 31.3996C27.0333 30.9996 26.8417 30.5329 26.825 29.9996C26.8083 29.4663 27 28.9996 27.4 28.5996L34.6 21.3996C34.8 21.1996 35.0167 21.0579 35.25 20.9746C35.4833 20.8913 35.7333 20.8496 36 20.8496C36.2667 20.8496 36.5167 20.8913 36.75 20.9746C36.9833 21.0579 37.2 21.1996 37.4 21.3996L44.6 28.5996C45 28.9996 45.1917 29.4663 45.175 29.9996C45.1583 30.5329 44.9667 30.9996 44.6 31.3996C44.2 31.7996 43.725 32.0079 43.175 32.0246C42.625 32.0413 42.15 31.8496 41.75 31.4496L38 27.6996V41.9996C38 42.5663 37.8083 43.0413 37.425 43.4246C37.0417 43.8079 36.5667 43.9996 36 43.9996C35.4333 43.9996 34.9583 43.8079 34.575 43.4246C34.1917 43.0413 34 42.5663 34 41.9996V27.6996Z" fill="#527DFF"/>
</svg>`;
