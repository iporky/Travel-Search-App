import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import { AnimatedModal } from '../AnimatedModal';
import { PressableScale } from '../PressableScale';

export type SheetItem = {
  label: string;
  /** Renders bold red (Delete / Report). */
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  items: SheetItem[];
  onClose: () => void;
};

// Figma: shared `.action-sheet-body` (BottomSheet, node 10553:73179).
// Owner sheet → Edit / Delete / Cancel. Viewer sheet → Delete / Report / Cancel.
// Items are white rows separated by #eee hairlines, Cancel sits in its own group.
export function ActionSheetMenu({ visible, items, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} variant="sheet" scrimColor="rgba(29,25,43,0.4)">
        <View style={styles.sheet}>
          <View style={styles.group}>
            {items.map((item) => (
              <PressableScale
                key={item.label}
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              >
                <Text style={item.destructive ? styles.destructiveText : styles.itemText}>
                  {item.label}
                </Text>
              </PressableScale>
            ))}
          </View>

          <View style={[styles.cancelGroup, { paddingBottom: insets.bottom }]}>
            <PressableScale
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={onClose}
            >
              <Text style={styles.itemText}>{t('common.cancel')}</Text>
            </PressableScale>
          </View>
        </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface.default,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    overflow: 'hidden',
  },
  group: { backgroundColor: colors.gray[100] },
  cancelGroup: { paddingTop: spacing[2], backgroundColor: colors.surface.default },
  item: {
    backgroundColor: colors.gray[100],
    padding: spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  itemPressed: { backgroundColor: colors.surface.soft },
  itemText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: colors.gray[1300],
  },
  destructiveText: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    textAlign: 'center',
    color: colors.red[100],
  },
});
