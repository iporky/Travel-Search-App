import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { loadProfileExtras, saveProfileExtras } from '../../utils/profileExtras';
import { SubHeader, ToggleRow } from '../../components/profile/ProfileUI';

// Figma: screen-2-privacy-settings (10978:93781).
// Two toggles — Private Account, Allow Location Access — saved immediately.
// Private Account shares state with the toggle on the Profile top bar.

type Props = { onBack: () => void };

export function PrivacySettingsScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const uid = user?.id ?? 'anon';
  const [privateAccount, setPrivateAccount] = useState(false);
  const [allowLocation, setAllowLocation] = useState(true);

  useEffect(() => {
    loadProfileExtras(uid).then((e) => {
      setPrivateAccount(!!e.privateAccount);
      setAllowLocation(e.allowLocation !== false);
    });
  }, [uid]);

  return (
    <View style={styles.screen}>
      <SubHeader title={t('settings.privacySettings')} onBack={onBack} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <ToggleRow
            first
            label={t('privacy.privateAccount')}
            value={privateAccount}
            onChange={(v) => {
              setPrivateAccount(v);
              saveProfileExtras(uid, { privateAccount: v });
            }}
          />
          <ToggleRow
            label={t('privacy.allowLocation')}
            value={allowLocation}
            onChange={(v) => {
              setAllowLocation(v);
              saveProfileExtras(uid, { allowLocation: v });
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray[100] },
});
