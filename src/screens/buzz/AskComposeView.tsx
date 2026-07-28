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
import { colors, radius, spacing } from '../../theme/tokens';

type Props = {
  /** Prefilled text → edit mode ("Edit" + Save); empty → compose ("Ask a question" + send). */
  initialValue?: string;
  editing?: boolean;
  onBack: () => void;
  onSubmit: (text: string) => void;
};

// Figma: "WritingPost_Question_Empty / _TextEntered" (11452:65207 / 65229) and
// "PostDetail_Edit" (11452:65049). Compose shows the Kiki bubble and an arrow-up
// send button that enables once text is entered; edit swaps in a "Save" action.
export function AskComposeView({ initialValue = '', editing, onBack, onSubmit }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialValue);
  const canSubmit = text.trim().length > 0 && text !== initialValue.trim();
  const canSend = text.trim().length > 0;

  return (
    <KeyboardStickyView style={styles.flex}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>
          {editing ? t('ask.editTitle') : t('ask.composeTitle')}
        </Text>
        {editing ? (
          <Pressable
            style={styles.saveBtn}
            hitSlop={6}
            disabled={!canSubmit}
            onPress={() => onSubmit(text.trim())}
          >
            <Text style={[styles.saveText, canSubmit && styles.saveTextActive]}>
              {t('ask.save')}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.saveBtn} />
        )}
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        {!editing && (
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{t('ask.helperBubble')}</Text>
          </View>
        )}
      </ScrollView>

      {/* Input container */}
      <View style={styles.inputWrap}>
        <View style={styles.inputBox}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t('ask.placeholder')}
            placeholderTextColor={colors.gray[800]}
            multiline
            autoFocus
          />
          <View style={styles.inputActions}>
            <Pressable style={styles.plusBtn} hitSlop={6}>
              <Ionicons name="add" size={24} color={colors.icon.accent} />
            </Pressable>
            {!editing && (
              <Pressable
                style={[styles.sendBtn, canSend ? styles.sendActive : styles.sendDisabled]}
                disabled={!canSend}
                onPress={() => onSubmit(text.trim())}
              >
                <Ionicons name="arrow-up" size={20} color={colors.text.onDark} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing[1],
    paddingRight: spacing[5],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  saveBtn: { minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  saveText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[700],
  },
  saveTextActive: { color: colors.blue[500] },
  body: { padding: spacing[5], flexGrow: 1 },
  bubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[1] + 2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    borderBottomLeftRadius: 0,
    maxWidth: 260,
  },
  bubbleText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  inputWrap: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[6],
    alignItems: 'center',
  },
  inputBox: {
    width: '100%',
    backgroundColor: colors.surface.default,
    borderWidth: 2,
    borderColor: colors.blue[500],
    borderRadius: radius.xl,
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[5],
    gap: spacing[1],
    boxShadow: '0px 0px 16px rgba(82,125,255,0.20)',
    elevation: 8,
  },
  input: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
    maxHeight: 180,
    padding: 0,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plusBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendActive: { backgroundColor: colors.blue[500] },
  sendDisabled: { backgroundColor: colors.gray[600] },
});
