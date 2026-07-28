import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
import { AskComment } from '../../types/ask';
import { Drop } from '../../types/drops';
import { MomentAvatar } from '../../components/moments/MomentCard';

type Props = {
  drop: Drop;
  liked: boolean;
  onBack: () => void;
  onToggleLike: () => void;
  onPressMore: () => void;
  onPressCommentMore: (comment: AskComment) => void;
  onReply: (text: string) => void;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
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
      <View style={styles.commentHeader}>
        <View style={styles.authorLeft}>
          <MomentAvatar name={comment.author} />
          <Text style={styles.username} numberOfLines={1}>{comment.author}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.meta}>{comment.time}</Text>
        </View>
        <Pressable hitSlop={6} onPress={() => onMore(comment)}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.icon.disabled} />
        </Pressable>
      </View>
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
    </View>
  );
}

// Figma: "DropDetail_ImageCarousel" (node 11478:75704) — swipeable image pager
// with page dots + header (author, ...), caption, view/like counts, then the
// comment thread and a reply bar.
export function DropDetailView({
  drop,
  liked,
  onBack,
  onToggleLike,
  onPressMore,
  onPressCommentMore,
  onReply,
}: Props) {
  const { t } = useTranslation();
  const width = Dimensions.get('window').width;
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState('');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const send = () => {
    if (!draft.trim()) return;
    onReply(draft.trim());
    setDraft('');
  };

  return (
    <KeyboardStickyView style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <View style={styles.authorLeft}>
          <MomentAvatar name={drop.author} size={28} />
          <View>
            <Text style={styles.topAuthor}>{drop.author}</Text>
            <Text style={styles.meta}>
              {drop.time} • {drop.location}
            </Text>
          </View>
        </View>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={onPressMore}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.icon.primary} />
        </Pressable>
      </View>

      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
        {/* Swipeable image pager */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
          >
            {drop.photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width, height: width * 1.27 }} />
            ))}
          </ScrollView>
          {drop.photos.length > 1 && (
            <View style={styles.dots}>
              {drop.photos.map((uri, i) => (
                <View key={uri} style={[styles.dot2, i === page && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>

        {/* Caption + view/like counts */}
        <View style={styles.postContent}>
          <Text style={styles.caption}>{drop.caption}</Text>
          <View style={styles.socialBar}>
            <View style={styles.socialItem}>
              <Ionicons name="eye-outline" size={18} color={colors.icon.disabled} />
              <Text style={styles.count}>{formatCount(drop.views)}</Text>
            </View>
            <Pressable style={styles.socialItem} hitSlop={4} onPress={onToggleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={18}
                color={liked ? colors.red[100] : colors.icon.disabled}
              />
              <Text style={styles.count}>{formatCount(drop.likes + (liked ? 1 : 0))}</Text>
            </Pressable>
            <View style={styles.socialItem}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.icon.disabled} />
              <Text style={styles.count}>{drop.comments.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.comments}>
          {drop.comments.map((c) => (
            <CommentItem key={c.id} comment={c} onMore={onPressCommentMore} />
          ))}
          {drop.comments.length === 0 && (
            <Text style={styles.empty}>{t('drops.noComments')}</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <MomentAvatar name="me" size={24} />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('drops.writeComment')}
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[1],
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  authorLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  topAuthor: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.14,
    color: colors.gray[1200],
  },
  dots: {
    position: 'absolute',
    bottom: spacing[3],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[1],
  },
  dot2: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: { backgroundColor: colors.gray[100] },
  postContent: { paddingHorizontal: spacing[5], paddingVertical: spacing[3], gap: spacing[2] },
  caption: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  socialBar: { flexDirection: 'row', gap: spacing[5] },
  socialItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  divider: { height: 4, backgroundColor: colors.surface.subtle, opacity: 0.9 },
  comments: { paddingHorizontal: spacing[3], paddingTop: spacing[2], gap: spacing[3] },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  authorLeftInline: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  commentBody: { paddingLeft: spacing[6], gap: spacing[2] },
  commentText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
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
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  count: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[700],
  },
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
