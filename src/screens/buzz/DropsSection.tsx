import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';
import { AskComment } from '../../types/ask';
import { Drop, StoryUser } from '../../types/drops';
import { dropsFeed, storyUsers } from '../../mocks/drops';
import { StoryAvatarList } from '../../components/buzz/StoryAvatarList';
import { DropGridCard } from '../../components/buzz/DropGridCard';
import { ActionSheetMenu, SheetItem } from '../../components/buzz/ActionSheetMenu';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { ReportDialog } from '../../components/buzz/ReportDialog';
import { DropDetailView } from './DropDetailView';
import { DropComposeView } from './DropComposeView';

type Mode =
  | { kind: 'feed' }
  | { kind: 'detail'; id: string }
  | { kind: 'compose' }
  | { kind: 'edit'; id: string };
type Dialog = null | { kind: 'delete'; id: string } | { kind: 'report' } | { kind: 'reported' };

type Props = {
  authorName: string;
  /** Header "+" from the Buzz tab header opens the composer. */
  composeSignal: number;
  onBack: () => void;
  /** Detail/compose take over the screen — parent hides the tab header. */
  onFullScreen?: (full: boolean) => void;
};

const GAP = spacing[2];

// Figma "Drops" section (node 11478:75041) — story row + photo grid feed → detail
// → compose/edit, with owner (Edit/Delete) and viewer (Report) sheets and their
// delete/report dialogs. Data is mocked for now.
export function DropsSection({ authorName, composeSignal, onBack, onFullScreen }: Props) {
  const { t } = useTranslation();
  const [drops, setDrops] = useState<Drop[]>(dropsFeed);
  const [mode, setMode] = useState<Mode>({ kind: 'feed' });
  const [storyFilter, setStoryFilter] = useState<StoryUser | null>(null);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [sheetFor, setSheetFor] = useState<Drop | null>(null);
  const [commentSheetFor, setCommentSheetFor] = useState<AskComment | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const width = Dimensions.get('window').width;
  const cellWidth = Math.floor((width - GAP * 2) / 3);

  // The parent header's "+" bumps composeSignal — open the composer on change.
  const [seenSignal, setSeenSignal] = useState(composeSignal);
  if (composeSignal !== seenSignal) {
    setSeenSignal(composeSignal);
    if (mode.kind === 'feed') setMode({ kind: 'compose' });
  }

  useEffect(() => {
    onFullScreen?.(mode.kind !== 'feed');
  }, [mode.kind, onFullScreen]);

  // Back inside detail/compose/edit returns to the feed.
  useEffect(() => {
    if (mode.kind === 'feed') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode({ kind: 'feed' });
      return true;
    });
    return () => sub.remove();
  }, [mode.kind]);

  const feed = useMemo(
    () => (storyFilter ? drops.filter((d) => d.userId === storyFilter.id) : drops),
    [drops, storyFilter],
  );

  const current = mode.kind === 'detail' || mode.kind === 'edit'
    ? drops.find((d) => d.id === mode.id) ?? null
    : null;

  const createDrop = (photos: string[], caption: string) => {
    const drop: Drop = {
      id: `d${Date.now()}`,
      userId: 'me',
      author: authorName,
      photos,
      caption,
      time: t('ask.justNow'),
      location: 'Seoul',
      views: 0,
      likes: 0,
      comments: [],
      isMine: true,
    };
    setDrops((p) => [drop, ...p]);
    setMode({ kind: 'feed' });
  };

  const saveDrop = (id: string, photos: string[], caption: string) => {
    setDrops((p) => p.map((d) => (d.id === id ? { ...d, photos, caption } : d)));
    setMode({ kind: 'detail', id });
  };

  const deleteDrop = (id: string) => {
    setDrops((p) => p.filter((d) => d.id !== id));
    setMode({ kind: 'feed' });
    setDialog(null);
  };

  const addComment = (dropId: string, text: string) => {
    const comment: AskComment = {
      id: `c${Date.now()}`,
      author: authorName,
      time: t('ask.justNow'),
      text,
      likes: 0,
      isMine: true,
    };
    setDrops((p) =>
      p.map((d) => (d.id === dropId ? { ...d, comments: [...d.comments, comment] } : d)),
    );
  };

  const deleteComment = (id: string) => {
    setDrops((p) =>
      p.map((d) => ({ ...d, comments: d.comments.filter((c) => c.id !== id) })),
    );
    setDialog(null);
  };

  /** Owner → Edit + Delete. Viewer → Report. */
  const sheetItems = (drop: Drop): SheetItem[] =>
    drop.isMine
      ? [
          { label: t('ask.edit'), onPress: () => setMode({ kind: 'edit', id: drop.id }) },
          {
            label: t('ask.delete'),
            destructive: true,
            onPress: () => setDialog({ kind: 'delete', id: drop.id }),
          },
        ]
      : [{ label: t('ask.report'), destructive: true, onPress: () => setDialog({ kind: 'report' }) }];

  const commentSheetItems = (comment: AskComment): SheetItem[] => {
    const items: SheetItem[] = [];
    if (comment.isMine) {
      items.push({
        label: t('ask.delete'),
        destructive: true,
        onPress: () => setDialog({ kind: 'delete', id: comment.id }),
      });
    }
    items.push({ label: t('ask.report'), destructive: true, onPress: () => setDialog({ kind: 'report' }) });
    return items;
  };

  const overlays = (
    <>
      <ActionSheetMenu
        visible={sheetFor !== null}
        items={sheetFor ? sheetItems(sheetFor) : []}
        onClose={() => setSheetFor(null)}
      />
      <ActionSheetMenu
        visible={commentSheetFor !== null}
        items={commentSheetFor ? commentSheetItems(commentSheetFor) : []}
        onClose={() => setCommentSheetFor(null)}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'delete'}
        title={t('drops.deleteTitle')}
        body={t('ask.deleteBody')}
        confirmLabel={t('ask.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          if (dialog?.kind !== 'delete') return;
          // A drop id starts with "d", comment ids with "c".
          if (drops.some((d) => d.id === dialog.id)) deleteDrop(dialog.id);
          else deleteComment(dialog.id);
        }}
        onCancel={() => setDialog(null)}
      />
      <ReportDialog
        visible={dialog?.kind === 'report'}
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
    </>
  );

  if (mode.kind === 'compose') {
    return (
      <>
        <DropComposeView onBack={() => setMode({ kind: 'feed' })} onSubmit={createDrop} />
        {overlays}
      </>
    );
  }

  if (mode.kind === 'edit' && current) {
    return (
      <>
        <DropComposeView
          editing
          initialPhotos={current.photos}
          initialCaption={current.caption}
          onBack={() => setMode({ kind: 'detail', id: current.id })}
          onSubmit={(photos, caption) => saveDrop(current.id, photos, caption)}
        />
        {overlays}
      </>
    );
  }

  if (mode.kind === 'detail' && current) {
    return (
      <>
        <DropDetailView
          drop={current}
          liked={!!likes[current.id]}
          onBack={() => setMode({ kind: 'feed' })}
          onToggleLike={() => setLikes((m) => ({ ...m, [current.id]: !m[current.id] }))}
          onPressMore={() => setSheetFor(current)}
          onPressCommentMore={setCommentSheetFor}
          onReply={(text) => addComment(current.id, text)}
        />
        {overlays}
      </>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={feed}
        keyExtractor={(d) => d.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.rowGap}
        contentContainerStyle={styles.grid}
        ListHeaderComponent={
          <View style={styles.header}>
            <StoryAvatarList
              users={storyUsers}
              activeId={storyFilter?.id}
              onPress={(u) => setStoryFilter((cur) => (cur?.id === u.id ? null : u))}
            />
            {storyFilter && (
              <Pressable style={styles.filterPill} onPress={() => setStoryFilter(null)}>
                <Text style={styles.filterText}>
                  {t('drops.filteredBy', { name: storyFilter.username })}
                </Text>
                <Ionicons name="close" size={14} color={colors.blue[500]} />
              </Pressable>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <DropGridCard
            photo={item.photos[0]}
            views={item.views}
            index={index}
            width={cellWidth}
            onPress={() => setMode({ kind: 'detail', id: item.id })}
          />
        )}
      />

      {overlays}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: spacing[4], paddingBottom: spacing[4], gap: spacing[3] },
  grid: { gap: GAP, paddingBottom: spacing[16] },
  rowGap: { gap: GAP },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    marginHorizontal: spacing[5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: 999,
    backgroundColor: colors.blue[170],
  },
  filterText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.blue[500],
  },
});
