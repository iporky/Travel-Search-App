import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { updateSettings } from '../api/profile';
import i18n from '../i18n';

export interface AppLanguage {
  /** e.g. 'en' */
  code: string;
  /** Native display name, e.g. '한국어' */
  label: string;
  /** BCP-47 locale used for speech recognition, e.g. 'ko-KR' */
  voiceLocale: string;
}

export const LANGUAGES: AppLanguage[] = [
  { code: 'en', label: 'English', voiceLocale: 'en-US' },
  { code: 'ko', label: '한국어', voiceLocale: 'ko-KR' },
  { code: 'ja', label: '日本語', voiceLocale: 'ja-JP' },
  { code: 'zh', label: '中文', voiceLocale: 'zh-CN' },
  { code: 'zh-TW', label: '繁體中文', voiceLocale: 'zh-TW' },
  { code: 'es', label: 'Español', voiceLocale: 'es-ES' },
  { code: 'fr', label: 'Français', voiceLocale: 'fr-FR' },
  { code: 'de', label: 'Deutsch', voiceLocale: 'de-DE' },
  { code: 'vi', label: 'Tiếng Việt', voiceLocale: 'vi-VN' },
  { code: 'th', label: 'ไทย', voiceLocale: 'th-TH' },
];

/** i18n resource keys that actually have a translation bundle. */
const SUPPORTED_I18N = LANGUAGES.map((l) => l.code);

const STORAGE_KEY = '@konnect:language';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: LANGUAGES[0],
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(LANGUAGES[0]);

  const resolveI18nLanguage = useCallback((code: string) => {
    // Exact match (e.g. 'zh-TW') wins; otherwise fall back to the base code
    // (e.g. 'zh'); otherwise English.
    if (SUPPORTED_I18N.includes(code)) return code;
    const base = code.split('-')[0];
    if (SUPPORTED_I18N.includes(base)) return base;
    return 'en';
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((code) => {
      const found = LANGUAGES.find((l) => l.code === code);
      if (found) {
        setLanguageState(found);
        i18n.changeLanguage(resolveI18nLanguage(found.code)).catch(() => {});
      }
    });
  }, [resolveI18nLanguage]);

  const setLanguage = useCallback((lang: AppLanguage) => {
    setLanguageState(lang);
    i18n.changeLanguage(resolveI18nLanguage(lang.code)).catch(() => {});
    AsyncStorage.setItem(STORAGE_KEY, lang.code).catch(() => {});
    // Best-effort backend sync (PATCH /profile/{uid}/settings — its own
    // user_settings collection, per the Profile contract). Signed-out picks
    // stay local-only.
    if (auth().currentUser) {
      updateSettings(lang.code).catch((e) =>
        console.warn('[language] settings sync failed', e?.message ?? e),
      );
    }
  }, [resolveI18nLanguage]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
