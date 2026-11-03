import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { AnimatedModal } from '../AnimatedModal';
import { PressableScale } from '../PressableScale';

type Props = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  /** Provide to render the two-button (Cancel + destructive) layout. */
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

// Figma: "Confirmation Modal" / Dialog (node 11336:81335, 10438:49073).
//   • Two-button destructive  → "Delete this post?" / Cancel + Delete
//   • Single-CTA acknowledge  → "Ask submitted" / Done, "Report submitted" / Confirm
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: Props) {
  const twoButton = cancelLabel != null;

  return (
    <AnimatedModal visible={visible} onRequestClose={onCancel ?? onConfirm} variant="dialog" scrimColor="rgba(29,25,43,0.45)" dismissOnScrim={onCancel != null}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>

          {twoButton ? (
            <View style={styles.buttonRow}>
              <PressableScale style={[styles.button, styles.cancelBtn]} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelLabel}</Text>
              </PressableScale>
              <PressableScale
                style={[styles.button, destructive ? styles.destructiveBtn : styles.primaryBtn]}
                onPress={onConfirm}
              >
                <Text style={styles.onAccentText}>{confirmLabel}</Text>
              </PressableScale>
            </View>
          ) : (
            <View style={styles.ctaWrap}>
              <PressableScale style={styles.ctaBtn} onPress={onConfirm}>
                <Text style={styles.onAccentText}>{confirmLabel}</Text>
              </PressableScale>
            </View>
          )}
        </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  // Figma Dialog (11336:76233): 300 wide, radius 24, header pt 28 / px 20.
  card: {
    width: 300,
    maxWidth: '92%',
    backgroundColor: colors.gray[100],
    borderRadius: radius['2xl'],
    overflow: 'hidden',
  },
  header: {
    paddingTop: spacing[7],
    paddingHorizontal: spacing[5],
    gap: 10,
  },
  title: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: colors.gray[1400],
  },
  body: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  button: {
    flex: 1,
    padding: spacing[3],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: colors.surface.soft },
  destructiveBtn: { backgroundColor: colors.red[100] },
  primaryBtn: { backgroundColor: colors.blue[500] },
  cancelText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1000],
  },
  onAccentText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
  ctaWrap: { paddingHorizontal: spacing[5], paddingVertical: spacing[4] },
  ctaBtn: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
  },
});
