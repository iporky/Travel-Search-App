import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import { MomentAvatar } from '../moments/MomentCard';

type Props = {
  title: string;
  time: string;
  author: string;
  onPress: () => void;
  onJoin: () => void;
};

// Sized off the window so the next card peeks on every device (the Figma frame
// was 375pt wide; a hardcoded 304 didn't scale).
const { width: WINDOW_W } = Dimensions.get('window');
export const MESSAGE_CARD_WIDTH = Math.min(320, Math.round(WINDOW_W * 0.82));

// Figma: "Message Card" (node 10122:51895) — prompt inviting the user to join a
// discussion. Rounded except top-left, avatar top-left, Join pill bottom-right.
//
// Laid out as flowing rows rather than the absolute Figma coordinates: a 3-line
// title ran straight into the time + Join row.
export function MessagePreviewCard({ title, time, author, onPress, onJoin }: Props) {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <MomentAvatar name={author} />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={3}>
            {title}
          </Text>
          <View style={styles.footer}>
            <Text style={styles.time} numberOfLines={1}>
              {time}
            </Text>
            <Pressable style={styles.joinBtn} onPress={onJoin} hitSlop={6}>
              <Text style={styles.joinText}>{t('ping.join')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: MESSAGE_CARD_WIDTH,
    minHeight: 132,
    backgroundColor: colors.gray[100],
    borderTopLeftRadius: 0,
    borderTopRightRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    padding: spacing[4],
  },
  row: { flexDirection: 'row', gap: spacing[3], flex: 1 },
  body: { flex: 1, justifyContent: 'space-between', gap: spacing[2] },
  title: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  time: {
    flexShrink: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[700],
  },
  joinBtn: {
    backgroundColor: colors.blue[500],
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  joinText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[100],
  },
});
