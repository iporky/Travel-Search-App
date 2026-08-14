import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { FilterSelectSheet } from '../../components/history/FilterChips';
import { DarkButton, P, SubHeader } from '../../components/profile/ProfileUI';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';

// Figma annotation (10978:93904): Contact Us — Subject, Description, Category,
// all required; Loading / Success / Failure states. (No dedicated frame in the
// section, so this follows the Feedback screen's form language.)

type Props = { onBack: () => void };

const CATEGORY_VALUES = ['general', 'account', 'bug', 'other'] as const;

export function ContactUsScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const valid = subject.trim() && description.trim() && category;

  const submit = () => {
    if (!valid) return;
    setSending(true);
    // No support API yet — simulate loading, then acknowledge.
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 700);
  };

  return (
    <KeyboardStickyView style={styles.screen}>
      <SubHeader title={t('settings.contactUs')} onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>{t('contact.subject')}</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder={t('contact.subjectPlaceholder')}
            placeholderTextColor={P.textFaint}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('contact.category')}</Text>
          <Pressable style={styles.select} onPress={() => setPickerOpen(true)}>
            <Text style={category ? styles.selectValue : styles.selectPlaceholder}>
              {category ? t(`contact.categories.${category}`) : t('contact.categoryPlaceholder')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={P.textMuted} />
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t('contact.description')}</Text>
          <TextInput
            style={styles.textarea}
            value={description}
            onChangeText={setDescription}
            placeholder={t('contact.descriptionPlaceholder')}
            placeholderTextColor={P.textFaint}
            multiline
            textAlignVertical="top"
          />
        </View>

        <DarkButton
          label={sending ? t('contact.sending') : t('contact.send')}
          onPress={submit}
          disabled={!valid}
          loading={sending}
        />
      </ScrollView>

      <FilterSelectSheet
        visible={pickerOpen}
        title={t('contact.category')}
        options={CATEGORY_VALUES.map((v) => ({ value: v, label: t(`contact.categories.${v}`) }))}
        selected={category}
        onClose={() => setPickerOpen(false)}
        onSelect={(v) => {
          setCategory(v);
          setPickerOpen(false);
        }}
      />

      <ConfirmDialog
        visible={sent}
        title={t('contact.sentTitle')}
        body={t('contact.sentBody')}
        confirmLabel={t('common.confirm')}
        onConfirm={() => {
          setSent(false);
          onBack();
        }}
      />
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray[100] },
  content: { paddingHorizontal: spacing[4], paddingBottom: 96, gap: spacing[5] },
  field: { gap: spacing[2] },
  label: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 14,
    color: P.textDark,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    color: P.textDark,
  },
  select: {
    height: 48,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectValue: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    color: P.textDark,
  },
  selectPlaceholder: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    color: P.textFaint,
  },
  textarea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.sm,
    padding: spacing[3],
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: P.textDark,
  },
});
