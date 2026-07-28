import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, gradients, radius, shadows, spacing, typography } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageScreen } from './LanguageScreen';
import { ProfileSetupScreen } from './onboarding/ProfileSetupScreen';

export function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut, restartPersonalizationFromQuestions, saveProfile, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const [showLanguage, setShowLanguage] = useState(false);
  const [editing, setEditing] = useState(false);

  // Pull the latest backend profile (authoritative S3 photo) when the screen
  // opens, so the displayed avatar always reflects the uploaded picture.
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);
  const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'K';
  const stats = [
    { label: t('profile.stats.chats'), value: '128' },
    { label: t('profile.stats.saved'), value: '34' },
    { label: t('profile.stats.streak'), value: '7d' },
  ];

  const settings: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    action?: 'personalize' | 'language';
    value?: string;
  }[] = [
    { label: t('profile.menu.notifications'), icon: 'notifications-outline' },
    { label: t('profile.menu.appearance'), icon: 'color-palette-outline' },
    { label: t('profile.menu.language'), icon: 'language-outline', action: 'language', value: language.label },
    { label: t('profile.menu.personalize'), icon: 'sparkles-outline', action: 'personalize' },
    { label: t('profile.menu.privacy'), icon: 'lock-closed-outline' },
    { label: t('profile.menu.help'), icon: 'help-circle-outline' },
  ];

  const handlePress = (action?: 'personalize' | 'language') => {
    if (action === 'personalize') restartPersonalizationFromQuestions();
    else if (action === 'language') setShowLanguage(true);
  };

  // Open the name/photo editor, pulling the freshest backend profile first so
  // the editor is seeded with the current uploaded photo.
  const openEditor = () => {
    refreshProfile();
    setEditing(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient
        colors={gradients.surfaceAccentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Pressable style={styles.avatar} onPress={openEditor} hitSlop={6}>
          {user?.photo ? (
            <Image source={{ uri: user.photo }} style={styles.avatarImg} />
          ) : (
            <Text style={[typography.heading32Medium, { color: colors.text.onDark }]}>{initials}</Text>
          )}
        </Pressable>
        {/* Tap the name banner to edit username + photo */}
        <Pressable style={styles.nameRow} onPress={openEditor} hitSlop={8}>
          <Text style={[typography.body16Medium, { color: colors.text.onDark }]}>{user?.name ?? 'Konnect User'}</Text>
          <Ionicons name="pencil" size={14} color={colors.text.onDark} style={styles.editPencil} />
        </Pressable>
        <Text style={[typography.caption12Medium, { color: colors.text.onDark, opacity: 0.8 }]}>
          {user?.email ?? 'user@konnect.app'}
        </Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[typography.body16Medium, { color: colors.text.primary }]}>{s.value}</Text>
            <Text style={[typography.caption12Medium, { color: colors.text.disabled }]}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[typography.body14Semibold, styles.sectionLabel]}>{t('profile.settings')}</Text>
      <View style={styles.settingsGroup}>
        {settings.map((s, i) => (
          <TouchableOpacity
            key={s.label}
            activeOpacity={0.75}
            onPress={() => handlePress(s.action)}
            style={[styles.settingRow, i < settings.length - 1 && styles.divider]}
          >
            <Ionicons name={s.icon} size={20} color={colors.icon.accent} />
            <Text style={[typography.body16Regular, { flex: 1, color: colors.text.primary }]}>
              {s.label}
            </Text>
            {s.value ? (
              <Text style={[typography.body14Medium, { color: colors.text.disabled, marginRight: spacing[1] }]}>
                {s.value}
              </Text>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.icon.disabled} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.8} onPress={signOut}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>{t('profile.logout')}</Text>
      </TouchableOpacity>

      <LanguageScreen visible={showLanguage} onClose={() => setShowLanguage(false)} />

      {/* Edit username + profile photo (reuses the onboarding profile screen). */}
      <Modal visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}>
        <SafeAreaView style={styles.editSheet} edges={['top', 'left', 'right']}>
          <ProfileSetupScreen
            editMode
            progress={1}
            initialValue={(user?.name ?? '').replace(/[^A-Za-z0-9._]/g, '')}
            initialPhotoUrl={user?.photo ?? null}
            onBack={() => setEditing(false)}
            onConfirm={async (username, photoUri) => {
              try {
                await saveProfile({ name: username, photoUri: photoUri ?? undefined });
              } catch (e) {
                console.warn('[Profile] save failed', e);
              }
              setEditing(false);
            }}
          />
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing[5], paddingBottom: spacing[16] },
  hero: {
    borderRadius: radius['3xl'],
    padding: spacing[6],
    alignItems: 'center',
    gap: spacing[2],
    ...shadows.cardDefault,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.blue[700],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  editPencil: { opacity: 0.9, marginLeft: 4 },
  editSheet: { flex: 1, backgroundColor: '#fff' },
  statsRow: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[5] },
  statCard: {
    flex: 1,
    padding: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    gap: spacing[1],
    ...shadows.cardDefault,
  },
  sectionLabel: {
    color: colors.text.primary,
    marginTop: spacing[6],
    marginBottom: spacing[3],
  },
  settingsGroup: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.xl,
    ...shadows.cardDefault,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    gap: spacing[3],
  },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surface.subtle },
  avatarImg: { width: 72, height: 72, borderRadius: radius.full },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[6],
    padding: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    color: '#ef4444',
  },
});
