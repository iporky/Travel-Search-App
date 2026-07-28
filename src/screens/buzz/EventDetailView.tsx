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
import { VibeEvent } from '../../types/vibes';
import { MomentAvatar } from '../../components/moments/MomentCard';

type Props = {
  event: VibeEvent;
  liked: boolean;
  onBack: () => void;
  onToggleLike: () => void;
  onJoin: () => void;
  onPressMore: () => void;
  onPressCommentMore: (comment: AskComment) => void;
  onReply: (text: string) => void;
};

function formatCount(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

function CommentItem({ comment, onMore }: { comment: AskComment; onMore: (c: AskComment) => void }) {
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

// Figma: "VibesEventDetail_WithPhoto" (node 11478:76709) — image pager (n/N
// badge), author row, caption, location + date, like/comment counts, a big Join
// button, then the comment thread and a reply bar.
export function EventDetailView({
  event,
  liked,
  onBack,
  onToggleLike,
  onJoin,
  onPressMore,
  onPressCommentMore,
  onReply,
}: Props) {
  const { t } = useTranslation();
  const width = Dimensions.get('window').width;
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState('');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

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
      </View>

      <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
        {/* Image pager with n/N badge */}
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScroll}
          >
            {event.photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width, height: width * 1.05 }} />
            ))}
          </ScrollView>
          <View style={styles.pageBadge}>
            <Text style={styles.pageBadgeText}>
              {page + 1}/{event.photos.length}
            </Text>
          </View>
        </View>

        {/* Author + caption + meta */}
        <View style={styles.body}>
          <View style={styles.authorRow}>
            <View style={styles.authorLeft}>
              <MomentAvatar name={event.host} size={28} />
              <Text style={styles.hostName}>{event.host}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.meta}>{event.dateLabel}</Text>
            </View>
            <View style={styles.authorRight}>
              <View style={styles.likeRow}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.icon.disabled} />
                <Text style={styles.count}>{event.comments.length}</Text>
              </View>
              <Pressable hitSlop={6} onPress={onPressMore}>
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.icon.primary} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.caption}>{event.caption}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color={colors.icon.accent} />
              <Text style={styles.metaText}>{event.place}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.icon.accent} />
              <Text style={styles.metaText}>{event.dateLabel}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.icon.accent} />
              <Text style={styles.metaText}>{event.time}</Text>
            </View>
          </View>

          <View style={styles.socialRow}>
            <Pressable style={styles.likeRow} hitSlop={4} onPress={onToggleLike}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={20}
                color={liked ? colors.red[100] : colors.icon.disabled}
              />
              <Text style={styles.count}>{formatCount(event.likes + (liked ? 1 : 0))}</Text>
            </Pressable>
            <View style={styles.likeRow}>
              <Ionicons name="people-outline" size={18} color={colors.icon.disabled} />
              <Text style={styles.count}>
                {event.limit ? `${event.participantCount}/${event.limit}` : event.participantCount}
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.joinBtn, event.joined && styles.joinedBtn]}
            onPress={onJoin}
          >
            <Text style={[styles.joinText, event.joined && styles.joinedText]}>
              {event.joined ? t('vibes.joined') : t('vibes.join')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.comments}>
          {event.comments.map((c) => (
            <CommentItem key={c.id} comment={c} onMore={onPressCommentMore} />
          ))}
          {event.comments.length === 0 && (
            <Text style={styles.empty}>{t('vibes.noComments')}</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.inputBar}>
        <MomentAvatar name="me" size={24} />
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('vibes.writeComment')}
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
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  pageBadge: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  pageBadgeText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    color: colors.gray[100],
  },
  body: { paddingHorizontal: spacing[5], paddingVertical: spacing[3], gap: spacing[2] },
  authorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  authorLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flex: 1, minWidth: 0 },
  authorRight: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  hostName: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
    marginLeft: 2,
  },
  title: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.gray[1300],
    marginTop: spacing[1],
  },
  caption: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4], marginTop: spacing[1] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  metaText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[1000],
  },
  socialRow: { flexDirection: 'row', gap: spacing[5], marginTop: spacing[1] },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  count: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[700],
  },
  joinBtn: {
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  joinedBtn: { backgroundColor: colors.surface.subtle },
  joinText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
  joinedText: { color: colors.gray[700] },
  divider: { height: 4, backgroundColor: colors.surface.subtle, opacity: 0.9 },
  comments: { paddingHorizontal: spacing[3], paddingTop: spacing[2], gap: spacing[3] },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
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
