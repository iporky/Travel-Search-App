import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import { askCategories, askFeed } from '../../mocks/ask';
import { momentsFeed } from '../../mocks/moments';
import { tipsFeed } from '../../mocks/tips';
import { SectionHeading } from '../../components/buzz/SectionHeading';
import { TipPill } from '../../components/buzz/TipPill';
import { MessagePreviewCard } from '../../components/buzz/MessagePreviewCard';
import { ConversationCard } from '../../components/buzz/ConversationCard';
import { MomentSmallCard } from '../../components/buzz/MomentSmallCard';

type Props = {
  /** "Just in" See all → Ask feed sorted New (per the designer's annotation). */
  onSeeAllJustIn: () => void;
  /** "Join the conversation" See all → Ask feed sorted Popular. */
  onSeeAllConversation: () => void;
  onSeeAllMoments: () => void;
  onOpenAsk: (postId: string) => void;
  onOpenMoment: (momentId: string) => void;
  /** Tapping either tip banner opens the Tips feed. */
  onOpenTips: () => void;
};

// Figma: "Ping_Home" (node 11452:64916) — one scrolling frame: tip row, category
// chips, then three horizontal carousels (Just in / Join the conversation /
// Moments), each with a "See all" that opens that section's own screen.
export function PingHome({
  onSeeAllJustIn,
  onSeeAllConversation,
  onSeeAllMoments,
  onOpenAsk,
  onOpenMoment,
  onOpenTips,
}: Props) {
  const { t } = useTranslation();

  // Latest questions people can join, then the most-discussed ones.
  const justIn = askFeed.slice(0, 5);
  const conversations = askFeed.filter((p) => p.comments.length > 0).slice(0, 5);
  const moments = momentsFeed.slice(0, 5);

  return (
    <ScrollView
      style={styles.flex}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <TipPill
        category={tipsFeed[0].category}
        text={tipsFeed[0].text}
        author={tipsFeed[0].author}
        onPress={onOpenTips}
      />

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        <View style={[styles.chip, styles.chipSelected]}>
          <Text style={styles.chipTextSelected}>{t('moments.all')}</Text>
        </View>
        {askCategories.map((c) => (
          <View key={c} style={styles.chip}>
            <Text style={styles.chipText}>{c}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 1 — Latest Ask posts you can join */}
      <View style={styles.section}>
        <SectionHeading title={t('ping.justIn')} onSeeAll={onSeeAllJustIn} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {justIn.map((post) => (
            <MessagePreviewCard
              key={post.id}
              title={post.title}
              time={post.time}
              author={post.author}
              onPress={() => onOpenAsk(post.id)}
              onJoin={() => onOpenAsk(post.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* 2 — Top questions with answers */}
      <View style={styles.section}>
        <SectionHeading title={t('ping.joinConversation')} onSeeAll={onSeeAllConversation} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {conversations.map((post) => (
            <ConversationCard
              key={post.id}
              category={post.category}
              time={post.time}
              question={post.title}
              answer={post.comments[0]?.text}
              likes={post.likes}
              comments={post.comments.length}
              asker={post.author}
              answerer={post.comments[0]?.author}
              onPress={() => onOpenAsk(post.id)}
            />
          ))}
        </ScrollView>
      </View>

      <TipPill
        category={tipsFeed[1].category}
        text={tipsFeed[1].text}
        author={tipsFeed[1].author}
        onPress={onOpenTips}
      />

      {/* 3 — Moments */}
      <View style={styles.section}>
        <SectionHeading title={t('moments.title')} onSeeAll={onSeeAllMoments} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {moments.map((m) => (
            <MomentSmallCard
              key={m.id}
              photo={m.photos[0]}
              text={m.text}
              author={m.author}
              likes={m.likes}
              comments={m.comments.length}
              time={m.time}
              onPress={() => onOpenMoment(m.id)}
            />
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing[4], paddingBottom: spacing[16], gap: spacing[6] },
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
  section: { gap: spacing[4] },
  carousel: { gap: spacing[3], paddingHorizontal: spacing[5] },
});
