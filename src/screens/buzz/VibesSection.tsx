import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';
import { AskComment } from '../../types/ask';
import { StoryUser } from '../../types/drops';
import { EMPTY_FILTERS, VibeEvent, VibeFilters } from '../../types/vibes';
import { storyUsers } from '../../mocks/drops';
import { vibesFeed } from '../../mocks/vibes';
import { StoryAvatarList } from '../../components/buzz/StoryAvatarList';
import { EventCard } from '../../components/buzz/EventCard';
import { ActionSheetMenu, SheetItem } from '../../components/buzz/ActionSheetMenu';
import { ConfirmDialog } from '../../components/buzz/ConfirmDialog';
import { ReportDialog } from '../../components/buzz/ReportDialog';
import { VibeFilterSheet } from '../../components/buzz/VibeFilterSheet';
import { EventDetailView } from './EventDetailView';
import { EventComposeView, EventDraft } from './EventComposeView';
import { JoinEventView } from './JoinEventView';

type Mode =
  | { kind: 'feed' }
  | { kind: 'detail'; id: string }
  | { kind: 'compose' }
  | { kind: 'edit'; id: string }
  | { kind: 'join'; id: string };
type Dialog =
  | null
  | { kind: 'delete'; id: string }
  | { kind: 'report' }
  | { kind: 'reported' }
  | { kind: 'joined' };

type Props = {
  authorName: string;
  composeSignal: number;
  onFullScreen?: (full: boolean) => void;
};

