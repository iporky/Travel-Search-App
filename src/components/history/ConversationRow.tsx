import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '../../theme/tokens';
import { ConversationSummary, ConversationTurn } from '../../types/conversation';
import { TranscriptStatus, useConversationTranscript } from '../../hooks/useConversations';
import { FormattedSummary } from '../FormattedAnswer';
import { DotsLoader } from '../DotsLoader';

// Figma `Suggestion Chip/L`, Aug revision (History_Default 12354:55698 /
// History_Expanded 12354:55779), now listing Search v2 CONVERSATIONS: every
// History card is an accordion. Collapsed (56 tall): emoji chip (#c9e3ff,
// radius 8, px8/py4) + the thread's title on one line (Body/14/SemiBold) +
// a down chevron; threads with several questions add a "N questions"
// caption. Tapping the header expands IN PLACE — no navigation — and loads
// the thread (GET /api/v2/conversations/{id}), rendered as a chat only:
// each question as a blue bubble on the right, each answer as a pale
// bubble on the left (Body/14/Medium, same markdown renderer as the live
// answer), then that turn's suggested follow-ups as chips — tapping one
// asks it in the same thread (Home tab, same conversation_id). Card:
// #FEFEFE (pressed #C9E3FF), radius 16, pl 16 / pr 12 / py 16.
//
// Opening and closing are eased (Reanimated, UI thread). The list cell that
// holds the card animates its frame between the collapsed and expanded
// heights (a layout transition — no per-frame layout commits), which also
// slides the rows beneath; inside, the body fades and the chevron turns.
// The transcript arriving later grows the cell the same way.

type Props = {
  item: ConversationSummary;
  expanded: boolean;
  onToggle: (item: ConversationSummary) => void;
  /** A follow-up chip was tapped: ask it inside this thread (Home tab). */
  onAskFollowup: (question: string, conversationId: string) => void;
};

export const OPEN_MS = 300;
export const CLOSE_MS = 240;
const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN_OUT = Easing.inOut(Easing.cubic);

