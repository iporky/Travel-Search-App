import React, { useRef, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { ScreenTransition } from '../components/ScreenTransition';
import { ProfileMain } from './profile/ProfileMain';
import { SettingsScreen, SettingsSubView } from './profile/SettingsScreen';
import { ContactUsScreen } from './profile/ContactUsScreen';
import { FeedbackScreen } from './profile/FeedbackScreen';
import { LegalScreen } from './profile/LegalScreen';

// Profile tab router — Figma "Profile for Aug release" (section 12276:93796):
// Profile → Settings → { Contact us, Feedback, Privacy Policy, About Us }.
// Account actions (sign out / sign out all / delete) are dialogs on Settings.

type ProfileView = 'main' | 'settings' | SettingsSubView;

type Props = {
  /** Kept for the App shell; the profile flow has no full-bleed sub-views now. */
  onFullScreen?: (full: boolean) => void;
  /** About-page CTAs: jump to the Home tab (optionally running a search). */
  onNavigateHome?: (searchQuery?: string) => void;
};

export function ProfileScreen({ onFullScreen, onNavigateHome }: Props) {
  const [view, setView] = useState<ProfileView>('main');
  // 'push' when drilling in, 'pop' when backing out — drives the slide direction.
  const dirRef = useRef<'push' | 'pop'>('push');
  const go = (next: ProfileView, dir: 'push' | 'pop' = 'push') => {
    dirRef.current = dir;
    setView(next);
  };

  useEffect(() => onFullScreen?.(false), [onFullScreen]);

  // Android hardware back pops one level instead of leaving the app.
  useEffect(() => {
    if (view === 'main') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (view === 'settings') go('main', 'pop');
      else go('settings', 'pop');
      return true;
    });
    return () => sub.remove();
  }, [view]);

  if (view === 'settings') {
    return (
      <ScreenTransition transitionKey="settings" mode={dirRef.current}>
        <SettingsScreen onBack={() => go('main', 'pop')} onOpen={(v) => go(v)} />
      </ScreenTransition>
    );
  }

  if (view === 'contact') {
    return (
      <ScreenTransition transitionKey="contact" mode={dirRef.current}>
        <ContactUsScreen onBack={() => go('settings', 'pop')} />
      </ScreenTransition>
    );
  }

  if (view === 'feedback') {
    return (
      <ScreenTransition transitionKey="feedback" mode={dirRef.current}>
        <FeedbackScreen onBack={() => go('settings', 'pop')} />
      </ScreenTransition>
    );
  }

  if (view === 'privacyPolicy' || view === 'about') {
    return (
      <ScreenTransition transitionKey={view} mode={dirRef.current}>
        <LegalScreen kind={view} onBack={() => go('settings', 'pop')} onNavigateHome={onNavigateHome} />
      </ScreenTransition>
    );
  }

  return (
    <ScreenTransition transitionKey="profile-main" mode={dirRef.current}>
      <ProfileMain onOpenSettings={() => go('settings')} />
    </ScreenTransition>
  );
}
