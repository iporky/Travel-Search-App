import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { FormField, PrimaryButton, SectionTitle, TopBar } from '../../components/profile/ProfileUI';
import { FeedbackType, submitFeedback } from '../../api/feedback';
import { track } from '../../api/tracking';
import { PressableScale } from '../../components/PressableScale';

// Figma "Profile_Setting_Feedback" (12276:94079), annotation "Feedback Form":
//   • Feedback type: Suggest / Like / Dislike (single select radios)
//   • Comment "Tell us more" (helper: include details such as missing or
//     incorrect links) + optional image attachment (gallery icon)
//   • Email address (optional)
//   • Submit via bottom CTA "Send Feedback"
// → POST /api/v1/feedbacks (type, details, user_email, file) — the web contract.

type Props = { onBack: () => void };

const TYPES: FeedbackType[] = ['suggest', 'like', 'dislike'];

export function FeedbackScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const keyboardHeight = useKeyboardHeight();
  const [type, setType] = useState<FeedbackType | null>(null);
  const [email, setEmail] = useState(user?.email ?? '');
  const [details, setDetails] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<'sent' | 'failed' | null>(null);

  const canSend = type != null && details.trim().length > 0;

  const pickImage = async () => {
    // System photo picker — no media permission needed.
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled && res.assets?.[0]?.uri) setFileUri(res.assets[0].uri);
  };

  const send = async () => {
    if (!canSend || sending || !type) return;
    setSending(true);
    try {
      await submitFeedback({ type, details: details.trim(), userEmail: email.trim() || null, fileUri });
      track.feedbackSubmitted('feedback');
      setResult('sent');
    } catch (e: any) {
      console.warn('[Feedback] send failed', e?.message ?? e);
      setResult('failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingBottom: keyboardHeight }]}>
      <TopBar title={t('settings.feedback')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.block}>
          <SectionTitle>{t('feedback.experienceHeading')}</SectionTitle>
          <View style={styles.options}>
            {TYPES.map((v) => {
              const active = type === v;
              return (
                <PressableScale key={v} style={styles.option} onPress={() => setType(v)} hitSlop={4}>
                  <MaterialIcons
                    name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={18}
                    color={active ? colors.blue[500] : colors.gray[700]}
                  />
                  <Text style={styles.optionLabel}>{t(`feedback.types.${v}`)}</Text>
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={styles.block}>
          <SectionTitle>{t('feedback.tellUsMore')}</SectionTitle>
          <View style={styles.fields}>
            <FormField
              value={email}
              onChangeText={setEmail}
              placeholder={t('feedback.emailPlaceholder')}
              keyboardType="email-address"
            />
            <FormField
              value={details}
              onChangeText={setDetails}
              placeholder={t('feedback.detailsPlaceholder')}
              multiline
              footer={
                <View style={styles.attachRow}>
                  <PressableScale style={styles.attachBtn} hitSlop={6} onPress={pickImage}>
                    <MaterialIcons name="image" size={24} color={colors.gray[900]} />
                  </PressableScale>
                  {fileUri && (
                    <View style={styles.thumbWrap}>
                      <Image source={{ uri: fileUri }} style={styles.thumb} />
                      <PressableScale style={styles.thumbRemove} hitSlop={6} onPress={() => setFileUri(null)}>
                        <MaterialIcons name="close" size={14} color={colors.gray[100]} />
                      </PressableScale>
                    </View>
                  )}
                </View>
              }
            />
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <PrimaryButton label={sending ? t('feedback.sending') : t('feedback.send')} onPress={send} disabled={!canSend} loading={sending} />
      </View>

      <ConfirmDialog
        visible={result != null}
        title={result === 'sent' ? t('feedback.sentTitle') : t('feedback.failedTitle')}
        body={result === 'sent' ? t('feedback.sentBody') : t('feedback.failedBody')}
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
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[8], gap: 41 },
  block: { gap: spacing[4] },
  options: { gap: spacing[2] },
  option: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  optionLabel: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
  },
  fields: { gap: spacing[3] },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[2] },
  attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing[3] },
  thumbWrap: { width: 44, height: 44 },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gray[1300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[4] },
});
