import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
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
import { getProfile, updateProfile, UserProfile } from '../../api/profile';
import { loadProfileExtras, saveProfileExtras } from '../../utils/profileExtras';
import { AVATAR_SOURCE } from '../../assets/onboardingIcons';
import { Card, IconButton, InfoRow, SectionTitle } from '../../components/profile/ProfileUI';
import {
  InterestChipList,
  MAX_INTERESTS,
  PREDEFINED_INTERESTS,
} from '../../components/profile/InterestChips';
import { AddInterestModal } from '../../components/profile/AddInterestModal';
import { ErrorToast } from '../../components/profile/ErrorToast';
import { DatePickerDialog, parseIsoDate } from '../../components/profile/DatePickerDialog';

// Figma "Profile for Aug release" (section 12276:93796) — Profile_Default /
// Profile_Edit / Profile_DatePicker / Profile_AddingInterests / MaxInterests.
//
// Common logic (design annotation): existing design-system components, the
// design's spacing/typography, onboarding answers shown as the default profile
// values, exact destination frames per interaction.
//
// Data:
//   • GET /api/v1/profile/{uid}   → @username, email, name, personalization
//     { description (bio), interests, birthday }  — the same contract the web
//     Profile page uses (PATCH is a partial multipart update)
//   • GET /api/v1/onboarding/{uid} → the Preferences card (visit status, travel
//     companion, role, stay duration, destination area, interests)
// Edit state (pencil → check): name / birthday / bio editable in place; check
// PATCHes what changed; hardware back discards. Interests toggle any time
// (max 5 → red toast); "+ Add more" opens the custom-interest modal.

type Props = { onOpenSettings: () => void };

type Draft = { name: string; bio: string; birthday: string | null };

const optionLabel = (q: OnboardingQuestion, id?: string) =>
  q.options.find((o) => o.id === id)?.label;

