import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { MomentAvatar } from '../moments/MomentCard';

type Props = {
  names: string[];
  total: number;
  size?: number;
};

// Stacked participant avatars with a trailing "+N" count.
export function AvatarStack({ names, total, size = 24 }: Props) {
  const shown = names.slice(0, 3);
  const extra = total - shown.length;
  return (
    <View style={styles.row}>
      <View style={styles.stack}>
        {shown.map((name, i) => (
          <View key={name} style={[styles.avatarWrap, { marginLeft: i === 0 ? 0 : -size / 3 }]}>
            <MomentAvatar name={name} size={size} />
          </View>
        ))}
      </View>
      {extra > 0 && <Text style={styles.count}>+{extra}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  stack: { flexDirection: 'row' },
  avatarWrap: {
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.gray[100],
  },
  count: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.blue[500],
  },
});
