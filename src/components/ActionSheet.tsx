import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { CameraIcon, DocumentIcon } from 'react-native-heroicons/solid';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCamera?: () => void;
  onFile?: () => void;
};

export function ActionSheet({ visible, onClose, onCamera, onFile }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
      </Pressable>
      <View pointerEvents="box-none" style={styles.container}>
        <View style={styles.sheet}>
          <Pressable
            onPress={() => {
              onCamera?.();
              onClose();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <View style={styles.iconWrap}>
              <CameraIcon size={22} color={colors.icon.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body16Medium, { color: colors.text.primary }]}>Camera</Text>
              <Text style={[typography.caption12Regular, { color: colors.text.disabled }]}>
                Capture a photo
              </Text>
            </View>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() => {
              onFile?.();
              onClose();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            <View style={styles.iconWrap}>
              <DocumentIcon size={22} color={colors.icon.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body16Medium, { color: colors.text.primary }]}>File</Text>
              <Text style={[typography.caption12Regular, { color: colors.text.disabled }]}>
                Pick from gallery or files
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  sheet: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: radius['3xl'],
    padding: spacing[2],
    ...shadows.cardSelected,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius['2xl'],
  },
  optionPressed: { backgroundColor: colors.surface.focus },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.surface.subtle, marginHorizontal: spacing[3] },
});
