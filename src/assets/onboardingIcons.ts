import { ImageSourcePropType, Platform } from 'react-native';

// Onboarding questionnaire icons — crisp 512px PNGs under
// assets/onboarding/questionnaire/icons/ (+ avatar/).
//
// IMPORTANT: freshly-added bundled PNGs fail to render when referenced by the
// numeric id that require() returns (the id doesn't map to the generated
// drawable, so <Image> shows blank — same class of issue onboardingSource was
// created for). The fix is to render the drawable BY NAME via { uri } on Android.
// We still keep the require() calls so Metro actually bundles the drawable; on
// Android we ignore the numeric id and load `assets_onboarding_..._<name>`.
function iconSource(bundled: number, androidResource: string): ImageSourcePropType {
  return Platform.OS === 'android' ? { uri: androidResource } : bundled;
}

const IC = 'assets_onboarding_questionnaire_icons_';

export const ONBOARDING_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  name_passport_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Passport.png'), IC + 'passport'),
  name_korea_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Korea.png'), IC + 'korea'),
  name_konnect_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Konnect.png'), IC + 'konnect'),
  name_student_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Student.png'), IC + 'student'),
  name_employee_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Employee.png'), IC + 'employee'),
  name_teacher_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Teacher.png'), IC + 'teacher'),
  name_entrepreneur_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Entrepreneur.png'), IC + 'entrepreneur'),
  name_freelancer_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Freelancer.png'), IC + 'freelancer'),
  name_vacation_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Vacation.png'), IC + 'vacation'),
  name_food_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Food.png'), IC + 'food'),
  name_shopping_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Shopping.png'), IC + 'shopping'),
  name_culture_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Culture.png'), IC + 'culture'),
  name_nightlife_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Nightlife.png'), IC + 'nightlife'),
  name_nature_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Nature.png'), IC + 'nature'),
  name_socialnetworking_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/SocialNetworking.png'), IC + 'socialnetworking'),
  name_solo_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Solo.png'), IC + 'solo'),
  name_partner_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Partner.png'), IC + 'partner'),
  name_friend_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Friend.png'), IC + 'friend'),
  name_group_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Group.png'), IC + 'group'),
  name_home_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Home.png'), IC + 'home'),
  name_busan_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Busan.png'), IC + 'busan'),
  name_seoul_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Seoul.png'), IC + 'seoul'),
  name_jeju_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Jeju.png'), IC + 'jeju'),
  name_gyeongju_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Gyeongju.png'), IC + 'gyeongju'),
  name_incheon_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Incheon.png'), IC + 'incheon'),
  name_suwon_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Suwon.png'), IC + 'suwon'),
  name_gangneung_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Gangneung.png'), IC + 'gangneung'),
  name_yeosu_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Yeosu.png'), IC + 'yeosu'),
  name_jeonju_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Jeonju.png'), IC + 'jeonju'),
  name_daegu_4x: iconSource(require('../../assets/onboarding/questionnaire/icons/Daegu.png'), IC + 'daegu'),
};

// Question-bubble mascot avatar — 512px PNG.
export const AVATAR_SOURCE: ImageSourcePropType = iconSource(
  require('../../assets/onboarding/questionnaire/avatar/avatar.png'),
  'assets_onboarding_questionnaire_avatar_avatar',
);
