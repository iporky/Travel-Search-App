import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { AskComment, AskPost } from '../../types/ask';
import { MomentAvatar } from '../../components/moments/MomentCard';

type Props = {
  post: AskPost;
  liked: boolean;
  onBack: () => void;
  onToggleLike: () => void;
  onPressMore: () => void;
  onPressCommentMore: (comment: AskComment) => void;
  onReply: (text: string) => void;
};

function AuthorRow({
  author,
  time,
  onMore,
}: {
  author: string;
  time: string;
  onMore?: () => void;
}) {
  return (
    <View style={styles.authorRow}>
      <View style={styles.authorLeft}>
        <MomentAvatar name={author} />
        <Text style={styles.username} numberOfLines={1}>{author}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.meta}>{time}</Text>
      </View>
      {onMore && (
        <Pressable hitSlop={6} onPress={onMore}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.icon.disabled} />
        </Pressable>
      )}
    </View>
  );
}

function CommentItem({
  comment,
  onMore,
}: {
  comment: AskComment;
  onMore: (c: AskComment) => void;
}) {
  const [liked, setLiked] = useState(false);
  return (
    <View>
      <AuthorRow author={comment.author} time={comment.time} onMore={() => onMore(comment)} />
      <View style={styles.commentBody}>
        <Text style={styles.commentText}>{comment.text}</Text>
        <Pressable style={styles.likeRow} hitSlop={4} onPress={() => setLiked((v) => !v)}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? colors.red[100] : colors.icon.disabled}
          />
          <Text style={styles.count}>{comment.likes + (liked ? 1 : 0)}</Text>
        </Pressable>
      </View>

      {comment.replies?.map((reply) => (
        <View key={reply.id} style={styles.replyWrap}>
          {/* Threaded-reply connector (Figma "Comment line"). */}
          <View style={styles.replyLine} />
          <View style={styles.replyContent}>
            <CommentItem comment={reply} onMore={onMore} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Figma: "Ping_Browse" post detail (node 11452:64977 / 65009) — question with
// body, author row, engagement counts, then the threaded answers and a reply bar.
export function AskDetailView({
  post,
  liked,
  onBack,
  onToggleLike,
  onPressMore,
  onPressCommentMore,
  onReply,
}: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const send = () => {
    if (!draft.trim()) return;
    onReply(draft.trim());
    setDraft('');
  };

  return (
    <KeyboardStickyView style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>{t('ask.title')}</Text>
        <Pressable style={styles.backBtn} hitSlop={6} onPress={onPressMore}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.icon.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.post}>
          <Text style={styles.category}>{post.category}</Text>
          <Text style={styles.questionTitle}>{post.title}</Text>
          {!!post.body && <Text style={styles.questionBody}>{post.body}</Text>}

          <View style={styles.postMetaRow}>
            <View style={styles.authorLeft}>
              <MomentAvatar name={post.author} />
              <Text style={styles.username}>{post.author}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.meta}>{post.time}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.meta}>{post.location}</Text>
            </View>
          </View>

          <View style={styles.postActions}>
            <Pressable style={styles.likeRow} hitSlop={4} onPress={onToggleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? colors.red[100] : colors.icon.disabled}
              />
              <Text style={styles.count}>{post.likes + (liked ? 1 : 0)}</Text>
            </Pressable>
            <View style={styles.likeRow}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.icon.disabled} />
              <Text style={styles.count}>{post.comments.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.comments}>
          {post.comments.map((c) => (
            <CommentItem key={c.id} comment={c} onMore={onPressCommentMore} />
          ))}
          {post.comments.length === 0 && (
            <Text style={styles.empty}>{t('ask.noAnswers')}</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <MomentAvatar name="me" size={24} />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('ask.writeAnswer')}
          placeholderTextColor={colors.gray[900]}
          onSubmitEditing={send}
          returnKeyType="send"
          blurOnSubmit={false}
        />
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  scroll: { paddingBottom: spacing[4] },
  post: { paddingHorizontal: spacing[5], paddingBottom: spacing[3], gap: spacing[1] },
  category: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[1000],
  },
  questionTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  questionBody: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
    marginTop: spacing[1],
  },
  postMetaRow: { marginTop: spacing[2] },
  postActions: { flexDirection: 'row', gap: spacing[3], marginTop: spacing[1] },
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
  divider: { height: 4, backgroundColor: colors.surface.subtle, opacity: 0.9 },
  comments: { paddingHorizontal: spacing[3], paddingTop: spacing[2], gap: spacing[3] },
  commentBody: { paddingLeft: spacing[6], gap: spacing[2] },
  commentText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  count: {
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
