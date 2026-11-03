import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import { AnimatedModal } from '../AnimatedModal';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
};

/** Report reasons, in the order the design lists them. */
const REASON_KEYS = ['sexual', 'violent', 'hateful', 'harmful', 'spam'] as const;

// Figma: Report dialog (node 11336:76559) — radio list of reasons with
// Cancel / Report buttons aligned bottom-right.
export function ReportDialog({ visible, onCancel, onSubmit }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string>(REASON_KEYS[0]);

  return (
    <AnimatedModal visible={visible} onRequestClose={onCancel} variant="dialog" scrimColor="rgba(29,25,43,0.45)">
        <View style={styles.card}>
          <Text style={styles.title}>{t('report.title')}</Text>

          <View style={styles.options}>
            {REASON_KEYS.map((key) => {
              const checked = selected === key;
              return (
                <Pressable key={key} style={styles.option} onPress={() => setSelected(key)}>
                  <View style={[styles.radio, checked && styles.radioChecked]}>
                    {checked && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.optionLabel}>{t(`report.reasons.${key}`)}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, styles.cancelBtn]} onPress={onCancel}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.submitBtn]}
              onPress={() => onSubmit(selected)}
            >
              <Text style={styles.submitText}>{t('report.title')}</Text>
            </Pressable>
          </View>
        </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '88%',
    maxWidth: 340,
    backgroundColor: colors.gray[100],
    borderRadius: radius['2xl'],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[5],
    gap: spacing[3],
  },
  title: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: colors.gray[1400],
  },
  options: { gap: spacing[1] },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: 6 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.gray[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: { borderColor: colors.blue[500] },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.blue[500],
  },
  optionLabel: {
    flex: 1,
    fontFamily: 'NationalPark_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'flex-end',
    marginTop: spacing[1],
  },
  button: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: colors.surface.soft },
  submitBtn: { backgroundColor: colors.blue[500] },
  cancelText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1000],
  },
  submitText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
});
