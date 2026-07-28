import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { AskSort } from '../types/ask';
import { BuzzTab, BuzzTabHeader } from '../components/moments/BuzzTabHeader';
import { PingHome } from './buzz/PingHome';
import { AskSection } from './buzz/AskSection';
import { MomentsSection } from './buzz/MomentsSection';
import { TipsSection } from './buzz/TipsSection';
import { DropsSection } from './buzz/DropsSection';
import { VibesSection } from './buzz/VibesSection';
import { useAuth } from '../context/AuthContext';
import { ScreenTransition } from '../components/ScreenTransition';

/** Ping is one scrolling home; "See all" pushes a section over it. */
type PingView =
  | { kind: 'home' }
  | { kind: 'ask'; sort?: AskSort; postId?: string }
  | { kind: 'moments'; momentId?: string }
  | { kind: 'tips' };

// Figma: "Ping_Home" (node 11452:64916). The Buzz tab hosts Ping / Drops / Vibes;
// Ping itself is a single frame with three horizontal carousels — Just in (latest
// Ask posts to join), Join the conversation (top Q&A), and Moments — each with a
// "See all" that opens that section's full screen. Data is mocked for now.
type Props = {
  /** Report when a full-screen sub-view is open so the app can hide the tab bar. */
  onFullScreen?: (full: boolean) => void;
};

export function BuzzScreen({ onFullScreen }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<BuzzTab>('ping');
  const [view, setView] = useState<PingView>({ kind: 'home' });
  const [dropsCompose, setDropsCompose] = useState(0);
  const [vibesCompose, setVibesCompose] = useState(0);
  // A section reports true while showing a detail/compose (keyboard + full-bleed).
  const [fullScreen, setFullScreen] = useState(false);

  const goHome = () => setView({ kind: 'home' });

  useEffect(() => onFullScreen?.(fullScreen), [fullScreen, onFullScreen]);

  // Back on the Ping home (or the Ping placeholder tabs), nothing is full-screen.
  // Guarded so it doesn't clobber a section's own report when entering it — child
  // effects run before this parent effect.
  useEffect(() => {
    if (tab === 'ping' && view.kind === 'home') setFullScreen(false);
  }, [tab, view.kind]);

  // Android hardware Back should pop the open section back to the Ping home
  // rather than backgrounding the app. Sections register their own handler for
  // their inner screens; the last one registered runs first, so they win.
  useEffect(() => {
    if (view.kind === 'home') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goHome();
      return true;
    });
    return () => sub.remove();
  }, [view.kind]);

  if (tab === 'ping' && view.kind === 'ask') {
    return (
      <ScreenTransition transitionKey="ask" mode="push">
        <AskSection
          authorName={user?.name ?? 'you'}
          initialSort={view.sort}
          initialPostId={view.postId}
          onBack={goHome}
          onFullScreen={setFullScreen}
        />
      </ScreenTransition>
    );
  }

  if (tab === 'ping' && view.kind === 'moments') {
    return (
      <ScreenTransition transitionKey="moments" mode="push">
        <MomentsSection
          authorName={user?.name ?? 'you'}
          initialMomentId={view.momentId}
          onBack={goHome}
          onFullScreen={setFullScreen}
        />
      </ScreenTransition>
    );
  }

  if (tab === 'ping' && view.kind === 'tips') {
    return (
      <ScreenTransition transitionKey="tips" mode="push">
        <TipsSection authorName={user?.name ?? 'you'} onBack={goHome} onFullScreen={setFullScreen} />
      </ScreenTransition>
    );
  }

  // Drops — story-row + photo-grid feed with its own detail/compose flow.
  if (tab === 'drops') {
    return (
      <View style={styles.flex}>
        {!fullScreen && (
          <BuzzTabHeader
            active={tab}
            onChange={setTab}
            showAdd
            onAdd={() => setDropsCompose((n) => n + 1)}
          />
        )}
        <ScreenTransition transitionKey="drops">
          <DropsSection
            authorName={user?.name ?? 'you'}
            composeSignal={dropsCompose}
            onBack={() => setTab('ping')}
            onFullScreen={setFullScreen}
          />
        </ScreenTransition>
      </View>
    );
  }

  // Vibes — story-row + "Events happening today" feed with detail/compose/join.
  if (tab === 'vibes') {
    return (
      <View style={styles.flex}>
        {!fullScreen && (
          <BuzzTabHeader
            active={tab}
            onChange={setTab}
            showAdd
            onAdd={() => setVibesCompose((n) => n + 1)}
          />
        )}
        <ScreenTransition transitionKey="vibes">
          <VibesSection
            authorName={user?.name ?? 'you'}
            composeSignal={vibesCompose}
            onFullScreen={setFullScreen}
          />
        </ScreenTransition>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <BuzzTabHeader active={tab} onChange={setTab} />

      <ScreenTransition transitionKey="ping">
        <PingHome
          onSeeAllJustIn={() => setView({ kind: 'ask', sort: 'New' })}
          onSeeAllConversation={() => setView({ kind: 'ask', sort: 'Popular' })}
          onSeeAllMoments={() => setView({ kind: 'moments' })}
          onOpenAsk={(postId) => setView({ kind: 'ask', postId })}
          onOpenMoment={(momentId) => setView({ kind: 'moments', momentId })}
          onOpenTips={() => setView({ kind: 'tips' })}
        />
      </ScreenTransition>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
