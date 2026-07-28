import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { MomentAvatar } from '../moments/MomentCard';

type Props = {
  category: string;
  time: string;
  question: string;
  answer?: string;
  likes: number;
  comments: number;
  asker: string;
  answerer?: string;
  onPress: () => void;
};

// Sized off the window so the next card peeks on every device. The Figma frame
// was 375pt wide; a hardcoded 304 left dead space on large phones and almost no
// peek on small ones.
const { width: WINDOW_W } = Dimensions.get('window');
export const CONVERSATION_CARD_WIDTH = Math.min(320, Math.round(WINDOW_W * 0.82));

// Figma: "Comment Card" (node 11404:78972) — Q&A thread preview: category + time,
// the question bubble (left, light) with a reply bubble below-right (accent),
// each with its author avatar, then like/comment counts.
//
// Laid out as flowing rows rather than the absolute positions in the Figma
// frame: a 3-line answer overflowed the fixed-height box and collided with the
// action row.
export function ConversationCard({
  category,
  time,
  question,
  answer,
  likes,
  comments,
  asker,
  answerer,
  onPress,
}: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.category} numberOfLines={1}>
          {category}
        </Text>
        <Text style={styles.time} numberOfLines={1}>
          {time}
        </Text>
      </View>

      <View style={styles.messages}>
        <View style={styles.questionRow}>
          <MomentAvatar name={asker} size={24} />
          <View style={styles.questionBubble}>
            <Text style={styles.bubbleText} numberOfLines={2}>
              {question}
            </Text>
          </View>
        </View>

        {!!answer && (
          <View style={styles.answerRow}>
            <View style={styles.answerBubble}>
              <Text style={styles.bubbleText} numberOfLines={3}>
                {answer}
              </Text>
            </View>
            <MomentAvatar name={answerer ?? asker} size={24} />
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <Ionicons name="heart-outline" size={20} color={colors.icon.disabled} />
          <Text style={styles.count}>{likes}</Text>
        </View>
        <View style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.icon.disabled} />
          <Text style={styles.count}>{comments}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CONVERSATION_CARD_WIDTH,
    backgroundColor: colors.gray[100],
    borderRadius: radius.lg,
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
  },
  category: {
    flexShrink: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.blue[500],
  },
  time: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.22,
    color: colors.gray[700],
  },
  messages: {
    marginTop: spacing[4],
    marginHorizontal: spacing[4],
    gap: spacing[2],
  },
  questionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[1] },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: spacing[1],
  },
  questionBubble: {
    flexShrink: 1,
    backgroundColor: colors.surface.default,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    borderBottomLeftRadius: 0,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
  },
  answerBubble: {
    flexShrink: 1,
    backgroundColor: colors.surface.subtle,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: 0,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 2,
  },
  bubbleText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    marginTop: spacing[3],
  },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  count: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
});
