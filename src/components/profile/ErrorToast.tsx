import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AnimatedModal } from '../AnimatedModal';
import { colors, spacing } from '../../theme/tokens';

// Figma "Notification" (12276:94894, Profile_Alert_MaxInterests): red
// (#e62d3c) pill, radius 16, pl 12 / pr 24 / py 12, 24px Google "error" icon
// + 16/SemiBold white text, centred on a 60% scrim. Auto-dismisses after 3 s
// (interaction annotation); tapping the scrim dismisses early. The reveal and
// the dismiss are AnimatedModal's dialog motion (scale + fade, scrim fades).

type Props = {
  visible: boolean;
  message: string;
  onHide: () => void;
  durationMs?: number;
};

export function ErrorToast({ visible, message, onHide, durationMs = 3000 }: Props) {
  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(onHide, durationMs);
    return () => clearTimeout(id);
  }, [visible, durationMs, onHide]);

  return (
    <AnimatedModal visible={visible} variant="dialog" scrimColor="rgba(0,0,0,0.6)" onRequestClose={onHide}>
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.toast}>
          <MaterialIcons name="error-outline" size={24} color={colors.surface.card} />
          <Text style={styles.text} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[8] },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.red[100],
    borderRadius: 16,
    paddingLeft: spacing[3],
    paddingRight: spacing[6],
    paddingVertical: spacing[3],
    maxWidth: '100%',
  },
  text: {
    flexShrink: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.card,
  },
});
