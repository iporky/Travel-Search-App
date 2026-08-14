import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import auth from '@react-native-firebase/auth';
import { colors, radius, spacing } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProfileSetupScreen } from '../onboarding/ProfileSetupScreen';
import {
  getOnboarding,
  recordToAnswers,
  INTERESTS_QUESTION,
  OCCUPATION_QUESTION,
  TRAVELING_WITH_QUESTION,
  STAY_LENGTH_QUESTION,
  STAY_LENGTH_DE_QUESTION,
  DESTINATIONS_QUESTION,
  OnboardingQuestion,
} from '../../api/onboarding';
import {
  loadProfileExtras,
  ProfileExtras,
  saveProfileExtras,
} from '../../utils/profileExtras';
import { EditFieldModal } from '../../components/profile/EditFieldModal';
import { P } from '../../components/profile/ProfileUI';

// Figma: kiki-ai-profile-redesign (10978:93429).
// Top bar (Profile + private toggle + settings) → identity card → completion
// card → About → What I like → Preferences → Travel Profile → Looking For.

type Props = {
  onOpenSettings: () => void;
  onStartVerify: (mode: 'phone' | 'email') => void;
};

type EditTarget =
  | 'bio'
  | 'birthday'
  | 'nationality'
  | 'backupEmail'
  | 'food'
  | 'budget'
  | 'stay'
  | 'lookingFor'
  | null;

const optionLabel = (q: OnboardingQuestion, id?: string) =>
  q.options.find((o) => o.id === id)?.label;

