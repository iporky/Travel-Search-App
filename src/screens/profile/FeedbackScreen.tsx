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
import { DarkButton, P, SubHeader, ToggleRow } from '../../components/profile/ProfileUI';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';

// Figma: screen-4-feedback (10978:94033). Rating 1–5 (required, circle
// buttons), "Tell us more" textarea (optional), follow-up contact toggle,
// "Send Feedback" → loading → success dialog.

type Props = { onBack: () => void };

export function FeedbackScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = () => {
    if (rating === 0) return;
    setSending(true);
    // No feedback API yet — simulate the loading state, then confirm.
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 700);
  };

  return (
    <KeyboardStickyView style={styles.screen}>
      <SubHeader title={t('settings.feedback')} onBack={onBack} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.question}>{t('feedback.rateQuestion')}</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n <= rating;
            return (
              <Pressable
                key={n}
                style={[styles.ratingCircle, active && styles.ratingCircleActive]}
                onPress={() => setRating(n)}
              >
                <Ionicons
                  name={active ? 'star' : 'star-outline'}
                  size={18}
                  color={active ? '#ffffff' : P.textFaint}
                />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.tellUs}>{t('feedback.tellUsMore')}</Text>
        <TextInput
          style={styles.textarea}
          value={comment}
          onChangeText={setComment}
          placeholder={t('feedback.placeholder')}
          placeholderTextColor={P.textFaint}
          multiline
          textAlignVertical="top"
        />

        <ToggleRow first label={t('feedback.allowFollowUp')} value={followUp} onChange={setFollowUp} />

        <DarkButton
          label={sending ? t('feedback.sending') : t('feedback.send')}
          onPress={submit}
          disabled={rating === 0}
          loading={sending}
        />
      </ScrollView>

      <ConfirmDialog
        visible={sent}
        title={t('feedback.sentTitle')}
        body={t('feedback.sentBody')}
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
  content: { paddingHorizontal: spacing[4], paddingBottom: 96, gap: spacing[4] },
  question: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: P.textDark,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  ratingCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[100],
  },
  ratingCircleActive: {
    backgroundColor: P.dark,
    borderColor: P.dark,
  },
  tellUs: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 15,
    color: P.textDark,
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
