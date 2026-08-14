import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import {
  DEFAULT_NOTIFICATIONS,
  loadProfileExtras,
  NotificationPrefs,
  saveProfileExtras,
} from '../../utils/profileExtras';
import { SectionCaption, ToggleRow, SubHeader } from '../../components/profile/ProfileUI';

// Figma: screen-1-notifications (10978:93705). Channel toggles (Push/Email/SMS),
// then ACTIVITY (Likes/Comments/New Followers/Messages) and UPDATES
// (App Updates/Promotions). Every toggle is independent and saves immediately.

type Props = { onBack: () => void };

export function NotificationSettingsScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const uid = user?.id ?? 'anon';
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);

  useEffect(() => {
    loadProfileExtras(uid).then((e) =>
      setPrefs({ ...DEFAULT_NOTIFICATIONS, ...(e.notifications ?? {}) }),
    );
  }, [uid]);

  const toggle = (key: keyof NotificationPrefs) => (value: boolean) => {
    setPrefs((cur) => {
      const next = { ...cur, [key]: value };
      saveProfileExtras(uid, { notifications: next });
      return next;
    });
  };

  return (
    <View style={styles.screen}>
      <SubHeader title={t('settings.notifications')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View>
          <ToggleRow first label={t('notif.push')} value={prefs.push} onChange={toggle('push')} />
          <ToggleRow label={t('notif.email')} value={prefs.email} onChange={toggle('email')} />
          <ToggleRow label={t('notif.sms')} value={prefs.sms} onChange={toggle('sms')} />
        </View>

        <View style={styles.captionWrap}>
          <SectionCaption>{t('notif.activity')}</SectionCaption>
        </View>
        <View>
          <ToggleRow first label={t('notif.likes')} value={prefs.likes} onChange={toggle('likes')} />
          <ToggleRow
            label={t('notif.comments')}
            value={prefs.comments}
            onChange={toggle('comments')}
          />
          <ToggleRow
            label={t('notif.followers')}
            value={prefs.followers}
            onChange={toggle('followers')}
          />
          <ToggleRow
            label={t('notif.messages')}
            value={prefs.messages}
            onChange={toggle('messages')}
          />
        </View>

        <View style={styles.captionWrap}>
          <SectionCaption>{t('notif.updates')}</SectionCaption>
        </View>
        <View>
          <ToggleRow
            first
            label={t('notif.appUpdates')}
            value={prefs.appUpdates}
            onChange={toggle('appUpdates')}
          />
          <ToggleRow
            label={t('notif.promotions')}
            value={prefs.promotions}
            onChange={toggle('promotions')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray[100] },
  content: { paddingBottom: 96 },
  captionWrap: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[2],
  },
});