function ConversationRowInner({ item, expanded, onToggle, onAskFollowup }: Props) {
  const { t } = useTranslation();
  const title = (item.title ?? '').trim() || t('history.untitled');
  const open = expanded;
  const [pressed, setPressed] = useState(false);

  // The body stays mounted through the close animation (collapsed to zero
  // height so the cell's frame shrinks at once while it fades), then unmounts.
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // 0 = closed, 1 = open: drives the body's fade and the chevron's turn.
  const progress = useSharedValue(open ? 1 : 0);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (open) {
      progress.value = withTiming(1, { duration: OPEN_MS, easing: EASE_OUT });
    } else {
      progress.value = withTiming(0, { duration: CLOSE_MS, easing: EASE_IN_OUT }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const bodyFade = useAnimatedStyle(() => ({ opacity: progress.value }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` }],
  }));

  const transcript = useConversationTranscript(item, mounted);

  return (
    <View style={[styles.card, pressed && styles.cardPressed]}>
      <Pressable
        style={styles.headerRow}
        onPress={() => onToggle(item)}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
      >
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText}>{emojiForQuery(title)}</Text>
        </View>
        <View style={styles.titleCol}>
          <Text style={styles.question} numberOfLines={open ? undefined : 1}>
            {title}
          </Text>
          {item.turn_count > 1 ? (
            <Text style={styles.meta}>{t('history.questionCount', { count: item.turn_count })}</Text>
          ) : null}
        </View>
        <Animated.View style={[styles.chevron, chevronStyle]}>
          <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.gray[1200]} />
        </Animated.View>
      </Pressable>

      {mounted && (
        <Animated.View style={[open ? styles.bodyOpen : styles.bodyClosed, bodyFade]}>
          <View style={styles.body}>
            <Transcript
              status={transcript.status}
              turns={transcript.turns}
              truncated={transcript.truncated}
              onRetry={transcript.retry}
              onAskFollowup={(q) => onAskFollowup(q, item.conversation_id)}
            />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// Memoised so a tap re-renders only the toggled row, not every thread in the list.
export const ConversationRow = React.memo(ConversationRowInner);

/** The chat: question bubbles right, answer bubbles left, and under each
    answer the follow-ups the backend suggested for that turn — tapping one
    asks it in this same thread. */
function Transcript({
  status,
  turns,
  truncated,
  onRetry,
  onAskFollowup,
}: {
  status: TranscriptStatus;
  turns: ConversationTurn[];
  truncated: boolean;
  onRetry: () => void;
  onAskFollowup: (question: string) => void;
}) {
  const { t } = useTranslation();
  if (status === 'error') {
    return (
      <View style={styles.stateRow}>
        <Text style={styles.stateText}>{t('history.conversationLoadError')}</Text>
        <Pressable hitSlop={8} onPress={onRetry}>
          <Text style={styles.retryLink}>{t('events.retry')}</Text>
        </Pressable>
      </View>
    );
  }
  if (status !== 'ready') {
    return (
      <View style={styles.loaderRow}>
        <DotsLoader size={7} color={colors.blue[400]} />
      </View>
    );
  }
  if (turns.length === 0) {
    return <Text style={styles.stateText}>{t('history.noAnswer')}</Text>;
  }
  return (
    <View style={styles.chat}>
      {truncated ? <Text style={styles.truncatedNote}>{t('history.earlierMessagesHidden')}</Text> : null}
      {turns.map((turn) => {
        const question = (turn.question?.content ?? '').trim();
        const answer = (turn.answer?.content ?? '').trim();
        const followups = (Array.isArray(turn.followup_questions) ? turn.followup_questions : [])
          .map((q) => String(q ?? '').trim())
          .filter(Boolean);
        return (
          <React.Fragment key={turn.turn_index}>
            {question ? (
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{question}</Text>
              </View>
            ) : null}
            {answer ? (
              <View style={styles.botBubble}>
                <FormattedSummary text={answer} compact />
              </View>
            ) : (
              <View style={[styles.botBubble, styles.botBubbleMuted]}>
                <Text style={styles.mutedText}>{t('history.noAnswer')}</Text>
              </View>
            )}
            {followups.length > 0 ? (
              <View style={styles.followups}>
                {followups.map((q) => (
                  <Pressable
                    key={q}
                    style={({ pressed }) => [styles.followupChip, pressed && styles.followupChipPressed]}
                    onPress={() => onAskFollowup(q)}
                    hitSlop={4}
                  >
                    <Text style={styles.followupText}>{q}</Text>
                    <MaterialIcons name="arrow-forward" size={14} color={colors.blue[500]} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const EMOJI_RULES: [RegExp, string][] = [
  [/visa|immigration|arc|residence|passport|embassy/, '🛂'],
  [/legal|\blaw\b/, '⚖️'],
  [/flight|airport|airline|plane|fly/, '✈️'],
  [/taxi|cab|kakao t|uber/, '🚕'],
  [/bus|subway|metro|train|ktx|transport|t-money|tmoney/, '🚇'],
  [/hospital|doctor|pharmacy|clinic|medicine|dentist|health|insurance/, '🏥'],
  [/apartment|lease|rent|house|housing|deposit|jeonse|wolse|officetel|realtor/, '🏠'],
  [/bank|account|card|money|won|exchange|atm|transfer|pay|tax|finance/, '💳'],
  [/phone|sim|number|carrier|kt|skt|lg u\+|wifi|internet|connectivity/, '📱'],
  [/food|restaurant|eat|cafe|coffee|kimchi|bbq|chicken|delivery|baemin|halal|vegan|dining/, '🍜'],
  [/shop|market|mall|buy|coupang|olive young|daiso/, '🛍️'],
  [/job|work|salary|contract|employ|resume|interview|hire/, '💼'],
  [/school|university|study|class|korean|language|topik|learn|education/, '📚'],
  [/hik|mountain|park|beach|trip|travel|tour|island|jeju|busan|weekend/, '🏞️'],
  [/concert|event|festival|show|ticket|k-pop|kpop|museum|exhibit|entertainment/, '🎟️'],
  [/police|emergency|lost|help|fire|119|112/, '🚨'],
  [/weather|rain|snow|typhoon|hot|cold/, '🌤️'],
];

/** Chip emoji guessed from the thread's title (the list API carries no category). */
export function emojiForQuery(q: string, category?: string | null): string {
  if (category) {
    const c = category.toLowerCase().replace(/_/g, ' ');
    for (const [re, e] of EMOJI_RULES) if (re.test(c)) return e;
  }
  const s = q.toLowerCase();
  for (const [re, e] of EMOJI_RULES) if (re.test(s)) return e;
  return '💬';
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing[4],
    paddingLeft: spacing[4],
    paddingRight: spacing[3],
    borderRadius: 16,
    backgroundColor: '#fefefe',
  },
  cardPressed: { backgroundColor: colors.blue[170] },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  categoryChip: {
    backgroundColor: colors.blue[170],
    borderRadius: 8,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  categoryText: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.text.primary,
    textAlign: 'center',
  },
  titleCol: { flex: 1, marginTop: 2 },
  question: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
  },
  meta: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[900],
    marginTop: 2,
  },
  chevron: { marginTop: 0 },
  // Closing: the body takes no space at once (the cell shrinks) while it
  // fades; the gap to the header lives inside it so it disappears too.
  bodyClosed: { height: 0, overflow: 'hidden' },
  bodyOpen: { overflow: 'hidden' },
  body: { paddingTop: spacing[3] },
  // Chat transcript.
  chat: { gap: spacing[2] },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '86%',
    backgroundColor: colors.blue[500],
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginTop: spacing[1],
  },
  userText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.onDark,
  },
  botBubble: {
    alignSelf: 'flex-start',
    maxWidth: '94%',
    backgroundColor: colors.surface.soft,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  botBubbleMuted: { backgroundColor: colors.surface.line },
  // Suggested follow-ups for a turn: outlined chips under its answer.
  followups: { gap: spacing[1], alignSelf: 'stretch', paddingRight: spacing[2], marginTop: spacing[1] },
  followupChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[2],
    maxWidth: '94%',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.blue[200],
    backgroundColor: colors.gray[100],
  },
  followupChipPressed: { backgroundColor: colors.blue[100] },
  followupText: {
    flexShrink: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.13,
    color: colors.blue[700],
  },
  mutedText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.13,
    color: colors.text.disabled,
    fontStyle: 'italic',
  },
  truncatedNote: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    color: colors.gray[800],
    textAlign: 'center',
    marginBottom: spacing[1],
  },
  loaderRow: { paddingVertical: spacing[2], alignItems: 'flex-start', paddingLeft: spacing[2] },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap' },
  stateText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.13,
    color: colors.text.disabled,
  },
  retryLink: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 18,
    color: colors.blue[500],
  },
});