export function ProfileMain({ onOpenSettings, onStartVerify }: Props) {
  const { t } = useTranslation();
  const { user, restartPersonalizationFromQuestions, saveProfile, refreshProfile } = useAuth();
  const { language } = useLanguage();

  const [editingIdentity, setEditingIdentity] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [extras, setExtras] = useState<ProfileExtras>({});
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const uid = user?.id ?? 'anon';

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    loadProfileExtras(uid).then(setExtras);
  }, [uid]);

  // Onboarding answers feed the AI-personalization sections.
  useEffect(() => {
    getOnboarding()
      .then((rec) => {
        if (rec) setAnswers(recordToAnswers(rec));
      })
      .catch(() => {});
  }, []);

  const patchExtras = useCallback(
    (patch: Partial<ProfileExtras>) => {
      setExtras((cur) => ({ ...cur, ...patch }));
      saveProfileExtras(uid, patch);
    },
    [uid],
  );

  const fbUser = auth().currentUser;
  const memberSinceYear = useMemo(() => {
    const ts = fbUser?.metadata?.creationTime;
    return ts ? new Date(ts).getFullYear() : new Date().getFullYear();
  }, [fbUser]);
  const emailVerified = fbUser?.emailVerified ?? false;

  const purposeId = answers.purpose?.[0];
  const statusLabel =
    purposeId === 'already_here'
      ? t('profileMain.status.inKorea')
      : purposeId === 'planning_trip'
        ? t('profileMain.status.planning')
        : purposeId === 'just_exploring'
          ? t('profileMain.status.exploring')
          : undefined;
  const occupationLabel = optionLabel(OCCUPATION_QUESTION, answers.occupation?.[0]);
  const companionLabel = optionLabel(TRAVELING_WITH_QUESTION, answers.traveling_with?.[0]);
  const durationLabel =
    optionLabel(STAY_LENGTH_QUESTION, answers.stay_length?.[0]) ??
    optionLabel(STAY_LENGTH_DE_QUESTION, answers.stay_length_de?.[0]);
  const regionLabels = (answers.destinations ?? [])
    .map((d) => optionLabel(DESTINATIONS_QUESTION, d))
    .filter(Boolean)
    .join(', ');
  const interestLabels = (answers.interests ?? [])
    .map((i) => optionLabel(INTERESTS_QUESTION, i))
    .filter((v): v is string => !!v);

  const lookingFor = extras.lookingFor ?? [];

  // Profile completion — mandatory + account + optional personalization fields.
  const completion = useMemo(() => {
    const checks: boolean[] = [
      !!user?.photo,
      !!user?.name,
      !!user?.email,
      !!extras.phone,
      !!extras.bio,
      !!extras.birthday,
      !!extras.nationality,
      !!purposeId,
      !!occupationLabel || !!companionLabel,
      !!durationLabel,
      interestLabels.length > 0,
      !!extras.preferences?.food,
      !!extras.preferences?.budget,
      !!extras.preferences?.stay,
      lookingFor.length > 0,
    ];
    const done = checks.filter(Boolean).length;
    return Math.round((done / checks.length) * 100);
  }, [
    user,
    extras,
    purposeId,
    occupationLabel,
    companionLabel,
    durationLabel,
    interestLabels.length,
    lookingFor.length,
  ]);

  const maskedPhone = extras.phone
    ? extras.phone.replace(/\d(?=\d{4})/g, '•').replace(/(•{3})(?=•)/g, '$1 ')
    : null;

  const editConfig: Record<
    Exclude<EditTarget, null>,
    { title: string; placeholder: string; initial?: string; multiline?: boolean }
  > = {
    bio: {
      title: t('profileMain.editBio'),
      placeholder: t('profileMain.bioPlaceholder'),
      initial: extras.bio,
      multiline: true,
    },
    birthday: {
      title: t('profileMain.about.birthday'),
      placeholder: 'YYYY-MM-DD',
      initial: extras.birthday,
    },
    nationality: {
      title: t('profileMain.travel.nationality'),
      placeholder: t('profileMain.travel.nationalityPlaceholder'),
      initial: extras.nationality,
    },
    backupEmail: {
      title: t('profileMain.addBackupEmail'),
      placeholder: 'name@example.com',
      initial: extras.backupEmail,
    },
    food: {
      title: t('profileMain.prefs.food'),
      placeholder: t('profileMain.prefs.foodPlaceholder'),
      initial: extras.preferences?.food,
    },
    budget: {
      title: t('profileMain.prefs.budget'),
      placeholder: t('profileMain.prefs.budgetPlaceholder'),
      initial: extras.preferences?.budget,
    },
    stay: {
      title: t('profileMain.prefs.stay'),
      placeholder: t('profileMain.prefs.stayPlaceholder'),
      initial: extras.preferences?.stay,
    },
    lookingFor: {
      title: t('profileMain.addLookingFor'),
      placeholder: t('profileMain.lookingForPlaceholder'),
    },
  };

  const onSaveEdit = (value: string) => {
    if (!editTarget) return;
    if (editTarget === 'bio') patchExtras({ bio: value || undefined });
    else if (editTarget === 'birthday') patchExtras({ birthday: value || undefined });
    else if (editTarget === 'nationality') patchExtras({ nationality: value || undefined });
    else if (editTarget === 'backupEmail') patchExtras({ backupEmail: value || undefined });
    else if (editTarget === 'lookingFor') {
      if (value) patchExtras({ lookingFor: [...lookingFor, value] });
    } else {
      patchExtras({ preferences: { ...extras.preferences, [editTarget]: value || undefined } });
    }
    setEditTarget(null);
  };

  const initials = user?.name ? user.name.charAt(0).toUpperCase() : 'K';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top app bar: title + PRIVATE toggle + settings gear */}
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>{t('profileMain.title')}</Text>
          <View style={styles.topActions}>
            <View style={styles.privacyToggle}>
              <Text style={styles.privateLabel}>{t('profileMain.private')}</Text>
              <Switch
                value={!!extras.privateAccount}
                onValueChange={(v) => patchExtras({ privateAccount: v })}
                trackColor={{ false: '#e5e7eb', true: P.dark }}
                thumbColor="#ffffff"
              />
            </View>
            <Pressable style={styles.settingsBtn} hitSlop={6} onPress={onOpenSettings}>
              <Ionicons name="settings-outline" size={18} color={P.textDark} />
            </Pressable>
          </View>
        </View>

        {/* Identity card */}
        <View style={styles.card}>
          <View style={styles.avatarSection}>
            <Pressable style={styles.avatarWrap} onPress={() => setEditingIdentity(true)}>
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{initials}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="pencil" size={12} color="#ffffff" />
              </View>
            </Pressable>
            <Pressable style={styles.nameRow} onPress={() => setEditingIdentity(true)}>
              <Text style={styles.username}>@{user?.name ?? 'konnect'}</Text>
              <Ionicons name="pencil-outline" size={18} color={P.textMuted} />
            </Pressable>
            <Text style={styles.memberSince}>
              {t('profileMain.activeSince', { year: memberSinceYear })}
            </Text>
          </View>

          <View style={styles.contactList}>
            <View style={styles.contactRow}>
              <View style={styles.contactLeft}>
                <Ionicons name="mail-outline" size={16} color={P.textMuted} />
                <Text style={styles.contactText} numberOfLines={1}>
                  {user?.email || t('profileMain.noEmail')}
                </Text>
                {emailVerified && (
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                )}
              </View>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  user?.email ? setEditTarget('backupEmail') : onStartVerify('email')
                }
              >
                <Ionicons name="add" size={22} color={P.textDark} />
              </Pressable>
            </View>
            {extras.backupEmail ? (
              <View style={styles.contactRow}>
                <View style={styles.contactLeft}>
                  <Ionicons name="mail-outline" size={16} color={P.textMuted} />
                  <Text style={styles.contactText} numberOfLines={1}>
                    {extras.backupEmail}
                  </Text>
                </View>
              </View>
            ) : null}
            <View style={styles.contactRow}>
              <View style={styles.contactLeft}>
                <Ionicons name="call-outline" size={16} color={P.textMuted} />
                {maskedPhone ? (
                  <>
                    <Text style={styles.contactText}>{maskedPhone}</Text>
                    {extras.phoneVerified && (
                      <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                    )}
                  </>
                ) : (
                  <Pressable onPress={() => onStartVerify('phone')}>
                    <Text style={styles.addLink}>{t('profileMain.addPhone')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          <Pressable style={styles.bioBox} onPress={() => setEditTarget('bio')}>
            <Text style={styles.bioLabel}>{t('profileMain.bio')}</Text>
            <Text style={extras.bio ? styles.bioText : styles.bioPlaceholder}>
              {extras.bio || t('profileMain.bioEmpty')}
            </Text>
          </Pressable>
        </View>

        {/* Completion card */}
        <View style={[styles.card, styles.completionCard]}>
          <Text style={styles.completionLabel}>
            {t('profileMain.completion', { pct: completion })}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completion}%` }]} />
          </View>
          <Text style={styles.completionHint}>{t('profileMain.completionHint')}</Text>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profileMain.about.title')}</Text>
          </View>
          <View style={styles.detailCard}>
            <DetailRow
              label={t('profileMain.about.currentStatus')}
              value={statusLabel}
              first
              onPress={restartPersonalizationFromQuestions}
            />
            <DetailRow
              label={t('profileMain.about.birthday')}
              value={extras.birthday}
              onPress={() => setEditTarget('birthday')}
            />
            <DetailRow
              label={t('profileMain.about.occupation')}
              value={occupationLabel}
              onPress={restartPersonalizationFromQuestions}
            />
          </View>
        </View>

        {/* What I like */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profileMain.whatILike')}</Text>
            <Pressable hitSlop={8} onPress={restartPersonalizationFromQuestions}>
              <Ionicons name="pencil-outline" size={16} color={P.textMuted} />
            </Pressable>
          </View>
          <View style={styles.pillWrap}>
            {interestLabels.length === 0 ? (
              <Text style={styles.emptyHint}>{t('profileMain.emptySection')}</Text>
            ) : (
              interestLabels.map((label) => (
                <View key={label} style={styles.pill}>
                  <Text style={styles.pillText}>{label}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profileMain.prefs.title')}</Text>
            <Pressable style={styles.addBtn} onPress={() => setEditTarget('food')}>
              <Ionicons name="add" size={12} color={P.textDark} />
              <Text style={styles.addBtnText}>{t('profileMain.add')}</Text>
            </Pressable>
          </View>
          <View style={styles.detailCard}>
            <DetailRow
              label={t('profileMain.prefs.food')}
              value={extras.preferences?.food}
              first
              onPress={() => setEditTarget('food')}
            />
            <DetailRow
              label={t('profileMain.prefs.budget')}
              value={extras.preferences?.budget}
              onPress={() => setEditTarget('budget')}
            />
            <DetailRow
              label={t('profileMain.prefs.stay')}
              value={extras.preferences?.stay}
              onPress={() => setEditTarget('stay')}
            />
          </View>
        </View>

        {/* Travel Profile (AI engine) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profileMain.travel.title')}</Text>
            <Pressable hitSlop={8} onPress={restartPersonalizationFromQuestions}>
              <Ionicons name="pencil-outline" size={16} color={P.textMuted} />
            </Pressable>
          </View>
          <View style={styles.detailCard}>
            <DetailRow
              label={t('profileMain.travel.purpose')}
              value={statusLabel}
              first
              onPress={restartPersonalizationFromQuestions}
            />
            <DetailRow
              label={t('profileMain.travel.companion')}
              value={companionLabel}
              onPress={restartPersonalizationFromQuestions}
            />
            <DetailRow
              label={t('profileMain.travel.duration')}
              value={durationLabel}
              onPress={restartPersonalizationFromQuestions}
            />
            <DetailRow
              label={t('profileMain.travel.regions')}
              value={regionLabels || undefined}
              onPress={restartPersonalizationFromQuestions}
            />
            <DetailRow label={t('profileMain.travel.language')} value={language.label} />
            <DetailRow
              label={t('profileMain.travel.nationality')}
              value={extras.nationality}
              onPress={() => setEditTarget('nationality')}
            />
          </View>
        </View>

        {/* Looking For */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profileMain.lookingFor')}</Text>
          </View>
          <View style={styles.pillWrap}>
            {lookingFor.map((label) => (
              <Pressable
                key={label}
                style={styles.pill}
                onLongPress={() =>
                  patchExtras({ lookingFor: lookingFor.filter((l) => l !== label) })
                }
              >
                <Text style={styles.pillText}>{label}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.pill, styles.pillAdd]} onPress={() => setEditTarget('lookingFor')}>
              <Ionicons name="add" size={14} color={P.textMuted} />
              <Text style={[styles.pillText, { color: P.textMuted }]}>
                {t('profileMain.add')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Username + photo editor (existing onboarding editor, reused). */}
      <Modal
        visible={editingIdentity}
        animationType="slide"
        onRequestClose={() => setEditingIdentity(false)}
      >
        <SafeAreaView style={styles.editSheet} edges={['top', 'left', 'right']}>
          <ProfileSetupScreen
            editMode
            progress={1}
            initialValue={(user?.name ?? '').replace(/[^A-Za-z0-9._]/g, '')}
            initialPhotoUrl={user?.photo ?? null}
            onBack={() => setEditingIdentity(false)}
            onConfirm={async (username, photoUri) => {
              try {
                await saveProfile({ name: username, photoUri: photoUri ?? undefined });
              } catch (e) {
                console.warn('[Profile] save failed', e);
              }
              setEditingIdentity(false);
            }}
          />
        </SafeAreaView>
      </Modal>

      <EditFieldModal
        visible={editTarget != null}
        title={editTarget ? editConfig[editTarget].title : ''}
        placeholder={editTarget ? editConfig[editTarget].placeholder : undefined}
        initialValue={editTarget ? editConfig[editTarget].initial : undefined}
        multiline={editTarget ? editConfig[editTarget].multiline : false}
        onClose={() => setEditTarget(null)}
        onSave={onSaveEdit}
      />
    </View>
  );
}

function DetailRow({
  label,
  value,
  first,
  onPress,
}: {
  label: string;
  value?: string;
  first?: boolean;
  onPress?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      style={[styles.detailRow, !first && styles.detailDivider]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.detailLabel}>{label}</Text>
      {value ? (
        <Text style={styles.detailValue} numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Text style={styles.detailAdd}>{onPress ? t('profileMain.add') : '—'}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray[100] },
  content: { paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: 96, gap: spacing[5] },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  screenTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 22,
    color: P.textDark,
  },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  privacyToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  privateLabel: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    color: P.textMuted,
  },
  settingsBtn: {
    padding: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: colors.gray[100],
  },
  card: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    padding: spacing[6],
    gap: spacing[5],
  },
  avatarSection: { alignItems: 'center', gap: spacing[3] },
  avatarWrap: { width: 88, height: 88 },
  avatarImg: { width: 88, height: 88, borderRadius: radius.md },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: P.border,
    backgroundColor: P.well,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 34,
    color: P.textMuted,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: P.dark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  username: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    color: P.textDark,
  },
  memberSince: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: P.textMuted,
  },
  contactList: { gap: 10, paddingVertical: spacing[1] },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  contactText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    color: P.textMuted,
    flexShrink: 1,
  },
  addLink: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    color: colors.blue[500],
  },
  bioBox: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.sm,
    padding: spacing[4],
    gap: 6,
  },
  bioLabel: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: P.textMuted,
  },
  bioText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: P.textDark,
  },
  bioPlaceholder: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: P.textFaint,
  },
  completionCard: { padding: spacing[5], gap: spacing[2] },
  completionLabel: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: P.textMuted,
  },
  progressTrack: {
    height: 6,
    backgroundColor: P.well,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginTop: spacing[1],
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.blue[500],
    borderRadius: radius.full,
  },
  completionHint: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: P.textMuted,
    marginTop: spacing[2],
  },
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
  },
  sectionTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 18,
    color: P.textDark,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.gray[100],
  },
  addBtnText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    color: P.textDark,
  },
  detailCard: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingVertical: 14,
    gap: spacing[3],
  },
  detailDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.border },
  detailLabel: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: P.textMuted,
  },
  detailValue: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 15,
    color: P.textDark,
    flexShrink: 1,
    textAlign: 'right',
  },
  detailAdd: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    color: colors.blue[500],
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[1],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: 10,
    backgroundColor: colors.gray[100],
  },
  pillAdd: { borderStyle: 'dashed' },
  pillText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    color: P.textDark,
  },
  emptyHint: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 13,
    color: P.textFaint,
  },
  editSheet: { flex: 1, backgroundColor: '#fff' },
});
