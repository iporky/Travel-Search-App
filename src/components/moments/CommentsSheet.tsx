import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { Moment, MomentComment } from '../../types/moments';
import { MomentAvatar } from './MomentCard';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import { LoadingImage } from '../LoadingImage';

type Props = {
  visible: boolean;
  moment: Moment | null;
  onClose: () => void;
};

/** Heart + comment count row shown under the post and every comment. */
function ActionCounts({ likes, comments }: { likes: number; comments: number }) {
  const [liked, setLiked] = useState(false);
  return (
    <View style={styles.actionRow}>
      <Pressable style={styles.actionItem} hitSlop={4} onPress={() => setLiked((v) => !v)}>
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={20}
          color={liked ? colors.red[100] : colors.icon.disabled}
        />
        <Text style={styles.countText}>{likes + (liked ? 1 : 0)}</Text>
      </Pressable>
      <View style={styles.actionItem}>
        <Ionicons name="chatbubble-outline" size={18} color={colors.icon.disabled} />
        <Text style={styles.countText}>{comments}</Text>
      </View>
    </View>
  );
}

/** Author row: avatar, username, • time, ••• menu — shared by post + comments. */
function AuthorRow({ author, time }: { author: string; time: string }) {
  return (
    <View style={styles.authorRow}>
      <View style={styles.authorLeft}>
        <MomentAvatar name={author} />
        <Text style={styles.username} numberOfLines={1}>{author}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.meta}>{time}</Text>
      </View>
      <Pressable hitSlop={6}>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.icon.disabled} />
      </Pressable>
    </View>
  );
}

function CommentItem({ comment }: { comment: MomentComment }) {
  return (
    <View>
      <AuthorRow author={comment.author} time={comment.time} />
      <View style={styles.commentBody}>
        <Text style={styles.commentText}>{comment.text}</Text>
        <ActionCounts likes={comment.likes} comments={comment.commentCount} />
      </View>

      {comment.replies?.map((reply) => (
        <View key={reply.id} style={styles.replyWrap}>
          {/* Threaded-reply connector (Figma "Comment line"). */}
          <View style={styles.replyLine} />
          <View style={styles.replyContent}>
            <AuthorRow author={reply.author} time={reply.time} />
            <View style={styles.commentBody}>
              <Text style={styles.commentText}>{reply.text}</Text>
              <ActionCounts likes={reply.likes} comments={reply.commentCount} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// Figma: comments bottom sheet (node 11452:71442) — drag handle, post content,
// divider, threaded comments, "Write a reply..." input pinned at the bottom.
export function CommentsSheet({ visible, moment, onClose }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const insets = useSafeAreaInsets();
  // Clear the on-screen nav bar when the keyboard is down; the keyboard already
  // covers it when up.
  const barBottom = keyboardHeight > 0 ? spacing[3] : spacing[3] + insets.bottom;

  if (!moment) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      {/* Lift the sheet above the keyboard so the reply input stays visible and
          focused — Android Modals don't resize with adjustResize. */}
      <View style={[styles.sheetWrap, { paddingBottom: keyboardHeight }]} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Post recap */}
            <View style={styles.post}>
              <AuthorRow author={moment.author} time={moment.time} />
              <View style={styles.postBody}>
                {moment.photos.length > 0 && (
                  <LoadingImage source={{ uri: moment.photos[0] }} style={styles.postPhoto} showSpinner={false} />
                )}
                <Text style={styles.commentText}>{moment.text}</Text>
                <ActionCounts likes={moment.likes} comments={moment.comments.length} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.comments}>
              {moment.comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
              {moment.comments.length === 0 && (
                <Text style={styles.empty}>{t('moments.noComments')}</Text>
              )}
            </View>
          </ScrollView>

          {/* Reply input */}
          <View style={[styles.inputBar, { paddingBottom: barBottom }]}>
            <MomentAvatar name="me" size={24} />
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('moments.writeReply')}
              placeholderTextColor={colors.gray[900]}
              onSubmitEditing={() => setDraft('')}
              returnKeyType="send"
              blurOnSubmit={false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(29,25,43,0.4)',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.surface.default,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.gray[700],
  },
  scroll: { paddingBottom: spacing[3] },
  post: { paddingHorizontal: spacing[5], paddingBottom: spacing[3] },
  postBody: { paddingLeft: spacing[6], gap: spacing[2] },
  postPhoto: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  divider: { height: 4, backgroundColor: colors.surface.subtle, opacity: 0.9 },
  comments: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    gap: spacing[3],
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  authorLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flex: 1, minWidth: 0 },
  username: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
    marginLeft: 2,
  },
  dot: { fontSize: 11, color: colors.gray[900] },
  meta: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
  commentBody: { paddingLeft: spacing[6], gap: spacing[2] },
  commentText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  countText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[700],
  },
  replyWrap: { flexDirection: 'row', paddingLeft: spacing[2], marginTop: spacing[2] },
  replyLine: {
    width: spacing[4],
    marginTop: -spacing[2],
    marginBottom: 48,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.blue[150],
    borderBottomLeftRadius: radius.md,
  },
  replyContent: { flex: 1 },
  empty: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    color: colors.gray[800],
    textAlign: 'center',
    paddingVertical: spacing[5],
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.default,
    borderTopWidth: 1,
    borderTopColor: colors.blue[150],
  },
  input: {
    flex: 1,
    backgroundColor: colors.blue[150],
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    letterSpacing: -0.13,
    color: colors.gray[1300],
  },
});
