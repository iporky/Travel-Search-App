import { Asset } from 'expo-asset';

/**
 * All static images used by the splash/onboarding + home flows.
 * Preloaded once at startup so screens never render with missing assets.
 */
const APP_ASSETS: number[] = [
  // Onboarding backgrounds + UI. Splash screens 1-4 and sign-in now use
  // gradients + SVGs, so the old bg-screen1..4 / bg-signin photos aren't preloaded.
  require('../../assets/onboarding/logo.png'),
  // Onboarding questionnaire icons + mascot bird are 512px PNGs rendered by
  // Android resource name ({uri}) in onboardingIcons.ts — bundled via their own
  // require() there, so nothing to preload here.
  require('../../assets/onboarding/airplane.png'),
  require('../../assets/onboarding/chevron-left.png'),
  require('../../assets/onboarding/fill.png'),
  require('../../assets/onboarding/track.png'),
  require('../../assets/onboarding/road-path.png'),

  // Sign-up / splash redesign — base + overlay assets (per screen).
  // Screen 1 birds are inline SVGs (src/assets/screen1Birds.ts), not PNGs.
  require('../../assets/onboarding/signup/screen1/cloud.png'),

  // Screen 2 — Service Discovery (gradient bg + floating service icons).
  // The hero bird is an inline SVG (src/assets/screen2BirdSvg.ts), not a PNG.
  require('../../assets/onboarding/signup/screen2/icon-passport.png'),
  require('../../assets/onboarding/signup/screen2/icon-food.png'),
  require('../../assets/onboarding/signup/screen2/icon-bus.png'),
  require('../../assets/onboarding/signup/screen2/icon-plane.png'),
  require('../../assets/onboarding/signup/screen2/icon-map.png'),
  require('../../assets/onboarding/signup/screen2/icon-emergency.png'),

  // Screens 3 (Buzz), 4 (Payment) & sign-in are fully inline SVGs
  // (screen3Buzz.ts / screen4Pay.ts / signInAssets.ts) — nothing to preload.

  // Auth icons
  require('../../assets/auth/apple.png'),
  require('../../assets/auth/google.png'),
  require('../../assets/auth/facebook.png'),

  // Service icons
  require('../../assets/services/icon-passport.png'),
  require('../../assets/services/icon-food.png'),
  require('../../assets/services/icon-bus.png'),
  require('../../assets/services/icon-plane.png'),
  require('../../assets/services/icon-map.png'),
  require('../../assets/services/icon-emergency.png'),

  // Voice mascot raster.
  require('../../assets/voice/bird.png'),

  // NOTE: the nav/voice/auth icons are rendered as inline SVG strings
  // (TabBar, VoiceOverlay), so their .svg files don't need preloading.
];

let loaded = false;

/** Downloads/decodes every asset into memory. Resolves once when complete. */
export async function preloadAppAssets(): Promise<void> {
  if (loaded) return;
  const tasks = APP_ASSETS.map(async (moduleId) => {
    try {
      await Asset.fromModule(moduleId).downloadAsync();
    } catch (e) {
      // Never fail the whole preload if one asset is unsupported/missing.
      console.warn('[assets] preload item failed', e);
    }
  });

  await Promise.all(tasks);
  loaded = true;
}