export function ProfileMain({ onOpenSettings }: Props) {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const uid = user?.id ?? 'anon';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({ name: '', bio: '', birthday: null });
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const interestsRef = useRef(interests);
  interestsRef.current = interests;

  // ── Load ───────────────────────────────────────────────────────────────────
  const hydrate = useCallback(
    (p: UserProfile | null, localBirthday?: string | null) => {
      setProfile(p);
      const pers = p?.personalization ?? {};
      const list = (pers.interests ?? []).map((s) => s.trim()).filter(Boolean);
      setInterests(list);
      setCustomInterests(list.filter((i) => !(PREDEFINED_INTERESTS as readonly string[]).includes(i)));
      setDraft({
        name: p?.name ?? user?.name ?? '',
        bio: pers.description ?? '',
        birthday: p?.about?.birthday ?? localBirthday ?? null,
      });
    },
    [user?.name],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, extras] = await Promise.all([
        getProfile().catch((e) => {
          console.warn('[Profile] getProfile failed', e?.message ?? e);
          return null;
        }),
        loadProfileExtras(uid),
      ]);
      if (!alive) return;
      hydrate(p, extras.birthday ?? null);
      setLoading(false);
    })();
    getOnboarding()
      .then((rec) => {
        if (alive && rec) setAnswers(recordToAnswers(rec));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uid, hydrate]);

  // Hardware back in edit mode discards (annotation: "Cancel/back → discard").
  useEffect(() => {
    if (!editing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelEdit();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, profile]);

  const cancelEdit = () => {
    hydrate(profile, draft.birthday);
    setEditing(false);
  };

  // ── Persist ────────────────────────────────────────────────────────────────
  const persist = useCallback(
    async (fields: { name?: string; personalization?: { description: string; interests: string[] }; about?: { birthday: string | null } }) => {
      const updated = await updateProfile(fields);
      setProfile(updated);
      if (fields.about) {
        // Local mirror — display fallback if an older server ignores `about`.
        saveProfileExtras(uid, { birthday: fields.about.birthday ?? undefined });
      }
      refreshProfile().catch(() => {});
      return updated;
    },
    [uid, refreshProfile],
  );

  const personalizationBlock = (list: string[], d: Draft) => ({
    description: d.bio.trim(),
    interests: list,
  });

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const fields: Parameters<typeof persist>[0] = {};
      const name = draft.name.trim();
      if (name && name !== (profile?.name ?? '')) fields.name = name;
      const pers = profile?.personalization ?? {};
      const persChanged =
        draft.bio.trim() !== (pers.description ?? '') ||
        interests.length !== (pers.interests ?? []).length ||
        interests.some((i) => !(pers.interests ?? []).includes(i));
      if (persChanged) fields.personalization = personalizationBlock(interests, draft);
      if ((draft.birthday ?? null) !== (profile?.about?.birthday ?? null)) {
        fields.about = { birthday: draft.birthday };
      }
      if (Object.keys(fields).length) await persist(fields);
      setEditing(false);
    } catch (e: any) {
      console.warn('[Profile] save failed', e?.message ?? e);
      setToast(t('profile.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // Interests: toggle any time; outside edit mode the change is written straight away.
  const applyInterests = (next: string[]) => {
    setInterests(next);
    if (!editing) {
      persist({ personalization: personalizationBlock(next, draft) }).catch((e) => {
        console.warn('[Profile] interests save failed', e?.message ?? e);
        setToast(t('profile.saveFailed'));
      });
    }
  };

  const toggleInterest = (name: string) => {
    const cur = interestsRef.current;
    if (cur.includes(name)) {
      applyInterests(cur.filter((i) => i !== name));
      return;
    }
    if (cur.length >= MAX_INTERESTS) {
      setToast(t('profile.maxInterests', { count: MAX_INTERESTS }));
      return;
    }
    applyInterests([...cur, name]);
  };

  const openAddInterest = () => {
    // Annotation: at the cap, "+ Add more" shows the MaxInterests alert instead.
    if (interestsRef.current.length >= MAX_INTERESTS) {
      setToast(t('profile.maxInterests', { count: MAX_INTERESTS }));
      return;
    }
    setAddOpen(true);
  };

  const addCustomInterest = (raw: string) => {
    const name = raw.trim();
    setAddOpen(false);
    if (!name) return;
    const all = [...(PREDEFINED_INTERESTS as readonly string[]), ...customInterests];
    const existing = all.find((i) => i.toLowerCase() === name.toLowerCase());
    const final = existing ?? name;
    if (!existing) setCustomInterests((c) => [...c, final]);
    if (!interestsRef.current.includes(final)) toggleInterest(final);
  };

  // ── Derived labels ─────────────────────────────────────────────────────────
  const purposeId = answers.purpose?.[0];
  const visitLabel =
    purposeId === 'planning_trip'
      ? t('profile.visit.planning')
      : purposeId === 'already_here'
        ? t('profile.visit.inKorea')
        : purposeId === 'just_exploring'
          ? t('profile.visit.exploring')
          : undefined;
  const companionLabel = optionLabel(TRAVELING_WITH_QUESTION, answers.traveling_with?.[0]);
  const roleLabel = optionLabel(OCCUPATION_QUESTION, answers.occupation?.[0]);
  const durationLabel =
    optionLabel(STAY_LENGTH_QUESTION, answers.stay_length?.[0]) ??
    optionLabel(STAY_LENGTH_DE_QUESTION, answers.stay_length_de?.[0]);
  const destinationLabel = (answers.destinations ?? [])
    .map((d) => optionLabel(DESTINATIONS_QUESTION, d))
    .filter(Boolean)
    .join(', ');
  const onboardingInterests = (answers.interests ?? [])
    .map((i) => optionLabel(INTERESTS_QUESTION, i))
    .filter(Boolean)
    .join(', ');

  const birthdayLabel = useMemo(() => {
    const d = parseIsoDate(draft.birthday);
    if (!d) return '';
    const date = new Date(d.y, d.m, d.d);
    try {
      return new Intl.DateTimeFormat(language.voiceLocale, { month: 'long', day: 'numeric' }).format(date);
    } catch {
      return `${d.m + 1}/${d.d}`;
    }
  }, [draft.birthday, language.voiceLocale]);

  const allInterestChips = [...(PREDEFINED_INTERESTS as readonly string[]), ...customInterests];
  const username = profile?.username || user?.name || '';
  const email = profile?.email || user?.email || '';
  const photo = profile?.profile_pic || user?.photo || null;

  const prefRows: { key: string; label: string; value?: string }[] = [
    { key: 'visit', label: t('profile.prefs.visitStatus'), value: visitLabel },
    { key: 'companion', label: t('profile.prefs.travelCompanion'), value: companionLabel },
    { key: 'role', label: t('profile.prefs.role'), value: roleLabel },
    { key: 'duration', label: t('profile.prefs.stayDuration'), value: durationLabel },
    { key: 'destination', label: t('profile.prefs.destinationArea'), value: destinationLabel || undefined },
    { key: 'interests', label: t('profile.prefs.interests'), value: onboardingInterests || undefined },
  ];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header: "Profile" 35/ExtraBold + Edit|Check + Settings (Google icons). */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <View style={styles.headerIcons}>
          {saving ? (
            <View style={styles.iconSlot}>
              <ActivityIndicator color={colors.blue[500]} />
            </View>
          ) : (
            <IconButton icon={editing ? 'check' : 'edit'} onPress={editing ? save : () => setEditing(true)} />
          )}
          <IconButton icon="settings" onPress={onOpenSettings} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Identity card: 100px avatar, @username, email. */}
        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            <Image source={photo ? { uri: photo } : AVATAR_SOURCE} style={styles.avatar} resizeMode="cover" />
          </View>
          <Text style={styles.username} numberOfLines={1}>
            @{username}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {email || t('profileMain.noEmail')}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.blue[500]} />
          </View>
        ) : (
          <>
            {/* About */}
            <View style={styles.section}>
              <SectionTitle style={styles.sectionTitlePad}>{t('profile.about')}</SectionTitle>
              <Card>
                <InfoRow
                  label={t('profile.fields.name')}
                  value={draft.name}
                  placeholder={t('profile.fields.namePlaceholder')}
                  editable={editing}
                  onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                />
                <InfoRow
                  label={t('profile.fields.birthday')}
                  value={birthdayLabel}
                  placeholder={t('profile.fields.birthdayPlaceholder')}
                  rightIcon="calendar-today"
                  onPress={editing ? () => setDateOpen(true) : undefined}
                  onRightIconPress={editing ? () => setDateOpen(true) : undefined}
                />
                <InfoRow
                  label={t('profile.fields.bio')}
                  value={draft.bio}
                  placeholder={t('profile.fields.bioPlaceholder')}
                  editable={editing}
                  multiline
                  onChangeText={(v) => setDraft((d) => ({ ...d, bio: v }))}
                  last
                />
              </Card>
            </View>

            {/* Preferences — onboarding answers. */}
            <View style={styles.section}>
              <SectionTitle>{t('profile.preferences')}</SectionTitle>
              <Card>
                {prefRows.map((row, i) => (
                  <InfoRow
                    key={row.key}
                    label={row.label}
                    value={row.value}
                    placeholder={t('profile.notSet')}
                    last={i === prefRows.length - 1}
                  />
                ))}
              </Card>
            </View>

            {/* Interests chips. */}
            <View style={styles.section}>
              <SectionTitle>{t('profile.interests')}</SectionTitle>
              <InterestChipList
                interests={allInterestChips}
                selected={interests}
                onToggle={toggleInterest}
                onAddMore={openAddInterest}
                addMoreLabel={t('profile.addMore')}
              />
            </View>
          </>
        )}
      </ScrollView>

      <AddInterestModal visible={addOpen} onClose={() => setAddOpen(false)} onAdd={addCustomInterest} />
      <DatePickerDialog
        visible={dateOpen}
        value={draft.birthday}
        onClose={() => setDateOpen(false)}
        onSelect={(iso) => {
          setDraft((d) => ({ ...d, birthday: iso }));
          setDateOpen(false);
        }}
      />
      <ErrorToast visible={toast != null} message={toast ?? ''} onHide={() => setToast(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    marginTop: spacing[4],
    marginBottom: spacing[6],
    paddingHorizontal: spacing[5],
  },
  headerTitle: {
    fontFamily: 'NationalPark_800ExtraBold',
    fontSize: 35,
    lineHeight: 44,
    letterSpacing: -1.4,
    color: colors.text.primary,
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  iconSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[24], gap: spacing[6] },
  identity: { alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], gap: spacing[1] },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  avatar: { width: 100, height: 100, borderRadius: 999 },
  username: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: '#111827',
  },
  // Figma contact-info (12276:94319): Inter Medium 14 — deliberately not the
  // brand font, matching the design and the website's identity card.
  email: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 18,
    color: '#6b7280',
    paddingVertical: spacing[1],
  },
  loading: { paddingVertical: spacing[10], alignItems: 'center' },
  section: { gap: spacing[4] },
  sectionTitlePad: { paddingHorizontal: spacing[1] },
});
