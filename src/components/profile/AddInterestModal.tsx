import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme/tokens';
import { MAX_INTERESTS } from './InterestChips';

// Figma "Confirmation Modal" (12276:94687) — Add Custom Interest:
// 300 wide, #fefefe, radius 24; title Heading/24/SemiBold "Add custom
// Interests"; body Body/16/Regular "Enter an interest. / You can add up to 5.";
// input box #eaf4ff radius 12 px20 py16, placeholder "e.g., Shopping"
// 13/Medium muted; full-width text button "Add" (16/SemiBold accent).
// No Cancel — tapping the scrim dismisses.

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
};

export function AddInterestModal({ visible, onClose, onAdd }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  useEffect(() => {
    if (visible) setText('');
  }, [visible]);

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    onAdd(v);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('profile.addInterestTitle')}</Text>
            <Text style={styles.body}>{t('profile.addInterestBody', { count: MAX_INTERESTS })}</Text>
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder={t('profile.addInterestPlaceholder')}
              placeholderTextColor={colors.gray[700]}
              autoFocus
              autoCorrect={false}
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </View>
          <Pressable
            style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
            onPress={submit}
            disabled={!text.trim()}
          >
            <Text style={[styles.textBtnLabel, !text.trim() && styles.textBtnDisabled]}>
              {t('profile.add')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: 300,
    backgroundColor: colors.surface.card,
    borderRadius: 24,
    overflow: 'hidden',
    paddingBottom: spacing[1],
  },
  header: { paddingTop: 28, paddingHorizontal: spacing[5], gap: 10, alignItems: 'center' },
  title: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: colors.gray[1400],
    textAlign: 'center',
  },
  body: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1400],
    textAlign: 'center',
  },
  inputWrap: { paddingTop: spacing[3], paddingHorizontal: spacing[5] },
  input: {
    backgroundColor: colors.surface.soft,
    borderRadius: 12,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  textBtn: {
    marginHorizontal: spacing[5],
    marginVertical: spacing[1],
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtnPressed: { backgroundColor: colors.surface.soft },
  textBtnLabel: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.blue[500],
  },
  textBtnDisabled: { color: colors.gray[600] },
});
