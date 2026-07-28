import React, { useState } from 'react';
import {
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
import { colors, radius, shadows, spacing } from '../../theme/tokens';
import { VibeEvent } from '../../types/vibes';
import { AvatarStack } from '../../components/buzz/AvatarStack';
import { NumberStepperDialog } from '../../components/buzz/NumberStepperDialog';
import { LoadingImage } from '../../components/LoadingImage';

type Props = {
  event: VibeEvent;
  onBack: () => void;
  onConfirm: (people: number) => void;
};

// Figma: "JoinEvent_Empty / ParticipantsPicker" (node 11478:76528 / 76547) —
// event recap, phone number, number-of-people picker (stepper), then Join.
export function JoinEventView({ event, onBack, onConfirm }: Props) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [people, setPeople] = useState<number | null>(null);
  const [showPeople, setShowPeople] = useState(false);

  const canJoin = phone.trim().length >= 6 && people != null;

  return (
    <KeyboardStickyView style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>{t('vibes.joinTitle')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Event recap */}
        <View style={styles.recap}>
          <LoadingImage source={{ uri: event.photos[0] }} style={styles.recapImage} />
          <View style={styles.recapDetails}>
            <Text style={styles.recapMeta}>
              {event.time} · {event.place}
            </Text>
            <Text style={styles.recapTitle} numberOfLines={2}>
              {event.title}
            </Text>
            <View style={styles.recapBottom}>
              <AvatarStack names={event.participants} total={event.participantCount} size={20} />
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('vibes.phoneNumber')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('vibes.phonePlaceholder')}
            placeholderTextColor={colors.gray[700]}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('vibes.numberOfPeople')}</Text>
          <Pressable style={styles.selectField} onPress={() => setShowPeople(true)}>
            <Text style={people ? styles.selectValue : styles.selectPlaceholder}>
              {people ? t('vibes.peopleCount', { count: people }) : t('vibes.selectPeople')}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.icon.disabled} />
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.cta, !canJoin && styles.ctaDisabled]}
          disabled={!canJoin}
          onPress={() => people != null && onConfirm(people)}
        >
          <Text style={styles.ctaText}>{t('vibes.join')}</Text>
        </Pressable>
      </View>

      <NumberStepperDialog
        visible={showPeople}
        title={t('vibes.numberOfPeople')}
        initial={people ?? 1}
        onCancel={() => setShowPeople(false)}
        onConfirm={(v) => {
          setPeople(v);
          setShowPeople(false);
        }}
      />
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[2], gap: spacing[5] },
  recap: {
    flexDirection: 'row',
    gap: spacing[3],
    backgroundColor: colors.gray[100],
    borderRadius: radius.xl,
    padding: spacing[3],
    ...shadows.cardDefault,
  },
  recapImage: {
    width: 110,
    height: 90,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  recapDetails: { flex: 1, gap: spacing[1], justifyContent: 'center' },
  recapMeta: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
  recapTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  recapBottom: { marginTop: spacing[1] },
  field: { gap: spacing[2] },
  label: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
  },
  input: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontFamily: 'NationalPark_500Medium',
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.gray[1300],
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  selectPlaceholder: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.gray[700],
  },
  selectValue: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.gray[1300],
  },
  bottomBar: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[6] },
  cta: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: colors.gray[600] },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
});
