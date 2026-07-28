import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { AskComment, AskPost, AskSort } from '../../types/ask';
import { askCategories, askFeed } from '../../mocks/ask';
import { AskCard } from '../../components/buzz/AskCard';
import { ActionSheetMenu, SheetItem } from '../../components/buzz/ActionSheetMenu';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { ReportDialog } from '../../components/buzz/ReportDialog';
import { AskDetailView } from './AskDetailView';
import { AskComposeView } from './AskComposeView';

type Mode =
  | { kind: 'feed' }
  | { kind: 'detail'; id: string }
  | { kind: 'compose' }
  | { kind: 'edit'; id: string };

/** Which confirmation dialog is currently up. */
type Dialog =
  | null
  | { kind: 'deletePost'; id: string }
  | { kind: 'deleteComment'; id: string }
  | { kind: 'submitted' }
  | { kind: 'reportPick' }
  | { kind: 'reported' };

type Props = {
  authorName: string;
  /** "Just in" See all → New, "Join the conversation" See all → Popular. */
  initialSort?: AskSort;
  /** Opened straight onto a post from a Ping home carousel card. */
  initialPostId?: string;
  /** Back out of the section to the Ping home. */
  onBack: () => void;
  /** Detail/compose are full screens — the parent hides the tab bar. */
  onFullScreen?: (full: boolean) => void;
};

/** Remove a comment (or nested reply) by id. */
function removeComment(comments: AskComment[], id: string): AskComment[] {
  return comments
    .filter((c) => c.id !== id)
    .map((c) => (c.replies ? { ...c, replies: removeComment(c.replies, id) } : c));
}

