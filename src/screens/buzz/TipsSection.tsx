import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { Tip } from '../../types/tips';
import { tipFeedCategories, tipsFeed } from '../../mocks/tips';
import { TipCard } from '../../components/buzz/TipCard';
import { ActionSheetMenu, SheetItem } from '../../components/buzz/ActionSheetMenu';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { ReportDialog } from '../../components/buzz/ReportDialog';
import { TipComposeView } from './TipComposeView';

type Mode = { kind: 'feed' } | { kind: 'compose' } | { kind: 'edit'; id: string };
type Dialog = null | { kind: 'delete'; id: string } | { kind: 'report' } | { kind: 'reported' };

type Props = {
  authorName: string;
  onBack: () => void;
  /** Compose/edit are full screens — the parent hides the tab bar. */
  onFullScreen?: (full: boolean) => void;
};

// Figma "Tips" section (node 11478:74657) — feed → compose/edit, plus the owner
// (Share/Edit/Delete) and viewer (Share/Report) action sheets with their delete
// confirmation and reason-picker report dialogs. State is local; API pending.
export function TipsSection({ authorName, onBack, onFullScreen }: Props) {
  const { t } = useTranslation();
  const [tips, setTips] = useState<Tip[]>(tipsFeed);
  const [mode, setMode] = useState<Mode>({ kind: 'feed' });
  const [category, setCategory] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [sheetFor, setSheetFor] = useState<Tip | null>(null);
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
    () => (category ? tips.filter((x) => x.category === category) : tips),
    [tips, category],
  );

  const editing = mode.kind === 'edit' ? tips.find((x) => x.id === mode.id) ?? null : null;

  const createTip = (cat: string, text: string) => {
    const tip: Tip = {
      id: `t${Date.now()}`,
      category: cat,
      text,
      author: authorName,
      time: t('ask.justNow'),
      location: 'Seoul',
      likes: 0,
      isMine: true,
    };
    setTips((p) => [tip, ...p]);
    setMode({ kind: 'feed' });
  };

  const saveTip = (id: string, cat: string, text: string) => {
    setTips((p) => p.map((x) => (x.id === id ? { ...x, category: cat, text } : x)));
    setMode({ kind: 'feed' });
  };

  const deleteTip = (id: string) => {
    setTips((p) => p.filter((x) => x.id !== id));
    setDialog(null);
  };

  /** Owner → Share/Edit/Delete. Viewer → Share/Report. */
  const sheetItems = (tip: Tip): SheetItem[] => {
    const items: SheetItem[] = [{ label: t('tips.share'), onPress: () => {} }];
    if (tip.isMine) {
      items.push({ label: t('ask.edit'), onPress: () => setMode({ kind: 'edit', id: tip.id }) });
      items.push({
        label: t('ask.delete'),
        destructive: true,
        onPress: () => setDialog({ kind: 'delete', id: tip.id }),
      });
    } else {
      items.push({
        label: t('ask.report'),
        destructive: true,
        onPress: () => setDialog({ kind: 'report' }),
      });
    }
    return items;
  };

  const overlays = (
    <>
      <ActionSheetMenu
        visible={sheetFor !== null}
        items={sheetFor ? sheetItems(sheetFor) : []}
        onClose={() => setSheetFor(null)}
      />
      <ConfirmDialog
        visible={dialog?.kind === 'delete'}
        title={t('tips.deleteTitle')}
        body={t('ask.deleteBody')}
        confirmLabel={t('ask.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => dialog?.kind === 'delete' && deleteTip(dialog.id)}
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
        <TipComposeView onBack={() => setMode({ kind: 'feed' })} onSubmit={createTip} />
        {overlays}
      </>
    );
  }

  if (mode.kind === 'edit' && editing) {
    return (
      <>
        <TipComposeView
          editing
          initialCategory={editing.category}
          initialText={editing.text}
          onBack={() => setMode({ kind: 'feed' })}
          onSubmit={(cat, text) => saveTip(editing.id, cat, text)}
        />
        {overlays}
      </>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>{t('tips.title')}</Text>
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
        {tipFeedCategories.map((c) => (
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
        keyExtractor={(x) => x.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.empty}>{t('tips.empty')}</Text>}
        renderItem={({ item }) => (
          <TipCard
            tip={item}
            liked={!!likes[item.id]}
            onToggleLike={() => setLikes((m) => ({ ...m, [item.id]: !m[item.id] }))}
            onPressMore={() => setSheetFor(item)}
          />
        )}
      />

      {overlays}
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
