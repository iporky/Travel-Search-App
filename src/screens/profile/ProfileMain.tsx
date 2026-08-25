import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { track } from '../../api/tracking';
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

// Figma "Profile for Aug release" (section 12276:93796, Aug revision) —
// Profile_Default 12322:53795 / Profile_BdaySelected 12322:54175 /
// Profile_AdddedInterests 12322:54538 / MaxInterests 12322:53205.
//
// Layout: header has ONLY the settings icon. Each section — About, Interests,
// Preferences — carries its own 44px pencil in its section header:
//   • About pencil → edit name / birthday / bio in place + change the avatar
//     (camera badge, immediate PATCH of just profile_picture, like the web
//     app's "Change avatar"); the check writes ONLY the fields that changed
//     versus the server copy (web Profile.js handleToggleEditMode parity).
//   • Interests pencil → chips become toggleable / "+ Add more" activates
//     (inert otherwise, same as the website); the check diffs and PATCHes
//     personalization as one {description, interests} blob.
//   • Preferences pencil → re-enters the onboarding questions flow
//     (restartPersonalizationFromQuestions), which PATCHes the onboarding
//     record itself.
// Hardware back while a section is editing discards that section's draft.
//
// Data: GET /api/v1/profile/{uid} (about.birthday first-class per the profile
// contract) + GET /api/v1/onboarding/{uid} for the Preferences card.

type Props = { onOpenSettings: () => void };

type Draft = { name: string; bio: string; birthday: string | null };

const optionLabel = (q: OnboardingQuestion, id?: string) =>
  q.options.find((o) => o.id === id)?.label;

