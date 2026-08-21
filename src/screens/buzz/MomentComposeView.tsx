import React, { useState } from 'react';
import {
  Image,
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
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';

export type MomentDraft = { heading: string; text: string; photos: string[] };

type Props = {
  initial?: Partial<MomentDraft>;
  editing?: boolean;
  onBack: () => void;
  onSubmit: (draft: MomentDraft) => void;
};

// Figma: "WritingPost_Moment" (node 11452:71179) — Share a Moment: heading input,
// long description (with a min-length counter), location + photo attach with a
// removable thumbnail strip, and Publish. Backing out with content confirms.
export function MomentComposeView({ initial, editing, onBack, onSubmit }: Props) {
  const { t } = useTranslation();
  const [heading, setHeading] = useState(initial?.heading ?? '');
  const [text, setText] = useState(initial?.text ?? '');
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const dirty = heading.trim() !== '' || text.trim() !== '' || photos.length > 0;
  const canPublish = text.trim().length > 0 || photos.length > 0;

  const back = () => (dirty && !editing ? setConfirmLeave(true) : onBack());

  const pickPhotos = async () => {
    // System photo picker — no media permission needed.
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1,
    });
    if (!res.canceled) setPhotos((p) => [...p, ...res.assets.map((a) => a.uri)]);
  };

  const submit = () => {
    if (!canPublish) return;
    onSubmit({ heading: heading.trim(), text: text.trim(), photos });
  };

  return (
    <KeyboardStickyView style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={back}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>
          {editing ? t('momentsCompose.editTitle') : t('momentsCompose.title')}
        </Text>
        <Pressable style={styles.saveBtn} hitSlop={6} disabled={!canPublish} onPress={submit}>
          <Text style={[styles.saveText, canPublish && styles.saveTextActive]}>
            {t('momentsCompose.save')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingField}>
          <TextInput
            style={styles.headingInput}
            value={heading}
            onChangeText={setHeading}
            placeholder={t('momentsCompose.heading')}
            placeholderTextColor={colors.gray[700]}
          />
        </View>

        <View style={styles.bodyField}>
          <TextInput
            style={styles.bodyInput}
            value={text}
            onChangeText={setText}
            placeholder={t('momentsCompose.bodyHint')}
            placeholderTextColor={colors.gray[700]}
            multiline
          />
        </View>

        <View style={styles.actionsRow}>
          <View style={styles.iconGroup}>
            <View style={styles.actionIcon}>
              <Ionicons name="location-outline" size={22} color={colors.icon.disabled} />
            </View>
            <Pressable style={styles.actionIcon} onPress={pickPhotos}>
              <Ionicons name="image-outline" size={22} color={colors.icon.disabled} />
            </Pressable>
          </View>
          <Text style={styles.counter}>{text.trim().length}/80</Text>
        </View>

        {photos.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbRow}
          >
            {photos.map((uri, i) => (
              <View key={`${uri}-${i}`} style={styles.thumbWrap}>
                <Image source={{ uri }} style={styles.thumb} />
                <Pressable
                  style={styles.removeBtn}
                  hitSlop={6}
                  onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                >
                  <Ionicons name="close" size={14} color={colors.gray[100]} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.cta, !canPublish && styles.ctaDisabled]}
          disabled={!canPublish}
          onPress={submit}
        >
          <Text style={styles.ctaText}>{t('momentsCompose.publish')}</Text>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmLeave}
        title={t('momentsCompose.leaveTitle')}
        body={t('momentsCompose.leaveBody')}
        confirmLabel={t('momentsCompose.discard')}
        cancelLabel={t('momentsCompose.keepEditing')}
        destructive
        onConfirm={() => {
          setConfirmLeave(false);
          onBack();
        }}
        onCancel={() => setConfirmLeave(false)}
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
  headingField: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  headingInput: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 15,
    letterSpacing: -0.15,
    color: colors.gray[1300],
    padding: 0,
  },
  bodyField: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    minHeight: 220,
  },
  bodyInput: {
    flex: 1,
    fontFamily: 'NationalPark_400Regular',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.15,
    color: colors.gray[1300],
    padding: 0,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconGroup: { flexDirection: 'row', gap: spacing[2] },
  actionIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  counter: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    letterSpacing: -0.13,
    color: colors.red[100],
  },
  thumbRow: { gap: spacing[2], paddingTop: spacing[1] },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.red[100],
    alignItems: 'center',
    justifyContent: 'center',
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
