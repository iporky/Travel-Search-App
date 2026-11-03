import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { PressableScale as Pressable } from '../../components/PressableScale';
import { useTranslation } from 'react-i18next';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '../../theme/tokens';
import { onboardingSource } from '../../assets/onboardingAssets';
import { PressableScale } from '../../components/PressableScale';
const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const DEFAULT_AVATAR = onboardingSource(
  require('../../../assets/mascot/bird-card.png') as ImageSourcePropType,
  'bird-card',
);

type Availability = 'idle' | 'checking' | 'available' | 'taken';

interface Props {
  onBack: () => void;
  onConfirm: (username: string, photoUri?: string | null) => void;
  initialValue?: string;
  initialPhotoUrl?: string | null;
  /** Reuse this screen from Profile as an editor: "Save" CTA. */
  editMode?: boolean;
  /** A name the backend rejected as taken, with the alternatives it offered. */
  takenUsername?: string | null;
  takenSuggestions?: string[];
}

function sanitizeUsername(value: string): string {
  return value
    .replace(/[^A-Za-z0-9._]/g, '')
    .slice(0, 20);
}

function generateSuggestions(base: string): string[] {
  const normalized = sanitizeUsername(base).replace(/^[^A-Za-z]+/, '');
  const stem = (normalized || 'traveler').slice(0, 12);
  const candidates = [
    `${stem}queen`,
    `${stem}7`,
    `${stem}${Math.floor(100 + Math.random() * 900)}`,
    `${stem}_kr`,
  ]
    .map((name) => name.slice(0, 20))
    .filter((name) => /^[A-Za-z][A-Za-z0-9._]{3,19}$/.test(name));

  return Array.from(new Set(candidates)).slice(0, 3);
}

/**
 * Whether the name is free.
 *
 * There is no endpoint that can answer this: the backend exposes no username
 * lookup or filter (checked against its OpenAPI schema — 68 routes, none for
 * usernames), and /api/v1/onboarding/{firebase_id} takes a Firebase id, so
 * probing it with a name returns 403 "not your profile" for *every* name,
 * free or not. Uniqueness is therefore only knowable where the backend
 * enforces it: the create call, which answers 409 with suggestions. The
 * parent feeds that verdict back in via `takenUsername`.
 *
 * When a real availability endpoint lands, call it here — the debounce and
 * the stale-response guard below are already wired for it.
 */
async function checkUsernameAvailability(_username: string): Promise<boolean> {
  return true;
}

