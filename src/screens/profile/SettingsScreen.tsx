import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageScreen } from '../LanguageScreen';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { Card, P, SettingsRow, SubHeader } from '../../components/profile/ProfileUI';

// Figma: Settings (10978:93269). Three groups:
//   Preferences — Dark Mode (coming soon), Language, Notifications →
//   Support & Legal — Privacy Settings / Contact us / Feedback / Terms / Policy
//   Account Actions — Logout, Delete Account (both confirm first)

type Props = {
  onBack: () => void;
  onOpen: (
    view: 'notifications' | 'privacySettings' | 'contact' | 'feedback' | 'terms' | 'privacyPolicy',
  ) => void;
};

export function SettingsScreen({ onBack, onOpen }: Props) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { language } = useLanguage();
  const [showLanguage, setShowLanguage] = useState(false);
  const [confirm, setConfirm] = useState<'logout' | 'delete' | null>(null);

  return (
    <View style={styles.screen}>
      <SubHeader title={t('settings.title')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t('settings.preferences')}</Text>
          <Card>
            <SettingsRow
              first
              icon="moon-outline"
              label={t('settings.darkMode')}
              value={t('settings.comingSoon')}
              right={
                <Switch
                  value={false}
                  disabled
                  trackColor={{ false: '#e5e7eb', true: P.dark }}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingsRow
              icon="globe-outline"
              label={t('settings.language')}
              value={language.label}
              chevron="down"
              onPress={() => setShowLanguage(true)}
            />
            <SettingsRow
              icon="notifications-outline"
              label={t('settings.notifications')}
              chevron="right"
              onPress={() => onOpen('notifications')}
            />
          </Card>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t('settings.supportLegal')}</Text>
          <Card>
            <SettingsRow
              first
              icon="shield-outline"
              label={t('settings.privacySettings')}
              chevron="right"
              onPress={() => onOpen('privacySettings')}
            />
            <SettingsRow
              icon="mail-outline"
              label={t('settings.contactUs')}
              chevron="right"
              onPress={() => onOpen('contact')}
            />
            <SettingsRow
              icon="chatbox-outline"
              label={t('settings.feedback')}
              chevron="right"
              onPress={() => onOpen('feedback')}
            />
            <SettingsRow
              icon="document-text-outline"
              label={t('settings.terms')}
              chevron="right"
              onPress={() => onOpen('terms')}
            />
            <SettingsRow
              icon="lock-closed-outline"
              label={t('settings.privacyPolicy')}
              chevron="right"
              onPress={() => onOpen('privacyPolicy')}
            />
          </Card>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t('settings.accountActions')}</Text>
          <Card>
            <SettingsRow
              first
              icon="log-out-outline"
              label={t('settings.logout')}
              onPress={() => setConfirm('logout')}
            />
            <SettingsRow
              icon="trash-outline"
              label={t('settings.deleteAccount')}
              danger
              onPress={() => setConfirm('delete')}
            />
          </Card>
        </View>
      </ScrollView>

      <LanguageScreen visible={showLanguage} onClose={() => setShowLanguage(false)} />

      <ConfirmDialog
        visible={confirm === 'logout'}
        title={t('settings.logoutTitle')}
        body={t('settings.logoutBody')}
        confirmLabel={t('settings.logout')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          setConfirm(null);
          signOut();
        }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        visible={confirm === 'delete'}
        title={t('settings.deleteTitle')}
        body={t('settings.deleteBody')}
        confirmLabel={t('settings.deleteConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          // No delete-account API yet — sign out after acknowledging.
          setConfirm(null);
          signOut();
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray[100] },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: 96,
    gap: spacing[8],
  },
  group: { gap: spacing[4] },
  groupTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: P.textDark,
    paddingHorizontal: spacing[2],
  },
});