// Figma "Ask" section (node 11452:64914) — feed → detail → compose/edit, plus the
// owner (Edit/Delete) and viewer (Delete/Report) action sheets and their
// confirmation dialogs. All state is local; the backend wiring is pending.
export function AskSection({ authorName, initialSort, initialPostId, onBack, onFullScreen }: Props) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<AskPost[]>(askFeed);
  const [mode, setMode] = useState<Mode>(
    initialPostId ? { kind: 'detail', id: initialPostId } : { kind: 'feed' },
  );
  const [sort, setSort] = useState<AskSort>(initialSort ?? 'New');
  const [category, setCategory] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, boolean>>({});

  const [sheetFor, setSheetFor] = useState<AskPost | null>(null);
  const [commentSheetFor, setCommentSheetFor] = useState<AskComment | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  // Detail/compose/edit are full-screen — the parent hides the tab bar.
  useEffect(() => onFullScreen?.(mode.kind !== 'feed'), [mode.kind, onFullScreen]);

  // Back inside detail/compose/edit returns to the feed, not out of the section.
  useEffect(() => {
    if (mode.kind === 'feed') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode({ kind: 'feed' });
      return true;
    });
    return () => sub.remove();
  }, [mode.kind]);

  const feed = useMemo(() => {
    const filtered = category ? posts.filter((p) => p.category === category) : posts;
    return sort === 'Popular' ? [...filtered].sort((a, b) => b.likes - a.likes) : filtered;
  }, [posts, category, sort]);

  const current = mode.kind === 'detail' || mode.kind === 'edit'
    ? posts.find((p) => p.id === mode.id) ?? null
    : null;

  const toggleLike = (id: string) => setLikes((m) => ({ ...m, [id]: !m[id] }));

  const createPost = (text: string) => {
    const post: AskPost = {
      id: `a${Date.now()}`,
      category: category ?? askCategories[0],
      title: text,
      author: authorName,
      time: t('ask.justNow'),
      location: 'Seoul',
      likes: 0,
      isMine: true,
      comments: [],
    };
    setPosts((p) => [post, ...p]);
    setMode({ kind: 'feed' });
    setDialog({ kind: 'submitted' });
  };

  const savePost = (id: string, text: string) => {
    setPosts((p) => p.map((x) => (x.id === id ? { ...x, title: text } : x)));
    setMode({ kind: 'detail', id });
  };

  const deletePost = (id: string) => {
    setPosts((p) => p.filter((x) => x.id !== id));
    setMode({ kind: 'feed' });
    setDialog(null);
  };

  const addReply = (postId: string, text: string) => {
    const reply: AskComment = {
      id: `c${Date.now()}`,
      author: authorName,
      time: t('ask.justNow'),
      text,
      likes: 0,
      isMine: true,
    };
    setPosts((p) =>
      p.map((x) => (x.id === postId ? { ...x, comments: [...x.comments, reply] } : x)),
    );
  };

  const deleteComment = (id: string) => {
    setPosts((p) => p.map((x) => ({ ...x, comments: removeComment(x.comments, id) })));
    setDialog(null);
  };

  /** Owner → Edit + Delete. Viewer → Report. */
  const postSheetItems = (post: AskPost): SheetItem[] =>
    post.isMine
      ? [
          { label: t('ask.edit'), onPress: () => setMode({ kind: 'edit', id: post.id }) },
          {
            label: t('ask.delete'),
            destructive: true,
            onPress: () => setDialog({ kind: 'deletePost', id: post.id }),
          },
        ]
      : [
          {
            label: t('ask.report'),
            destructive: true,
            onPress: () => setDialog({ kind: 'reportPick' }),
          },
        ];

  /** Delete only shows when the signed-in user wrote the comment. */
  const commentSheetItems = (comment: AskComment): SheetItem[] => {
    const items: SheetItem[] = [];
    if (comment.isMine) {
      items.push({
        label: t('ask.delete'),
        destructive: true,
        onPress: () => setDialog({ kind: 'deleteComment', id: comment.id }),
      });
    }
    items.push({
      label: t('ask.report'),
      destructive: true,
      onPress: () => setDialog({ kind: 'reportPick' }),
    });
    return items;
  };

  const dialogs = (
    <>
      <ConfirmDialog
        visible={dialog?.kind === 'deletePost'}
        title={t('ask.deletePostTitle')}
        body={t('ask.deleteBody')}
        confirmLabel={t('ask.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => dialog?.kind === 'deletePost' && deletePost(dialog.id)}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'deleteComment'}
        title={t('ask.deleteCommentTitle')}
        body={t('ask.deleteBody')}
        confirmLabel={t('ask.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => dialog?.kind === 'deleteComment' && deleteComment(dialog.id)}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'submitted'}
        title={t('ask.submittedTitle')}
        body={t('ask.submittedBody')}
        confirmLabel={t('ask.done')}
        onConfirm={() => setDialog(null)}
      />
      <ReportDialog
        visible={dialog?.kind === 'reportPick'}
        onCancel={() => setDialog(null)}
        onSubmit={() => setDialog({ kind: 'reported' })}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'reported'}
        title={t('ask.reportedTitle')}
        body={t('ask.reportedBody')}
        confirmLabel={t('common.confirm')}
        onConfirm={() => setDialog(null)}
      />

      <ActionSheetMenu
        visible={sheetFor !== null}
        items={sheetFor ? postSheetItems(sheetFor) : []}
        onClose={() => setSheetFor(null)}
      />
      <ActionSheetMenu
        visible={commentSheetFor !== null}
        items={commentSheetFor ? commentSheetItems(commentSheetFor) : []}
        onClose={() => setCommentSheetFor(null)}
      />
    </>
  );

  if (mode.kind === 'compose') {
    return (
      <>
        <AskComposeView onBack={() => setMode({ kind: 'feed' })} onSubmit={createPost} />
        {dialogs}
      </>
    );
  }

  if (mode.kind === 'edit' && current) {
    return (
      <>
        <AskComposeView
          editing
          initialValue={current.title}
          onBack={() => setMode({ kind: 'detail', id: current.id })}
          onSubmit={(text) => savePost(current.id, text)}
        />
        {dialogs}
      </>
    );
  }

  if (mode.kind === 'detail' && current) {
    return (
      <>
        <AskDetailView
          post={current}
          liked={!!likes[current.id]}
          onBack={() => setMode({ kind: 'feed' })}
          onToggleLike={() => toggleLike(current.id)}
          onPressMore={() => setSheetFor(current)}
          onPressCommentMore={setCommentSheetFor}
          onReply={(text) => addReply(current.id, text)}
        />
        {dialogs}
      </>
    );
  }

  return (
    <View style={styles.flex}>
      {/* Figma "Ping_AskFeed_Browse" top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>{t('ask.title')}</Text>
        <View style={styles.topActions}>
          <Pressable style={styles.iconBtn} hitSlop={4}>
            <Ionicons name="search" size={24} color={colors.icon.primary} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            hitSlop={4}
            onPress={() => setMode({ kind: 'compose' })}
          >
            <Ionicons name="add" size={28} color={colors.icon.primary} />
          </Pressable>
        </View>
      </View>

      {/* Sort + category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {(['New', 'Popular'] as AskSort[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSort(s)}
            style={[styles.chip, sort === s && styles.chipSelected]}
          >
            <Text style={sort === s ? styles.chipTextSelected : styles.chipText}>
              {t(`ask.sort${s}`)}
            </Text>
          </Pressable>
        ))}
        {askCategories.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(category === c ? null : c)}
            style={[styles.chip, category === c && styles.chipSelected]}
          >
            <Text style={category === c ? styles.chipTextSelected : styles.chipText}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={feed}
        keyExtractor={(p) => p.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>{t('ask.emptyFeed')}</Text>}
        renderItem={({ item }) => (
          <AskCard
            post={item}
            liked={!!likes[item.id]}
            onPress={() => setMode({ kind: 'detail', id: item.id })}
            onToggleLike={() => toggleLike(item.id)}
            onPressMore={() => setSheetFor(item)}
          />
        )}
      />

      {dialogs}
    </View>
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
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  chipRow: {
    gap: spacing[1] + 2,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
  },
  chip: {
    height: 36,
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.blue[170] },
  chipText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[700],
  },
  chipTextSelected: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.text.primary,
  },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  separator: { height: spacing[3] },
  empty: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    color: colors.gray[800],
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
});
