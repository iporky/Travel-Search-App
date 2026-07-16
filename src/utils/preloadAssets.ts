import { Asset } from 'expo-asset';

/**
 * All static images used by the splash/onboarding + home flows.
 * Preloaded once at startup so screens never render with missing assets.
 */
const APP_ASSETS: number[] = [
  require('../../assets/onboarding/logo.png'),
  require('../../assets/onboarding/bg-screen1.png'),
  require('../../assets/onboarding/bg-screen2.png'),
  require('../../assets/onboarding/bg-screen3.png'),
  require('../../assets/onboarding/bg-screen4.png'),
  require('../../assets/onboarding/bg-signin.png'),
  require('../../assets/onboarding/bird-hero.png'),
  require('../../assets/onboarding/bird-bg-left.png'),
  require('../../assets/onboarding/bird-bg-right.png'),
  require('../../assets/onboarding/bird-screen2.png'),
  require('../../assets/onboarding/bird-buzz-1.png'),
  require('../../assets/onboarding/bird-buzz-2.png'),
  require('../../assets/onboarding/bird-buzz-3.png'),
  require('../../assets/onboarding/bird-buzz-4.png'),
  require('../../assets/onboarding/bird-card.png'),
  require('../../assets/onboarding/bird-signin.png'),
  require('../../assets/onboarding/clouds-sprite.png'),
  require('../../assets/onboarding/icon-passport.png'),
  require('../../assets/onboarding/icon-food.png'),
  require('../../assets/onboarding/icon-bus.png'),
  require('../../assets/onboarding/icon-plane.png'),
  require('../../assets/onboarding/icon-map.png'),
  require('../../assets/onboarding/icon-emergency.png'),
  require('../../assets/onboarding/apple.png'),
  require('../../assets/onboarding/google.png'),
  require('../../assets/onboarding/facebook.png'),
  require('../../assets/onboarding/avatar_container.png'),
  require('../../assets/onboarding/airplane.png'),
  require('../../assets/onboarding/chevron-left.png'),
  require('../../assets/onboarding/fill.png'),
  require('../../assets/onboarding/track.png'),
  require('../../assets/onboarding/road-path.png'),
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
  require('../../assets/onboarding/name_busan_4x.png'),
  require('../../assets/onboarding/name_seoul_4x.png'),
  require('../../assets/onboarding/name_jeju_4x.png'),
  require('../../assets/onboarding/name_gyeongju_4x.png'),
  require('../../assets/onboarding/name_incheon_4x.png'),
  require('../../assets/onboarding/name_suwon_4x.png'),
  require('../../assets/onboarding/name_gangneung_4x.png'),
  require('../../assets/onboarding/name_yeosu_4x.png'),
  require('../../assets/onboarding/name_jeonju_4x.png'),
  require('../../assets/onboarding/name_daegu_4x.png'),

  // SVG assets requested by design team. Some runtimes may not download these via
  // Asset APIs, so we preload them individually with per-file error isolation.
  require('../../assets/onboarding/google.svg'),
  require('../../assets/onboarding/voice_processing/bird.png'),
  require('../../assets/onboarding/voice_processing/mic.svg'),
  require('../../assets/onboarding/voice_processing/mic_selected.svg'),
  require('../../assets/onboarding/home_bottom_nav/home.svg'),
  require('../../assets/onboarding/home_bottom_nav/home_selected.svg'),
  require('../../assets/onboarding/home_bottom_nav/buzz.svg'),
  require('../../assets/onboarding/home_bottom_nav/buzz_selected.svg'),
  require('../../assets/onboarding/home_bottom_nav/history.svg'),
  require('../../assets/onboarding/home_bottom_nav/history_selected.svg'),
  require('../../assets/onboarding/home_bottom_nav/profile.svg'),
  require('../../assets/onboarding/home_bottom_nav/profile_selected.svg'),
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
