import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';

type Props = {
  visible: boolean;
  title: string;
  initial?: number;
  min?: number;
  onCancel: () => void;
  onConfirm: (value: number) => void;
};

// Figma: "Number of People" stepper (node 11478:76547 join / participants) —
// − <N> + with a Confirm button.
export function NumberStepperDialog({
  visible,
  title,
  initial = 24,
  min = 1,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initial);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} />
      <View style={styles.wrap} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: spacing[6] + insets.bottom }]}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.stepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setValue((v) => Math.max(min, v - 1))}
            >
              <Ionicons name="remove" size={24} color={colors.blue[500]} />
            </Pressable>
            <Text style={styles.value}>{value}</Text>
            <Pressable style={styles.stepBtn} onPress={() => setValue((v) => v + 1)}>
              <Ionicons name="add" size={24} color={colors.blue[500]} />
            </Pressable>
          </View>
          <Pressable style={styles.confirm} onPress={() => onConfirm(value)}>
            <Text style={styles.confirmText}>{t('common.confirm')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(29,25,43,0.4)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.gray[100],
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing[6],
    paddingBottom: spacing[10],
    alignItems: 'center',
    gap: spacing[5],
  },
  title: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.22,
    color: colors.gray[1300],
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing[6] },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 44,
    lineHeight: 52,
    letterSpacing: -1,
    color: colors.gray[1300],
    minWidth: 90,
    textAlign: 'center',
  },
  confirm: {
    width: '100%',
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
});
