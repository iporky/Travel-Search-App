import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { spacing } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { FormField, PrimaryButton, SectionTitle, TopBar } from '../../components/profile/ProfileUI';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { submitFeedback } from '../../api/feedback';
import { track } from '../../api/tracking';

// Figma "Profile_Setting_ContactUs" (12276:94100): TopBar "Contact Us",
// heading "How can we help?", fields Name / Email / Comment (white inputs,
// radius 12, px 20 / py 16), bottom CTA "Send message" (accent, 56, radius 20).
// Submits through the same feedbacks endpoint the web app uses, flagged
// `feedback_reply: true` so the team replies to the given email.

type Props = { onBack: () => void };

export function ContactUsScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  // Edge-to-edge Android never resizes the window: lift the CTA over the keyboard.
  const keyboardHeight = useKeyboardHeight();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'sent' | 'failed' | null>(null);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.name, user?.email]);

  const canSend = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email.trim()) && comment.trim().length > 0;

  const send = async () => {
    if (!canSend || sending) return;
    setSending(true);
    try {
      await submitFeedback({
        type: 'suggest',
        details: `[Contact Us] ${name.trim()}\n\n${comment.trim()}`,
        userEmail: email.trim(),
        reply: true,
      });
      track.feedbackSubmitted('contact');
      setResult('sent');
    } catch (e: any) {
      console.warn('[ContactUs] send failed', e?.message ?? e);
      setResult('failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingBottom: keyboardHeight }]}>
      <TopBar title={t('contact.title')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SectionTitle>{t('contact.heading')}</SectionTitle>
        <View style={styles.fields}>
          <FormField label={t('contact.name')} value={name} onChangeText={setName} placeholder={t('contact.namePlaceholder')} />
          <FormField
            label={t('contact.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('contact.emailPlaceholder')}
            keyboardType="email-address"
          />
          <FormField
            label={t('contact.comment')}
            value={comment}
            onChangeText={setComment}
            placeholder={t('contact.commentPlaceholder')}
            multiline
          />
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <PrimaryButton label={sending ? t('contact.sending') : t('contact.send')} onPress={send} disabled={!canSend} loading={sending} />
      </View>

      <ConfirmDialog
        visible={result != null}
        title={result === 'sent' ? t('contact.sentTitle') : t('contact.failedTitle')}
        body={result === 'sent' ? t('contact.sentBody') : t('contact.failedBody')}
        confirmLabel={t('common.done')}
        onConfirm={() => {
          const ok = result === 'sent';
          setResult(null);
          if (ok) onBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[8], gap: spacing[5] },
  fields: { gap: spacing[3] },
  bottomBar: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4] },
});
