import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ko from './locales/ko';
import ja from './locales/ja';
import zh from './locales/zh';
import zhTW from './locales/zhTW';
import es from './locales/es';
import fr from './locales/fr';
import de from './locales/de';
import vi from './locales/vi';
import th from './locales/th';

const resources = {
  en: { translation: en },
  ko: { translation: ko },
  ja: { translation: ja },
  zh: { translation: zh },
  'zh-TW': { translation: zhTW },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  vi: { translation: vi },
  th: { translation: th },
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });
}

export default i18n;
