import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { saveProfileExtras } from '../utils/profileExtras';
import { ScreenTransition } from '../components/ScreenTransition';
import { ProfileMain } from './profile/ProfileMain';
import { SettingsScreen } from './profile/SettingsScreen';
import { NotificationSettingsScreen } from './profile/NotificationSettingsScreen';
import { PrivacySettingsScreen } from './profile/PrivacySettingsScreen';
import { ContactUsScreen } from './profile/ContactUsScreen';
import { FeedbackScreen } from './profile/FeedbackScreen';
import { LegalScreen } from './profile/LegalScreen';
import { VerifyFlow } from './profile/VerifyFlow';

// Profile tab router (Figma "Backend Functionality" profile flow):
// Profile → Settings → { Notifications, Privacy Settings, Contact, Feedback,
// Terms, Privacy Policy }, plus the phone/email verification flow launched
// from the identity card.

type SubView =
  | 'notifications'
  | 'privacySettings'
  | 'contact'
  | 'feedback'
  | 'terms'
  | 'privacyPolicy';

type ProfileView = 'main' | 'settings' | SubView;

type Props = {
  /** Report when a full-bleed flow (verification) is open → hide the tab bar. */
  onFullScreen?: (full: boolean) => void;
};

export function ProfileScreen({ onFullScreen }: Props) {
  const { user } = useAuth();
  const [view, setView] = useState<ProfileView>('main');
  const [verify, setVerify] = useState<'phone' | 'email' | null>(null);
  // Bumped after verification writes extras so ProfileMain reloads them.
  const [extrasVersion, setExtrasVersion] = useState(0);

  useEffect(() => onFullScreen?.(verify != null), [verify, onFullScreen]);

  // Android hardware back pops one level instead of leaving the app.
  useEffect(() => {
    if (view === 'main' && verify == null) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (verify != null) setVerify(null);
      else if (view === 'settings') setView('main');
      else setView('settings');
      return true;
    });
    return () => sub.remove();
  }, [view, verify]);

  if (verify != null) {
    return (
      <ScreenTransition transitionKey={`verify-${verify}`} mode="push">
        <VerifyFlow
          mode={verify}
          onCancel={() => setVerify(null)}
          onComplete={async (mode, value) => {
            const uid = user?.id ?? 'anon';
            if (mode === 'phone') {
              await saveProfileExtras(uid, { phone: value, phoneVerified: true });
            } else {
              await saveProfileExtras(uid, { backupEmail: value });
            }
            setExtrasVersion((v) => v + 1);
            setVerify(null);
          }}
        />
      </ScreenTransition>
    );
  }

  if (view === 'settings') {
    return (
      <ScreenTransition transitionKey="settings" mode="push">
        <SettingsScreen onBack={() => setView('main')} onOpen={setView} />
      </ScreenTransition>
    );
  }

  if (view === 'notifications') {
    return (
      <ScreenTransition transitionKey="notifications" mode="push">
        <NotificationSettingsScreen onBack={() => setView('settings')} />
      </ScreenTransition>
    );
  }

  if (view === 'privacySettings') {
    return (
      <ScreenTransition transitionKey="privacySettings" mode="push">
        <PrivacySettingsScreen onBack={() => setView('settings')} />
      </ScreenTransition>
    );
  }

  if (view === 'contact') {
    return (
      <ScreenTransition transitionKey="contact" mode="push">
        <ContactUsScreen onBack={() => setView('settings')} />
      </ScreenTransition>
    );
  }

  if (view === 'feedback') {
    return (
      <ScreenTransition transitionKey="feedback" mode="push">
        <FeedbackScreen onBack={() => setView('settings')} />
      </ScreenTransition>
    );
  }

  if (view === 'terms' || view === 'privacyPolicy') {
    return (
      <ScreenTransition transitionKey={view} mode="push">
        <LegalScreen kind={view} onBack={() => setView('settings')} />
      </ScreenTransition>
    );
  }

  return (
    <View style={styles.flex}>
      <ProfileMain
        key={`main-${extrasVersion}`}
        onOpenSettings={() => setView('settings')}
        onStartVerify={setVerify}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
