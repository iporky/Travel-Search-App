import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';

// Small centered edit dialog for single profile fields (bio, birthday, …).
// Matches the wireframe language of the profile redesign: white card,
// #d1d5db borders, near-black CTA.

type Props = {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numbers-and-punctuation';
  onClose: () => void;
  onSave: (value: string) => void;
};

export function EditFieldModal({
  visible,
  title,
  placeholder,
  initialValue,
  multiline,
  keyboardType = 'default',
  onClose,
  onSave,
}: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initialValue ?? '');
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    if (visible) setValue(initialValue ?? '');
  }, [visible, initialValue]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
        pointerEvents="box-none"
      >
        {/* Edge-to-edge Android: shift the card above the keyboard manually. */}
        <View style={[styles.card, keyboardHeight > 0 && { marginBottom: keyboardHeight }]}>
          <Text style={styles.title}>{title}</Text>
          <TextInput
            style={[styles.input, multiline && styles.inputMultiline]}
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={PLACEHOLDER}
            multiline={multiline}
            keyboardType={keyboardType}
            autoFocus
          />
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable style={styles.saveBtn} onPress={() => onSave(value.trim())}>
              <Text style={styles.saveText}>{t('common.save')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const BORDER = '#d1d5db';
const PLACEHOLDER = '#9ca3af';

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.45)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing[5] },
  card: {
    width: '100%',
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    padding: spacing[5],
    gap: spacing[4],
  },
  title: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 17,
    lineHeight: 22,
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  inputMultiline: { minHeight: 110, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing[3] },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    color: '#111827',
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.gray[1300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
});