export function ProfileSetupScreen({
  onBack,
  onConfirm,
  initialValue = '',
  initialPhotoUrl,
  editMode = false,
  takenUsername = null,
  takenSuggestions = [],
}: Props) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(initialValue);
  const [availability, setAvailability] = useState<Availability>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [photoFailed, setPhotoFailed] = useState(false);
  // A photo the user picked/took on this screen (overrides the provider photo).
  const [pickedPhoto, setPickedPhoto] = useState<string | null>(null);
  const requestSeq = useRef(0);

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
              return ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
              });
            })()
          : // System photo picker — no media permission needed (Play's
            // photo/video permissions policy: READ_MEDIA_IMAGES is not declared).
            await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.85,
            });

      if (result && !result.canceled && result.assets?.[0]?.uri) {
        setPickedPhoto(result.assets[0].uri);
        setPhotoFailed(false);
      }
    } catch (e) {
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

  const trimmed = username.trim();
  const ruleLength = trimmed.length >= 4 && trimmed.length <= 20;
  const ruleEnglishLettersAndNumbers = /^[A-Za-z0-9._]*$/.test(trimmed);
  const ruleNoSpecialExcept = !/[^A-Za-z0-9._]/.test(trimmed);
  const ruleStartsWithLetter = trimmed.length > 0 && /^[A-Za-z]/.test(trimmed);

  const allRulesPass =
    ruleLength &&
    ruleEnglishLettersAndNumbers &&
    ruleNoSpecialExcept &&
    ruleStartsWithLetter;

  const hasHardError =
    trimmed.length > 20 ||
    (!ruleEnglishLettersAndNumbers && trimmed.length > 0) ||
    (!ruleNoSpecialExcept && trimmed.length > 0) ||
    (!ruleStartsWithLetter && trimmed.length > 0);

  // Debounced availability check: every keystroke restarts the timer, so only
  // a pause in typing spends a request, and `requestSeq` drops any answer that
  // arrives after the user has typed on — otherwise a slow reply for an older
  // name could overwrite the verdict for the current one.
  useEffect(() => {
    if (!trimmed || !allRulesPass) {
      setAvailability('idle');
      setSuggestions([]);
      return;
    }

    requestSeq.current += 1;
    const currentReq = requestSeq.current;
    setAvailability('checking');

    // A name the create call already rejected stays flagged until it is edited.
    if (takenUsername && trimmed.toLowerCase() === takenUsername.toLowerCase()) {
      setAvailability('taken');
      setSuggestions(takenSuggestions.length ? takenSuggestions : generateSuggestions(trimmed));
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const free = await checkUsernameAvailability(trimmed);
        if (requestSeq.current !== currentReq) return;
        if (free) {
          setAvailability('available');
          setSuggestions([]);
        } else {
          setAvailability('taken');
          setSuggestions(generateSuggestions(trimmed));
        }
      } catch {
        if (requestSeq.current !== currentReq) return;
        setAvailability('idle');
      }
      // 400ms rather than the 240 the local mock used: this is a round trip
      // now, and it keeps a fast typist from firing a request per character.
    }, 400);

    return () => clearTimeout(timer);
  }, [trimmed, allRulesPass, takenUsername, takenSuggestions]);

  const inputBorderColor = useMemo(() => {
    if (!trimmed) return 'transparent';
    if (availability === 'taken' || hasHardError) return colors.red[100];
    if (availability === 'available') return colors.blue[600];
    return colors.blue[500];
  }, [trimmed, availability, hasHardError]);

  const canConfirm = allRulesPass && availability === 'available';

  return (
    <KeyboardStickyView style={styles.root}>
      <View style={styles.header}>
        <PressableScale onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={sx(20)} color={colors.icon.primary} />
        </PressableScale>
        <Text style={styles.headerTitle}>{editMode ? t('onboarding.editProfile') : t('onboarding.createProfile')}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.profileBlock}>
        {/* The badge is a sibling of the clipped circle, not a child: inside it
            the circle's overflow clip cut the badge's corner off. Same badge as
            the Profile page (blue, white camera, 2px surface ring). */}
        <View style={styles.avatarArea}>
          <PressableScale style={styles.avatarWrap} onPress={choosePhoto} hitSlop={8}>
            <Image
              source={
                pickedPhoto
                  ? { uri: pickedPhoto }
                  : initialPhotoUrl && !photoFailed
                  ? { uri: initialPhotoUrl }
                  : DEFAULT_AVATAR
              }
              style={styles.avatar}
              resizeMode="cover"
              onError={() => setPhotoFailed(true)}
            />
          </PressableScale>
          <PressableScale style={styles.cameraBadge} onPress={choosePhoto} hitSlop={8}>
            <MaterialIcons name="photo-camera" size={18} color={colors.surface.default} />
          </PressableScale>
        </View>

        <View style={[styles.inputWrap, { borderColor: inputBorderColor }]}> 
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder={t('onboarding.usernamePlaceholder')}
            placeholderTextColor={colors.gray[800]}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            style={styles.input}
          />

          {availability === 'checking' ? (
            <ActivityIndicator size="small" color={colors.blue[500]} style={styles.inputStateIcon} />
          ) : null}

          {availability === 'available' ? (
            <Ionicons
              name="checkmark-circle"
              size={sx(28)}
              color={colors.blue[500]}
              style={styles.inputStateIcon}
            />
          ) : null}

          {(availability === 'taken' || hasHardError) ? (
            <Ionicons
              name="close-circle"
              size={sx(28)}
              color={colors.red[100]}
              style={styles.inputStateIcon}
            />
          ) : null}
        </View>

        {availability === 'available' ? (
          <Text style={styles.availableText}>{t('onboarding.usernameAvailable')}</Text>
        ) : null}

        {(trimmed.length > 0 && availability !== 'taken' && availability !== 'available') ? (
          <View style={styles.rulesWrap}>
            <RuleItem ok={ruleLength} text={t('onboarding.usernameRules.length')} />
            <RuleItem ok={ruleEnglishLettersAndNumbers} text={t('onboarding.usernameRules.alphanumeric')} />
            <RuleItem ok={ruleNoSpecialExcept} text={t('onboarding.usernameRules.special')} />
            <RuleItem ok={ruleStartsWithLetter} text={t('onboarding.usernameRules.startsWithLetter')} />
          </View>
        ) : null}

        {availability === 'taken' ? (
          <View style={styles.takenWrap}>
            <Text style={styles.takenText}>{t('onboarding.usernameTaken')}</Text>
            <View style={styles.chipsRow}>
              {suggestions.map((s) => (
                <PressableScale key={s} onPress={() => setUsername(s)} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </PressableScale>
              ))}
            </View>
          </View>
        ) : null}
      </View>
      </ScrollView>

      <View style={styles.bottomWrap}>
        <Text style={styles.publicInfo}>{t('onboarding.avatarPublicNote')}</Text>
        <PressableScale
          onPress={() => canConfirm && onConfirm(trimmed, pickedPhoto)}
          disabled={!canConfirm}
          style={[styles.confirmBtn, canConfirm ? styles.confirmBtnOn : styles.confirmBtnOff]}
        >
          <Text style={[styles.confirmText, canConfirm ? styles.confirmTextOn : styles.confirmTextOff]}>
            {editMode ? t('tips.save') : t('common.confirm')}
          </Text>
        </PressableScale>
      </View>
    </KeyboardStickyView>
  );
}