// Figma "Vibe" section (node 11478:75759) — story row + "Events happening today"
// event feed → detail → compose/edit, plus join flow, filter sheet, and owner
// (Edit/Delete) / viewer (Report) menus. Data is mocked for now.
export function VibesSection({ authorName, composeSignal, onFullScreen }: Props) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<VibeEvent[]>(vibesFeed);
  const [mode, setMode] = useState<Mode>({ kind: 'feed' });
  const [storyFilter, setStoryFilter] = useState<StoryUser | null>(null);
  const [filters, setFilters] = useState<VibeFilters>(EMPTY_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [sheetFor, setSheetFor] = useState<VibeEvent | null>(null);
  const [commentSheetFor, setCommentSheetFor] = useState<AskComment | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  // Parent header "+" opens the composer.
  const [seenSignal, setSeenSignal] = useState(composeSignal);
  if (composeSignal !== seenSignal) {
    setSeenSignal(composeSignal);
    if (mode.kind === 'feed') setMode({ kind: 'compose' });
  }

  useEffect(() => {
    onFullScreen?.(mode.kind !== 'feed');
  }, [mode.kind, onFullScreen]);

  useEffect(() => {
    if (mode.kind === 'feed') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode({ kind: 'feed' });
      return true;
    });
    return () => sub.remove();
  }, [mode.kind]);

  const feed = useMemo(() => {
    let list = events;
    if (storyFilter) list = list.filter((e) => e.host === storyFilter.username);
    if (filters.price) list = list.filter((e) => (filters.price === 'Free' ? true : true));
    return list;
  }, [events, storyFilter, filters]);

  const current = ['detail', 'edit', 'join'].includes(mode.kind)
    ? events.find((e) => e.id === (mode as { id: string }).id) ?? null
    : null;

  const createEvent = (draft: EventDraft) => {
    const event: VibeEvent = {
      id: `v${Date.now()}`,
      title: draft.title,
      time: '12:00 PM',
      place: draft.place ?? 'Seoul',
      dateLabel: draft.dateLabel ?? 'TBD',
      photos: draft.photo ? [draft.photo] : ['https://picsum.photos/seed/newevent/400/300'],
      host: authorName,
      caption: draft.caption,
      participants: [],
      participantCount: 1,
      limit: draft.limit,
      likes: 0,
      comments: [],
      isMine: true,
    };
    setEvents((p) => [event, ...p]);
    setMode({ kind: 'feed' });
  };

  const saveEvent = (id: string, draft: EventDraft) => {
    setEvents((p) =>
      p.map((e) =>
        e.id === id
          ? {
              ...e,
              title: draft.title,
              caption: draft.caption,
              dateLabel: draft.dateLabel ?? e.dateLabel,
              place: draft.place ?? e.place,
              photos: draft.photo ? [draft.photo, ...e.photos.slice(1)] : e.photos,
              limit: draft.limit,
            }
          : e,
      ),
    );
    setMode({ kind: 'detail', id });
  };

  const deleteEvent = (id: string) => {
    setEvents((p) => p.filter((e) => e.id !== id));
    setMode({ kind: 'feed' });
    setDialog(null);
  };

  const joinEvent = (id: string, people: number) => {
    setEvents((p) =>
      p.map((e) =>
        e.id === id ? { ...e, joined: true, participantCount: e.participantCount + people } : e,
      ),
    );
    setMode({ kind: 'feed' });
    setDialog({ kind: 'joined' });
  };

  const toggleSave = (id: string) =>
    setEvents((p) => p.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e)));

  const addComment = (id: string, text: string) => {
    const comment: AskComment = {
      id: `c${Date.now()}`,
      author: authorName,
      time: t('ask.justNow'),
      text,
      likes: 0,
      isMine: true,
    };
    setEvents((p) =>
      p.map((e) => (e.id === id ? { ...e, comments: [...e.comments, comment] } : e)),
    );
  };

  const deleteComment = (id: string) => {
    setEvents((p) => p.map((e) => ({ ...e, comments: e.comments.filter((c) => c.id !== id) })));
    setDialog(null);
  };

  const sheetItems = (event: VibeEvent): SheetItem[] =>
    event.isMine
      ? [
          { label: t('ask.edit'), onPress: () => setMode({ kind: 'edit', id: event.id }) },
          {
            label: t('ask.delete'),
            destructive: true,
            onPress: () => setDialog({ kind: 'delete', id: event.id }),
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
        title={t('vibes.deleteTitle')}
        body={t('ask.deleteBody')}
        confirmLabel={t('ask.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          if (dialog?.kind !== 'delete') return;
          if (events.some((e) => e.id === dialog.id)) deleteEvent(dialog.id);
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
      <ConfirmDialog
        visible={dialog?.kind === 'joined'}
        title={t('vibes.joinedTitle')}
        body={t('vibes.joinedBody')}
        confirmLabel={t('ask.done')}
        onConfirm={() => setDialog(null)}
      />
    </>
  );

  if (mode.kind === 'compose') {
    return (
      <>
        <EventComposeView onBack={() => setMode({ kind: 'feed' })} onSubmit={createEvent} />
        {overlays}
      </>
    );
  }

  if (mode.kind === 'edit' && current) {
    return (
      <>
        <EventComposeView
          editing
          initial={{
            title: current.title,
            caption: current.caption,
            dateLabel: current.dateLabel,
            place: current.place,
            photo: current.photos[0],
            limit: current.limit,
          }}
          onBack={() => setMode({ kind: 'detail', id: current.id })}
          onSubmit={(draft) => saveEvent(current.id, draft)}
        />
        {overlays}
      </>
    );
  }

  if (mode.kind === 'join' && current) {
    return (
      <>
        <JoinEventView
          event={current}
          onBack={() => setMode({ kind: 'detail', id: current.id })}
          onConfirm={(people) => joinEvent(current.id, people)}
        />
        {overlays}
      </>
    );
  }

  if (mode.kind === 'detail' && current) {
    return (
      <>
        <EventDetailView
          event={current}
          liked={!!likes[current.id]}
          onBack={() => setMode({ kind: 'feed' })}
          onToggleLike={() => setLikes((m) => ({ ...m, [current.id]: !m[current.id] }))}
          onJoin={() =>
            current.joined ? undefined : setMode({ kind: 'join', id: current.id })
          }
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
        keyExtractor={(e) => e.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <StoryAvatarList
              users={storyUsers}
              activeId={storyFilter?.id}
              onPress={(u) => setStoryFilter((cur) => (cur?.id === u.id ? null : u))}
            />
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>{t('vibes.eventsToday')}</Text>
              <Pressable style={styles.filterBtn} hitSlop={6} onPress={() => setShowFilter(true)}>
                <Ionicons name="options-outline" size={22} color={colors.icon.primary} />
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <EventCard
            event={item}
            index={index}
            onPress={() => setMode({ kind: 'detail', id: item.id })}
            onJoin={() =>
              item.joined ? undefined : setMode({ kind: 'join', id: item.id })
            }
            onToggleSave={() => toggleSave(item.id)}
          />
        )}
      />

      <VibeFilterSheet
        visible={showFilter}
        initial={filters}
        onClose={() => setShowFilter(false)}
        onApply={(f) => {
          setFilters(f);
          setShowFilter(false);
        }}
      />

      {overlays}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingTop: spacing[4], paddingBottom: spacing[2], gap: spacing[4] },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
  },
  sectionTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  filterBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing[5], paddingBottom: spacing[16] },
  sep: { height: spacing[3] },
});
