import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, radius } from '../../theme/tokens';
import { onboardingSource } from '../../assets/onboardingAssets';
import ProgressBar from '../../components/ProgressBar';

// airplane.png is a freshly-added PNG — on Android load it by resource name
// (require()'s numeric id renders blank), keeping the require() so Metro bundles it.
const PLANE_MOD = require('../../../assets/onboarding/airplane.png') as ImageSourcePropType;
const PLANE: ImageSourcePropType =
  Platform.OS === 'android' ? { uri: 'assets_onboarding_airplane' } : PLANE_MOD;

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const DEFAULT_AVATAR = onboardingSource(
  require('../../../assets/mascot/bird-card.png') as ImageSourcePropType,
  'bird-card',
);

const TAKEN_USERNAMES = new Set([
  'admin',
  'root',
  'konnect',
  'sallytheking',
  'hotdog193',
  'testuser',
]);

type Availability = 'idle' | 'checking' | 'available' | 'taken';

interface Props {
  progress: number;
  onBack: () => void;
  onConfirm: (username: string, photoUri?: string | null) => void;
  initialValue?: string;
  initialPhotoUrl?: string | null;
  /** Reuse this screen from Profile as an editor: no progress bar, "Save" CTA. */
  editMode?: boolean;
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

async function checkUsernameAvailability(username: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 280));
  return !TAKEN_USERNAMES.has(username.toLowerCase());
}

export function ProfileSetupScreen({
  progress,
  onBack,
  onConfirm,
  initialValue = '',
  initialPhotoUrl,
  editMode = false,
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
          : await (async () => {
              const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) {
                Alert.alert(t('onboarding.photosNeededTitle'), t('onboarding.photosNeededBody'));
                return null;
              }
              return ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.85,
              });
            })();

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

  // Progress bar — identical to the questionnaire (shared ProgressBar + plane).
  const [trackWidth, setTrackWidth] = useState(0);
  const displayProgress = Math.max(0.08, Math.min(0.96, progress));
  const pct = `${displayProgress * 100}%` as `${number}%`;
  const fillTouchOffset = sx(6);
  const touchProgress = trackWidth > 0 ? fillTouchOffset / trackWidth : 0;
  const fillProgress = Math.min(0.96, displayProgress + touchProgress);

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

  useEffect(() => {
    if (!trimmed || !allRulesPass) {
      setAvailability('idle');
      setSuggestions([]);
      return;
    }

    requestSeq.current += 1;
    const currentReq = requestSeq.current;
    setAvailability('checking');

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
    }, 240);

    return () => clearTimeout(timer);
  }, [trimmed, allRulesPass]);

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
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={sx(20)} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>{editMode ? t('onboarding.editProfile') : t('onboarding.createProfile')}</Text>
      </View>

      {!editMode ? (
        <View
          style={styles.progressTrack}
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        >
          <ProgressBar progress={fillProgress} dashStartProgress={displayProgress} width={trackWidth} />
          <View style={[styles.planeWrap, { left: pct }]} pointerEvents="none">
            <View style={styles.planeGlow}>
              <Image source={PLANE} style={styles.planeImg} resizeMode="contain" />
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.profileBlock}>
        <Pressable style={styles.avatarWrap} onPress={choosePhoto} hitSlop={8}>
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
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={sx(14)} color={colors.gray[100]} />
          </View>
        </Pressable>

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
                <Pressable key={s} onPress={() => setUsername(s)} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>
      </ScrollView>

      <View style={styles.bottomWrap}>
        <Text style={styles.publicInfo}>{t('onboarding.avatarPublicNote')}</Text>
        <Pressable
          onPress={() => canConfirm && onConfirm(trimmed, pickedPhoto)}
          disabled={!canConfirm}
          style={[styles.confirmBtn, canConfirm ? styles.confirmBtnOn : styles.confirmBtnOff]}
        >
          <Text style={[styles.confirmText, canConfirm ? styles.confirmTextOn : styles.confirmTextOff]}>
            {editMode ? t('tips.save') : t('common.confirm')}
          </Text>
        </Pressable>
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

  progressTrack: {
    marginTop: sy(12),
    // Inset to match the questionnaire progress bar (paddingHorizontal sx(20)),
    // instead of spanning the whole screen width.
    marginHorizontal: sx(20),
    height: sy(8),
    borderRadius: radius.full,
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
  },
  planeWrap: {
    position: 'absolute',
    // Pull the plane back left so its (transparently-padded) body sits on the
    // fill end with no gap — matches the questionnaire progress bar.
    marginLeft: -sx(18),
    zIndex: 4,
  },
  planeGlow: {
    shadowColor: '#527dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  planeImg: {
    width: sx(56),
    height: sx(56),
    backgroundColor: 'transparent',
  },

  profileBlock: {
    marginTop: sy(72),
    paddingHorizontal: sx(20),
  },
  avatarWrap: {
    width: sx(100),
    height: sx(100),
    alignSelf: 'center',
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
  cameraBadge: {
    position: 'absolute',
    right: sx(4),
    bottom: sx(4),
    width: sx(26),
    height: sx(26),
    borderRadius: radius.full,
    backgroundColor: colors.gray[600],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.gray[200],
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
