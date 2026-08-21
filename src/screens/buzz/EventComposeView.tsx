import React, { useState } from 'react';
import {
  Image,
  Modal,
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
import { colors, radius, spacing } from '../../theme/tokens';
import { MiniCalendar } from '../../components/buzz/MiniCalendar';
import { NumberStepperDialog } from '../../components/buzz/NumberStepperDialog';

export type EventDraft = {
  title: string;
  caption: string;
  dateLabel: string | null;
  place: string | null;
  photo: string | null;
  limit: number | null;
};

type Props = {
  initial?: Partial<EventDraft>;
  editing?: boolean;
  onBack: () => void;
  onSubmit: (draft: EventDraft) => void;
};

// Figma: "WritingPost_Event" (node 11478:76097) — event title, description,
// location/image row, Required date + location chips, Unlimited/Limited
// participants (Limited opens a people picker), Publish (enabled once titled).
export function EventComposeView({ initial, editing, onBack, onSubmit }: Props) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [caption, setCaption] = useState(initial?.caption ?? '');
  const [dateLabel, setDateLabel] = useState<string | null>(initial?.dateLabel ?? null);
  const [dateDay, setDateDay] = useState<number | null>(null);
  const [place, setPlace] = useState<string | null>(initial?.place ?? null);
  const [photo, setPhoto] = useState<string | null>(initial?.photo ?? null);
  const [limited, setLimited] = useState(initial?.limit != null);
  const [limit, setLimit] = useState<number | null>(initial?.limit ?? null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showPeople, setShowPeople] = useState(false);

  const canPublish = title.trim().length > 0;

  const pickPhoto = async () => {
    // System photo picker — no media permission needed.
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!res.canceled) setPhoto(res.assets[0].uri);
  };

  const submit = () => {
    if (!canPublish) return;
    onSubmit({
      title: title.trim(),
      caption: caption.trim(),
      dateLabel,
      place: place ?? 'Seoul',
      photo,
      limit: limited ? limit ?? 20 : null,
    });
  };

  return (
    <KeyboardStickyView style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>
          {editing ? t('vibes.editTitle') : t('vibes.composeTitle')}
        </Text>
        <Pressable style={styles.saveBtn} hitSlop={6} disabled={!canPublish} onPress={submit}>
          <Text style={[styles.saveText, canPublish && styles.saveTextActive]}>
            {t('vibes.save')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder={t('vibes.titlePlaceholder')}
            placeholderTextColor={colors.gray[700]}
          />
        </View>

        <View style={[styles.field, styles.textareaField]}>
          <TextInput
            style={styles.textarea}
            value={caption}
            onChangeText={setCaption}
            placeholder={t('vibes.captionPlaceholder')}
            placeholderTextColor={colors.gray[700]}
            multiline
          />
        </View>

        {/* location + image icons */}
        <View style={styles.iconRow}>
          <Pressable style={styles.iconAction} onPress={() => setPlace('Seongsu')}>
            <Ionicons
              name="location-outline"
              size={22}
              color={place ? colors.icon.accent : colors.icon.disabled}
            />
          </Pressable>
          <Pressable style={styles.iconAction} onPress={pickPhoto}>
            <Ionicons
              name="image-outline"
              size={22}
              color={photo ? colors.icon.accent : colors.icon.disabled}
            />
          </Pressable>
        </View>

        {photo && <Image source={{ uri: photo }} style={styles.preview} />}

        <View style={styles.hr} />

        <Text style={styles.sectionLabel}>{t('vibes.required')}</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.reqChip, dateLabel && styles.reqChipFilled]}
            onPress={() => setShowCalendar(true)}
          >
            <Text style={[styles.reqChipText, dateLabel && styles.reqChipTextFilled]}>
              {dateLabel ?? t('vibes.addDate')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.reqChip, place && styles.reqChipFilled]}
            onPress={() => setPlace('Seongsu')}
          >
            <Text style={[styles.reqChipText, place && styles.reqChipTextFilled]}>
              {place ?? t('vibes.addLocation')}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>{t('vibes.participants')}</Text>
        <Pressable style={styles.radioRow} onPress={() => { setLimited(false); setLimit(null); }}>
          <View style={[styles.radio, !limited && styles.radioOn]}>
            {!limited && <View style={styles.radioDot} />}
          </View>
          <Text style={styles.radioLabel}>{t('vibes.unlimited')}</Text>
        </Pressable>
        <Pressable style={styles.radioRow} onPress={() => setLimited(true)}>
          <View style={[styles.radio, limited && styles.radioOn]}>
            {limited && <View style={styles.radioDot} />}
          </View>
          <Text style={styles.radioLabel}>{t('vibes.limited')}</Text>
          {limited && (
            <Pressable style={styles.peoplePick} hitSlop={6} onPress={() => setShowPeople(true)}>
              <Text style={styles.peopleText}>
                {limit ? t('vibes.peopleCount', { count: limit }) : t('vibes.selectPeople')}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.blue[500]} />
            </Pressable>
          )}
        </Pressable>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.cta, !canPublish && styles.ctaDisabled]}
          disabled={!canPublish}
          onPress={submit}
        >
          <Text style={styles.ctaText}>{t('vibes.publish')}</Text>
        </Pressable>
      </View>

      {/* Date picker */}
      <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
        <Pressable style={styles.scrim} onPress={() => setShowCalendar(false)} />
        <View style={styles.calendarWrap} pointerEvents="box-none">
          <MiniCalendar
            selected={dateDay}
            onSelect={(day, label) => {
              setDateDay(day);
              setDateLabel(label);
              setShowCalendar(false);
            }}
          />
        </View>
      </Modal>

      <NumberStepperDialog
        visible={showPeople}
        title={t('vibes.numberOfPeople')}
        initial={limit ?? 20}
        onCancel={() => setShowPeople(false)}
        onConfirm={(v) => {
          setLimit(v);
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
    fontSize: 18,
    lineHeight: 21,
    letterSpacing: -0.18,
    color: colors.gray[1300],
  },
  saveBtn: { minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', paddingRight: spacing[3] },
  saveText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[700],
  },
  saveTextActive: { color: colors.blue[500] },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[6], gap: spacing[3] },
  field: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  titleInput: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.gray[1300],
    padding: 0,
  },
  textareaField: { minHeight: 120 },
  textarea: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.gray[1300],
    padding: 0,
    textAlignVertical: 'top',
  },
  iconRow: { flexDirection: 'row', gap: spacing[2] },
  iconAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  preview: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  hr: { height: 1, backgroundColor: colors.surface.subtle, marginVertical: spacing[1] },
  sectionLabel: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
  },
  chipRow: { flexDirection: 'row', gap: spacing[2] },
  reqChip: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  reqChipFilled: { backgroundColor: colors.blue[170] },
  reqChipText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: -0.13,
    color: colors.gray[700],
  },
  reqChipTextFilled: {
    fontFamily: 'NationalPark_600SemiBold',
    color: colors.gray[1200],
  },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: 6 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.gray[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.blue[500] },
  radioDot: { width: 10, height: 10, borderRadius: radius.full, backgroundColor: colors.blue[500] },
  radioLabel: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.gray[1300],
  },
  peoplePick: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  peopleText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    letterSpacing: -0.14,
    color: colors.blue[500],
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
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(29,25,43,0.4)' },
  calendarWrap: { flex: 1, justifyContent: 'flex-end', padding: spacing[5], paddingBottom: spacing[10] },
});
