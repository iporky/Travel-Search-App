import { Asset } from 'expo-asset';

/**
 * All static images used by the splash/onboarding + home flows.
 * Preloaded once at startup so screens never render with missing assets.
 */
const APP_ASSETS: number[] = [
  // Onboarding backgrounds + UI
  require('../../assets/onboarding/logo.png'),
  require('../../assets/onboarding/bg-screen1.png'),
  require('../../assets/onboarding/bg-screen2.png'),
  require('../../assets/onboarding/bg-screen3.png'),
  require('../../assets/onboarding/bg-screen4.png'),
  require('../../assets/onboarding/bg-signin.png'),
  require('../../assets/onboarding/avatar_container.png'),
  require('../../assets/onboarding/airplane.png'),
  require('../../assets/onboarding/chevron-left.png'),
  require('../../assets/onboarding/fill.png'),
  require('../../assets/onboarding/track.png'),
  require('../../assets/onboarding/road-path.png'),

  // Mascot / bird characters
  require('../../assets/mascot/bird-hero.png'),
  require('../../assets/mascot/bird-bg-left.png'),
  require('../../assets/mascot/bird-bg-right.png'),
  require('../../assets/mascot/bird-screen2.png'),
  require('../../assets/mascot/bird-buzz-1.png'),
  require('../../assets/mascot/bird-buzz-2.png'),
  require('../../assets/mascot/bird-buzz-3.png'),
  require('../../assets/mascot/bird-buzz-4.png'),
  require('../../assets/mascot/bird-card.png'),
  require('../../assets/mascot/bird-signin.png'),
  require('../../assets/mascot/clouds-sprite.png'),

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

  // Onboarding name labels (occupation / interest categories)
  require('../../assets/onboarding/name_passport_4x.png'),
  require('../../assets/onboarding/name_korea_4x.png'),
  require('../../assets/onboarding/name_konnect_4x.png'),
  require('../../assets/onboarding/name_student_4x.png'),
  require('../../assets/onboarding/name_employee_4x.png'),
  require('../../assets/onboarding/name_teacher_4x.png'),
  require('../../assets/onboarding/name_entrepreneur_4x.png'),
  require('../../assets/onboarding/name_freelancer_4x.png'),
  require('../../assets/onboarding/name_vacation_4x.png'),
  require('../../assets/onboarding/name_food_4x.png'),
  require('../../assets/onboarding/name_shopping_4x.png'),
  require('../../assets/onboarding/name_culture_4x.png'),
  require('../../assets/onboarding/name_nightlife_4x.png'),
  require('../../assets/onboarding/name_nature_4x.png'),
  require('../../assets/onboarding/name_socialnetworking_4x.png'),
  require('../../assets/onboarding/name_solo_4x.png'),
  require('../../assets/onboarding/name_partner_4x.png'),
  require('../../assets/onboarding/name_friend_4x.png'),
  require('../../assets/onboarding/name_group_4x.png'),
  require('../../assets/onboarding/name_home_4x.png'),

  // City name labels
  require('../../assets/cities/name_busan_4x.png'),
  require('../../assets/cities/name_seoul_4x.png'),
  require('../../assets/cities/name_jeju_4x.png'),
  require('../../assets/cities/name_gyeongju_4x.png'),
  require('../../assets/cities/name_incheon_4x.png'),
  require('../../assets/cities/name_suwon_4x.png'),
  require('../../assets/cities/name_gangneung_4x.png'),
  require('../../assets/cities/name_yeosu_4x.png'),
  require('../../assets/cities/name_jeonju_4x.png'),
  require('../../assets/cities/name_daegu_4x.png'),

  // SVG assets requested by design team. Some runtimes may not download these via
  // Asset APIs, so we preload them individually with per-file error isolation.
  require('../../assets/auth/google.svg'),
  require('../../assets/voice/bird.png'),
  require('../../assets/voice/mic.svg'),
  require('../../assets/voice/mic_selected.svg'),
  require('../../assets/navigation/home.svg'),
  require('../../assets/navigation/home_selected.svg'),
  require('../../assets/navigation/buzz.svg'),
  require('../../assets/navigation/buzz_selected.svg'),
  require('../../assets/navigation/history.svg'),
  require('../../assets/navigation/history_selected.svg'),
  require('../../assets/navigation/profile.svg'),
  require('../../assets/navigation/profile_selected.svg'),
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