export function ProfileMain({ onOpenSettings }: Props) {
  const { t } = useTranslation();
  const { user, refreshProfile, restartPersonalizationFromQuestions } = useAuth();
  const { language } = useLanguage();
  const uid = user?.id ?? 'anon';

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  // Per-section edit state (each section header owns a pencil ↔ check).
  const [aboutEditing, setAboutEditing] = useState(false);
  const [interestsEditing, setInterestsEditing] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const [draft, setDraft] = useState<Draft>({ name: '', bio: '', birthday: null });
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterests, setCustomInterests] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Avatar: locally-picked uri shown while the upload runs / until the server
  // URL comes back.
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  // Birthday mirror for servers that ignore `about` (display fallback).
  const [localBirthday, setLocalBirthday] = useState<string | null>(null);
  const interestsRef = useRef(interests);
  interestsRef.current = interests;

  // ── Load ───────────────────────────────────────────────────────────────────
  const resetAboutDraft = useCallback(
    (p: UserProfile | null, birthdayFallback: string | null) => {
      setDraft({
        name: p?.name ?? user?.name ?? '',
        bio: p?.personalization?.description ?? '',
        birthday: p?.about?.birthday ?? birthdayFallback,
      });
    },
    [user?.name],
  );

  const resetInterests = useCallback((p: UserProfile | null) => {
    const list = (p?.personalization?.interests ?? []).map((s) => s.trim()).filter(Boolean);
    setInterests(list);
    setCustomInterests(list.filter((i) => !(PREDEFINED_INTERESTS as readonly string[]).includes(i)));
  }, []);

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
      const fallback = extras.birthday ?? null;
      setProfile(p);
      setLocalBirthday(fallback);
      resetAboutDraft(p, fallback);
      resetInterests(p);
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
  }, [uid, resetAboutDraft, resetInterests]);

  // Hardware back while editing discards the active section's draft.
  useEffect(() => {
    if (!aboutEditing && !interestsEditing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (aboutEditing) cancelAbout();
      if (interestsEditing) cancelInterests();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aboutEditing, interestsEditing, profile, localBirthday]);

  const cancelAbout = () => {
    resetAboutDraft(profile, localBirthday);
    setAboutEditing(false);
  };

  const cancelInterests = () => {
    resetInterests(profile);
    setInterestsEditing(false);
  };

  // ── Persist (PATCH only what changed — web Profile.js parity) ──────────────
  const persist = useCallback(
    async (fields: {
      name?: string;
      personalization?: { description: string; interests: string[] };
      about?: { birthday: string | null };
      photoUri?: string;
    }) => {
      const updated = await updateProfile(fields);
      setProfile(updated);
      if (fields.about) {
        // Local mirror — display fallback if an older server ignores `about`.
        const b = fields.about.birthday ?? undefined;
        saveProfileExtras(uid, { birthday: b });
        setLocalBirthday(fields.about.birthday);
      }
      refreshProfile().catch(() => {});
      return updated;
    },
    [uid, refreshProfile],
  );

  const savedPersonalization = () => profile?.personalization ?? {};

  // About check: name / bio / birthday — only fields that moved go out. The
  // bio travels inside personalization, which the API takes as one blob, so
  // the SAVED interests ride along unchanged (never the staged ones — those
  // belong to the Interests section's own check).
  const saveAbout = async () => {
    if (savingAbout) return;
    const fields: Parameters<typeof persist>[0] = {};
    const name = draft.name.trim();
    if (name && name !== (profile?.name ?? '')) fields.name = name;
    const pers = savedPersonalization();
    if (draft.bio.trim() !== (pers.description ?? '')) {
      fields.personalization = {
        description: draft.bio.trim(),
        interests: (pers.interests ?? []).map((s) => s.trim()).filter(Boolean),
      };
    }
    if ((draft.birthday ?? null) !== (profile?.about?.birthday ?? localBirthday ?? null)) {
      fields.about = { birthday: draft.birthday };
    }
    if (!Object.keys(fields).length) {
      // Nothing moved — closing the editor is the whole action.
      setAboutEditing(false);
      return;
    }
    setSavingAbout(true);
    try {
      await persist(fields);
      // Tracking contract rows 7 / 8a — one event per edited field.
      if (fields.about) track.profileEdit('edit_profile_about', 'profile_birthday');
      if (fields.personalization) track.profileEdit('edit_profile_interests', 'profile_bio');
      setAboutEditing(false);
    } catch (e: any) {
      console.warn('[Profile] about save failed', e?.message ?? e);
      setToast(t('profile.saveFailed'));
    } finally {
      setSavingAbout(false);
    }
  };

  // Interests check: staged chips vs the server copy; description rides along
  // from the last-saved value so the blob never wipes it.
  const saveInterests = async () => {
    if (savingInterests) return;
    const pers = savedPersonalization();
    const saved = (pers.interests ?? []).map((s) => s.trim()).filter(Boolean);
    const staged = interestsRef.current;
    const changed =
      saved.length !== staged.length || staged.some((i) => !saved.includes(i));
    if (!changed) {
      setInterestsEditing(false);
      return;
    }
    setSavingInterests(true);
    try {
      await persist({
        personalization: { description: pers.description ?? '', interests: staged },
      });
      // Tracking contract row 8b.
      track.profileEdit('edit_profile_interests', 'profile_interests');
      setInterestsEditing(false);
    } catch (e: any) {
      console.warn('[Profile] interests save failed', e?.message ?? e);
      setToast(t('profile.saveFailed'));
    } finally {
      setSavingInterests(false);
    }
  };

  // ── Interests staging (only while the pencil is active) ────────────────────
  const toggleInterest = (name: string) => {
    const cur = interestsRef.current;
    if (cur.includes(name)) {
      setInterests(cur.filter((i) => i !== name));
      return;
    }
    if (cur.length >= MAX_INTERESTS) {
      setToast(t('profile.maxInterests', { count: MAX_INTERESTS }));
      return;
    }
    setInterests([...cur, name]);
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

  // ── Avatar (About edit mode only — website "Change avatar" parity) ─────────
  // The picked photo uploads immediately as its own PATCH { profile_picture },
  // exactly like the web app does on crop-complete; it is not staged behind
  // the About check.
  const launchPicker = async (mode: 'camera' | 'library') => {
    try {
      const result =
        mode === 'camera'
          ? await (async () => {
              const perm = await ImagePicker.requestCameraPermissionsAsync();
              if (!perm.granted) {
                Alert.alert(t('onboarding.cameraNeededTitle'), t('onboarding.cameraNeededBody'));
                return null;
              }
              return ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
            })()
          : // System photo picker — no media permission needed.
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });
      const uri = result && !result.canceled ? result.assets?.[0]?.uri : undefined;
      if (!uri) return;
      setPendingPhoto(uri);
      setAvatarBusy(true);
      try {
        await persist({ photoUri: uri });
        // Tracking contract row 12.
        track.profileEdit('edit_profile_photo', 'profile_photo');
      } catch (e: any) {
        console.warn('[Profile] avatar upload failed', e?.message ?? e);
        setPendingPhoto(null);
        setToast(t('profile.saveFailed'));
      } finally {
        setAvatarBusy(false);
      }
    } catch {
      Alert.alert(t('onboarding.photoFailedTitle'), t('onboarding.photoFailedBody'));
    }
  };

  const choosePhoto = () => {
    Alert.alert(t('onboarding.photoSheetTitle'), undefined, [
      { text: t('onboarding.takePhoto'), onPress: () => launchPicker('camera') },
      { text: t('onboarding.chooseFromLibrary'), onPress: () => launchPicker('library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
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
  const photo = pendingPhoto || profile?.profile_pic || user?.photo || null;

  const prefRows: { key: string; label: string; value?: string }[] = [
    { key: 'visit', label: t('profile.prefs.visitStatus'), value: visitLabel },
    { key: 'companion', label: t('profile.prefs.travelCompanion'), value: companionLabel },
    { key: 'role', label: t('profile.prefs.role'), value: roleLabel },
    { key: 'duration', label: t('profile.prefs.stayDuration'), value: durationLabel },
    { key: 'destination', label: t('profile.prefs.destinationArea'), value: destinationLabel || undefined },
    { key: 'interests', label: t('profile.prefs.interests'), value: onboardingInterests || undefined },
  ];

  // Section header: title + the section's own 44px pencil ↔ check (Figma
  // section-header, 48 tall, icon frame at the right edge).
  const sectionHeader = (
    title: string,
    opts: { editing?: boolean; busy?: boolean; onPress: () => void; padTitle?: boolean },
  ) => (
    <View style={styles.sectionHeader}>
      <SectionTitle style={opts.padTitle ? styles.sectionTitlePad : undefined}>{title}</SectionTitle>
      {opts.busy ? (
        <View style={styles.iconSlot}>
          <ActivityIndicator color={colors.blue[500]} />
        </View>
      ) : (
        <IconButton icon={opts.editing ? 'check' : 'edit'} onPress={opts.onPress} />
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header: "Profile" 35/ExtraBold + Settings only (per-section pencils below). */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
        <IconButton icon="settings" onPress={onOpenSettings} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Identity card: 100px avatar, @username, email. Camera badge while the
            About section is editing (website "Change avatar"). */}
        <View style={styles.identity}>
          <View style={styles.avatarBox}>
            <Pressable
              style={styles.avatarWrap}
              onPress={aboutEditing && !avatarBusy ? choosePhoto : undefined}
              disabled={!aboutEditing || avatarBusy}
            >
              <Image source={photo ? { uri: photo } : AVATAR_SOURCE} style={styles.avatar} resizeMode="cover" />
              {avatarBusy && (
                <View style={styles.avatarBusy}>
                  <ActivityIndicator color={colors.surface.default} />
                </View>
              )}
            </Pressable>
            {aboutEditing && (
              <Pressable style={styles.avatarBadge} hitSlop={8} onPress={choosePhoto} disabled={avatarBusy}>
                <MaterialIcons name="photo-camera" size={18} color={colors.surface.default} />
              </Pressable>
            )}
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
          <View style={styles.sections}>
            {/* About — profile API fields, own pencil ↔ check. */}
            <View style={styles.section}>
              {sectionHeader(t('profile.about'), {
                editing: aboutEditing,
                busy: savingAbout,
                onPress: aboutEditing ? saveAbout : () => setAboutEditing(true),
                padTitle: true,
              })}
              <Card>
                <InfoRow
                  label={t('profile.fields.name')}
                  value={draft.name}
                  placeholder={t('profile.fields.namePlaceholder')}
                  editable={aboutEditing}
                  onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                />
                <InfoRow
                  label={t('profile.fields.birthday')}
                  value={birthdayLabel}
                  placeholder={t('profile.fields.birthdayPlaceholder')}
                  rightIcon="calendar-today"
                  onPress={aboutEditing ? () => setDateOpen(true) : undefined}
                  onRightIconPress={aboutEditing ? () => setDateOpen(true) : undefined}
                />
                <InfoRow
                  label={t('profile.fields.bio')}
                  value={draft.bio}
                  placeholder={t('profile.fields.bioPlaceholder')}
                  editable={aboutEditing}
                  multiline
                  onChangeText={(v) => setDraft((d) => ({ ...d, bio: v }))}
                  last
                />
              </Card>
            </View>

            {/* Interests — chips in a white card; toggleable only while its
                pencil is active (website parity). */}
            <View style={styles.section}>
              {sectionHeader(t('profile.interests'), {
                editing: interestsEditing,
                busy: savingInterests,
                onPress: interestsEditing ? saveInterests : () => setInterestsEditing(true),
              })}
              <Card style={styles.interestsCard}>
                <InterestChipList
                  interests={allInterestChips}
                  selected={interests}
                  onToggle={toggleInterest}
                  onAddMore={openAddInterest}
                  addMoreLabel={t('profile.addMore')}
                  editable={interestsEditing}
                />
              </Card>
            </View>

            {/* Preferences — onboarding answers; its pencil re-enters the
                onboarding questions flow. */}
            <View style={styles.section}>
              {sectionHeader(t('profile.preferences'), {
                onPress: () => restartPersonalizationFromQuestions(),
              })}
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
          </View>
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
  iconSlot: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[24], gap: spacing[6] },
  identity: { alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], gap: spacing[1] },
  avatarBox: { width: 100, height: 100, marginBottom: spacing[2] },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 999,
    backgroundColor: colors.surface.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 100, height: 100, borderRadius: 999 },
  avatarBusy: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.blue[500],
    borderWidth: 2,
    borderColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: '#111827',
  },
  // Figma contact-info (12322:54193): Inter Medium 14 — deliberately not the
  // brand font, matching the design and the website's identity card.
  email: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    lineHeight: 18,
    color: '#6b7280',
    paddingVertical: spacing[1],
  },
  loading: { paddingVertical: spacing[10], alignItems: 'center' },
  // Figma Container 12322:54195: sections stack with a 32px gap; each section
  // is its 48px header immediately followed by the card.
  sections: { gap: spacing[8] },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  sectionTitlePad: { paddingHorizontal: spacing[1] },
  // Interests card (12322:53992): #fefefe radius 16, px 20 / py 16.
  interestsCard: { paddingVertical: spacing[4] },
});
