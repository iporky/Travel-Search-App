import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageScreen } from '../LanguageScreen';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { ActionSheetMenu } from '../../components/buzz/ActionSheetMenu';
import { IconButton, SectionTitle, SettingsRow, TopBar } from '../../components/profile/ProfileUI';
import { deleteAccount, signOutAllSessions, signOutSession } from '../../api/profile';

// Figma "Profile_Setting_Default" (12276:93797):
//   TopBar: ‹ back · "Profile" · ⋯ (Icon/more — opens the account-action menu)
//   Preferences     — Language (value: current code, → language picker 10352:31137)
//   Support & Legal — Contact us · Feedback · Privacy Policy · About Us
//   Account Actions — Sign out · Sign out of All Sessions · Delete Account,
//                     each confirmed by its Dialog (Profile_Alert_*), then →
//                     Login screen. Rows: #fefefe, radius 12, 64 tall, Google icons.

export type SettingsSubView = 'contact' | 'feedback' | 'privacyPolicy' | 'about';

type Props = {
  onBack: () => void;
  onOpen: (view: SettingsSubView) => void;
};

type Confirm = 'signOut' | 'signOutAll' | 'delete';

export function SettingsScreen({ onBack, onOpen }: Props) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { language } = useLanguage();
  const [showLanguage, setShowLanguage] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Each action ends the backend session(s) first, then clears the local one →
  // the app falls back to the Login screen (annotation: "go to Login Screen").
  const run = async (kind: Confirm) => {
    if (busy) return;
    setBusy(true);
    try {
      if (kind === 'signOut') await signOutSession();
      else if (kind === 'signOutAll') await signOutAllSessions();
      else await deleteAccount();
    } catch (e: any) {
      // The local sign-out still happens — the server call is best-effort for
      // sign-out; for delete we surface nothing extra here (logged).
      console.warn('[Settings]', kind, 'backend call failed', e?.message ?? e);
    } finally {
      setConfirm(null);
      setBusy(false);
      await signOut();
    }
  };

  const dialog: Record<Confirm, { title: string; body: string; confirm: string }> = {
    signOut: {
      title: t('settings.signOutTitle'),
      body: t('settings.signOutBody'),
      confirm: t('settings.signOut'),
    },
    signOutAll: {
      title: t('settings.signOutAllTitle'),
      body: t('settings.signOutAllBody'),
      confirm: t('settings.signOutAllConfirm'),
    },
    delete: {
      title: t('settings.deleteTitle'),
      body: t('settings.deleteBody'),
      confirm: t('settings.deleteConfirm'),
    },
  };

  return (
    <View style={styles.screen}>
      <TopBar
        title={t('profile.title')}
        onBack={onBack}
        right={<IconButton icon="more-horiz" onPress={() => setMenuOpen(true)} />}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <SectionTitle style={styles.sectionTitlePad}>{t('settings.preferences')}</SectionTitle>
          <View style={styles.rows}>
            <SettingsRow
              icon="language"
              label={t('settings.language')}
              value={language.code.toUpperCase()}
              onPress={() => setShowLanguage(true)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle style={styles.sectionTitlePad}>{t('settings.supportLegal')}</SectionTitle>
          <View style={styles.rows}>
            <SettingsRow icon="mail-outline" label={t('settings.contactUs')} onPress={() => onOpen('contact')} />
            <SettingsRow icon="feedback" label={t('settings.feedback')} onPress={() => onOpen('feedback')} />
            <SettingsRow icon="privacy-tip" label={t('settings.privacyPolicy')} onPress={() => onOpen('privacyPolicy')} />
            <SettingsRow icon="info-outline" label={t('settings.aboutUs')} onPress={() => onOpen('about')} />
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle style={styles.sectionTitlePad}>{t('settings.accountActions')}</SectionTitle>
          <View style={styles.rows}>
            <SettingsRow icon="logout" label={t('settings.signOut')} onPress={() => setConfirm('signOut')} />
            <SettingsRow icon="exit-to-app" label={t('settings.signOutAll')} onPress={() => setConfirm('signOutAll')} />
            <SettingsRow icon="delete-outline" label={t('settings.deleteAccount')} onPress={() => setConfirm('delete')} />
          </View>
        </View>
      </ScrollView>

      <LanguageScreen visible={showLanguage} onClose={() => setShowLanguage(false)} />

      <ActionSheetMenu
        visible={menuOpen}
        items={[
          { label: t('settings.signOut'), onPress: () => setConfirm('signOut') },
          { label: t('settings.signOutAll'), onPress: () => setConfirm('signOutAll') },
          { label: t('settings.deleteAccount'), destructive: true, onPress: () => setConfirm('delete') },
        ]}
        onClose={() => setMenuOpen(false)}
      />

      <ConfirmDialog
        visible={confirm != null}
        title={confirm ? dialog[confirm].title : ''}
        body={confirm ? dialog[confirm].body : ''}
        confirmLabel={confirm ? dialog[confirm].confirm : ''}
        cancelLabel={t('common.cancel')}
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && run(confirm)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[24], gap: spacing[8] },
  section: { gap: spacing[4] },
  sectionTitlePad: { paddingHorizontal: spacing[1] },
  rows: { gap: spacing[3] },
});

