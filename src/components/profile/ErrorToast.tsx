import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

// Figma "Notification" (12276:94894, Profile_Alert_MaxInterests): red
// (#e62d3c) pill, radius 16, pl 12 / pr 24 / py 12, 24px Google "error" icon
// + 16/SemiBold white text, centred on a 60% scrim. Auto-dismisses after 3 s
// (interaction annotation); tapping the scrim dismisses early.

type Props = {
  visible: boolean;
  message: string;
  onHide: () => void;
  durationMs?: number;
};

export function ErrorToast({ visible, message, onHide, durationMs = 3000 }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    const id = setTimeout(onHide, durationMs);
    return () => clearTimeout(id);
  }, [visible, durationMs, onHide, opacity]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onHide}>
      <Pressable style={styles.scrim} onPress={onHide} />
      <View style={styles.center} pointerEvents="box-none">
        <Animated.View style={[styles.toast, { opacity }]}>
          <MaterialIcons name="error-outline" size={24} color={colors.surface.card} />
          <Text style={styles.text} numberOfLines={2}>
            {message}
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[8] },
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