function RuleItem({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={ok ? 'checkmark' : 'close'}
        size={sx(16)}
        color={ok ? colors.blue[500] : colors.gray[700]}
      />
      <Text style={[styles.ruleText, ok && styles.ruleTextOk]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    height: sy(48),
    marginTop: sy(6),
    paddingHorizontal: sx(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    left: sx(20),
    width: sx(32),
    height: sx(32),
    borderRadius: radius.full,
    backgroundColor: colors.blue[150],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(24),
    lineHeight: sy(32),
    color: colors.gray[1300],
    letterSpacing: -0.24,
  },

  profileBlock: {
    marginTop: sy(72),
    paddingHorizontal: sx(20),
  },
  avatarArea: { width: sx(100), height: sx(100), alignSelf: 'center' },
  avatarWrap: {
    width: sx(100),
    height: sx(100),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray[200],
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: sx(100),
    height: sx(100),
  },
  // Mirrors ProfileMain.avatarBadge so the two screens read as one control.
  cameraBadge: {
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

  inputWrap: {
    marginTop: sy(22),
    minHeight: sy(68),
    borderRadius: radius['4xl'],
    backgroundColor: '#f2f9ff',
    borderWidth: 3,
    paddingRight: sx(14),
    justifyContent: 'center',
    boxShadow: '0px 0px 16px rgba(82, 125, 255, 0.32)',
    elevation: 16,
  },
  input: {
    minHeight: sy(68),
    paddingHorizontal: sx(20),
    paddingRight: sx(48),
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    lineHeight: sy(24),
    color: colors.gray[1300],
    letterSpacing: -0.16,
  },
  inputStateIcon: {
    position: 'absolute',
    right: sx(14),
  },

  availableText: {
    marginTop: sy(12),
    marginLeft: sx(16),
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: colors.gray[1000],
    letterSpacing: -0.14,
  },
  rulesWrap: {
    marginTop: sy(12),
    marginLeft: sx(16),
    gap: sy(6),
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(8),
  },
  ruleText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: colors.gray[800],
    letterSpacing: -0.14,
  },
  ruleTextOk: {
    color: colors.blue[500],
  },

  takenWrap: {
    marginTop: sy(12),
    marginLeft: sx(16),
    gap: sy(8),
  },
  takenText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: colors.red[100],
    letterSpacing: -0.14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sx(8),
  },
  chip: {
    height: sy(32),
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.blue[300],
    backgroundColor: colors.blue[100],
    paddingHorizontal: sx(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(13),
    lineHeight: sy(16),
    color: colors.gray[1000],
  },

  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: sy(16) },
  bottomWrap: {
    alignItems: 'center',
    paddingBottom: sy(8),
  },
  publicInfo: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(14),
    lineHeight: sy(20),
    color: colors.gray[800],
    letterSpacing: -0.14,
    marginBottom: sy(16),
  },
  confirmBtn: {
    width: W - sx(40),
    height: sy(56),
    borderRadius: sx(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnOn: { backgroundColor: colors.blue[500] },
  confirmBtnOff: { backgroundColor: '#d8ddef' },
  confirmText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    lineHeight: sy(21),
    letterSpacing: -0.16,
  },
  confirmTextOn: { color: colors.gray[100] },
  confirmTextOff: { color: colors.gray[800] },
});
