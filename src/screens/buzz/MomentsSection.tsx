import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { Moment } from '../../types/moments';
import { momentCategories, momentsFeed } from '../../mocks/moments';
import { MomentCard } from '../../components/moments/MomentCard';
import { PhotoViewerModal } from '../../components/moments/PhotoViewerModal';
import { CommentsSheet } from '../../components/moments/CommentsSheet';
import { ActionSheetMenu, SheetItem } from '../../components/buzz/ActionSheetMenu';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { ReportDialog } from '../../components/buzz/ReportDialog';
import { MomentComposeView, MomentDraft } from './MomentComposeView';

type Mode = { kind: 'feed' } | { kind: 'compose' } | { kind: 'edit'; id: string };
type Dialog = null | { kind: 'delete'; id: string } | { kind: 'reportPick' } | { kind: 'reported' };

type Props = {
  onBack: () => void;
  authorName: string;
  /** Opened directly on a moment (from the Ping home carousel). */
  initialMomentId?: string;
  /** Compose/edit are full screens — the parent hides the tab bar. */
  onFullScreen?: (full: boolean) => void;
};

// Figma: "Moments_Browse" (11452:71379) feed + "Moments_CreatePost" (11452:71179).
// Full Moments feed with create/edit/delete, photo viewer, threaded comments, and
// owner (Edit/Delete) / viewer (Report) menus. Data is mocked for now.
export function MomentsSection({ onBack, authorName, initialMomentId, onFullScreen }: Props) {
  const { t } = useTranslation();
  const [moments, setMoments] = useState<Moment[]>(momentsFeed);
  const [mode, setMode] = useState<Mode>({ kind: 'feed' });
  const [category, setCategory] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ photos: string[]; index: number } | null>(null);
  const [commentsFor, setCommentsFor] = useState<Moment | null>(
    initialMomentId ? momentsFeed.find((m) => m.id === initialMomentId) ?? null : null,
  );
  const [menuFor, setMenuFor] = useState<Moment | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  // Compose/edit are full-screen — the parent hides the tab bar.
  useEffect(() => onFullScreen?.(mode.kind !== 'feed'), [mode.kind, onFullScreen]);

  // Back inside compose/edit returns to the feed, not out of the section.
  useEffect(() => {
    if (mode.kind === 'feed') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode({ kind: 'feed' });
      return true;
    });
    return () => sub.remove();
  }, [mode.kind]);

  const feed = useMemo(
    () => (category ? moments.filter((m) => m.category === category) : moments),
    [moments, category],
  );

  const editing = mode.kind === 'edit' ? moments.find((m) => m.id === mode.id) ?? null : null;

  const createMoment = (draft: MomentDraft) => {
    const moment: Moment = {
      id: `m${Date.now()}`,
      category: 'Living',
      text: draft.text || draft.heading,
      photos: draft.photos,
      author: authorName,
      time: t('ask.justNow'),
      location: 'Seoul',
      likes: 0,
      isMine: true,
      comments: [],
    };
    setMoments((p) => [moment, ...p]);
    setMode({ kind: 'feed' });
  };

  const saveMoment = (id: string, draft: MomentDraft) => {
    setMoments((p) =>
      p.map((m) => (m.id === id ? { ...m, text: draft.text || draft.heading, photos: draft.photos } : m)),
    );
    setMode({ kind: 'feed' });
  };

  const deleteMoment = (id: string) => {
    setMoments((p) => p.filter((m) => m.id !== id));
    setDialog(null);
  };

  const sheetItems = (moment: Moment): SheetItem[] =>
    moment.isMine
      ? [
          { label: t('ask.edit'), onPress: () => setMode({ kind: 'edit', id: moment.id }) },
          {
            label: t('ask.delete'),
            destructive: true,
            onPress: () => setDialog({ kind: 'delete', id: moment.id }),
          },
        ]
      : [
          { label: t('tips.share'), onPress: () => {} },
          { label: t('ask.report'), destructive: true, onPress: () => setDialog({ kind: 'reportPick' }) },
        ];

  if (mode.kind === 'compose') {
    return <MomentComposeView onBack={() => setMode({ kind: 'feed' })} onSubmit={createMoment} />;
  }

  if (mode.kind === 'edit' && editing) {
    return (
      <MomentComposeView
        editing
        initial={{ text: editing.text, photos: editing.photos }}
        onBack={() => setMode({ kind: 'feed' })}
        onSubmit={(draft) => saveMoment(editing.id, draft)}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>{t('moments.title')}</Text>
        <View style={styles.topActions}>
          <Pressable style={styles.iconBtn} hitSlop={4}>
            <Ionicons name="search" size={24} color={colors.icon.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn} hitSlop={4} onPress={() => setMode({ kind: 'compose' })}>
            <Ionicons name="add" size={28} color={colors.icon.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.chipRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Pressable
            onPress={() => setCategory(null)}
            style={[styles.chip, category === null && styles.chipSelected]}
          >
            <Text style={category === null ? styles.chipTextSelected : styles.chipText}>
              {t('moments.all')}
            </Text>
          </Pressable>
          {momentCategories.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(category === c ? null : c)}
              style={[styles.chip, category === c && styles.chipSelected]}
            >
              <Text style={category === c ? styles.chipTextSelected : styles.chipText}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(m) => m.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <MomentCard
            moment={item}
            onPressPhoto={(index) => setViewer({ photos: item.photos, index })}
            onPressComments={() => setCommentsFor(item)}
            onPressMore={() => setMenuFor(item)}
          />
        )}
      />

      <PhotoViewerModal
        visible={viewer !== null}
        photos={viewer?.photos ?? []}
        initialIndex={viewer?.index ?? 0}
        onClose={() => setViewer(null)}
      />

      <CommentsSheet
        visible={commentsFor !== null}
        moment={commentsFor}
        onClose={() => setCommentsFor(null)}
      />

      <ActionSheetMenu
        visible={menuFor !== null}
        items={menuFor ? sheetItems(menuFor) : []}
        onClose={() => setMenuFor(null)}
      />

      <ConfirmDialog
        visible={dialog?.kind === 'delete'}
        title={t('momentsCompose.deleteTitle')}
        body={t('ask.deleteBody')}
        confirmLabel={t('ask.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => dialog?.kind === 'delete' && deleteMoment(dialog.id)}
        onCancel={() => setDialog(null)}
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
  chipRowWrap: { paddingTop: spacing[2], paddingBottom: spacing[4] },
  chipRow: { gap: spacing[1] + 2, paddingHorizontal: spacing[5] },
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
  list: { paddingBottom: spacing[16] },
  separator: { height: spacing[3] },
});
