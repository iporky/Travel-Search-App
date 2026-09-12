import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

// Figma "Search_QuickAnswer_FollowUp" (13253:91524) answer body: the
// markdown-ish text Kiki streams, mapped onto the template's type scale
// instead of a card —
//   • the answer's first heading → Heading/20/Bold title,
//   • every later heading → a numbered section head ("01" Body/14/SemiBold +
//     Body/16/SemiBold text, gap 12),
//   • paragraphs → Body/14/Regular on content-strong,
//   • bullet lines → meta rows (16 slot + gap 6, Body/14/Regular on
//     content-primary),
//   • [Web N] / [Source N] citations → Caption/12/Medium "N)" marks in #a4bbd3,
// inside the "Summary Section" (px 12, pb 12, radius 12, sections 8 apart).
// The History transcript keeps its own compact renderer (FormattedAnswer).

const { width: W, height: H } = Dimensions.get('window');
const sx = (n: number) => (n * W) / 375;
const sy = (n: number) => (n * H) / 812;

const CITATION = /\[(?:Web|Source)\s*\d+(?:\s*,\s*(?:Web|Source)\s*\d+)*\]/;
const INLINE_SPLIT = new RegExp(`(\\*\\*[^*]+\\*\\*|${CITATION.source})`, 'g');

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'bullet'; text: string };

/** "[Web 1, Web 4]" → "1) 4)". */
function citationMarks(token: string): string {
  return (token.match(/\d+/g) ?? []).map((n) => `${n})`).join(' ');
}

function InlineText({ text, style }: { text: string; style: any }) {
  const parts = text.split(INLINE_SPLIT).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={styles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (CITATION.test(part) && part.startsWith('[')) {
          return (
            <Text key={i} style={styles.citation}>
              {' '}
              {citationMarks(part)}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

/** Title (first heading) + sections split at the remaining headings. */
export function parseQuickAnswer(text: string): { title: string | null; sections: Block[][] } {
  const blocks: Block[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const h = /^#{1,4}\s+(.*)$/.exec(line);
    if (h) {
      blocks.push({ kind: 'heading', text: h[1].replace(/\*\*/g, '').trim() });
      continue;
    }
    const b = /^(?:[-*•]\s+)(.*)$/.exec(line);
    if (b) {
      blocks.push({ kind: 'bullet', text: b[1] });
      continue;
    }
    blocks.push({ kind: 'para', text: line });
  }
  let title: string | null = null;
  if (blocks[0]?.kind === 'heading') title = (blocks.shift() as { text: string }).text;
  const sections: Block[][] = [];
  let cur: Block[] = [];
  for (const bl of blocks) {
    if (bl.kind === 'heading') {
      if (cur.length) sections.push(cur);
      cur = [bl];
    } else {
      cur.push(bl);
    }
  }
  if (cur.length) sections.push(cur);
  return { title, sections };
}

export function QuickAnswer({ text }: { text: string }) {
  const { title, sections } = useMemo(() => parseQuickAnswer(text), [text]);
  let n = 0;
  return (
    <View style={styles.block}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.summary}>
        {sections.map((sec, si) => (
          <View key={si} style={styles.section}>
            {sec.map((bl, bi) => {
              if (bl.kind === 'heading') {
                n += 1;
                return (
                  <View key={bi} style={styles.headingRow}>
                    <Text style={styles.num}>{String(n).padStart(2, '0')}</Text>
                    <InlineText text={bl.text} style={styles.heading} />
                  </View>
                );
              }
              if (bl.kind === 'bullet') {
                return (
                  <View key={bi} style={styles.bulletRow}>
                    <View style={styles.bulletSlot}>
                      <View style={styles.bulletDot} />
                    </View>
                    <InlineText text={bl.text} style={styles.bulletText} />
                  </View>
                );
              }
              return <InlineText key={bi} text={bl.text} style={styles.para} />;
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Title + Summary Section, 8 apart.
  block: { gap: sy(8) },
  title: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(20),
    lineHeight: sy(24),
    letterSpacing: -0.2,
    color: '#1d192b',
  },
  summary: {
    paddingHorizontal: sx(12),
    paddingBottom: sy(12),
    borderRadius: sx(12),
    gap: sy(8),
  },
  section: { gap: sy(4) },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: sx(12) },
  num: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(14),
    lineHeight: sy(20),
    letterSpacing: -0.14,
    color: '#1d192b',
  },
  heading: {
    flex: 1,
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    lineHeight: sy(21),
    letterSpacing: -0.16,
    color: '#1d192b',
  },
  para: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(14),
    lineHeight: sy(20),
    letterSpacing: -0.14,
    color: '#1d192b',
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: sx(6) },
  bulletSlot: { width: sx(16), height: sy(20), alignItems: 'center', justifyContent: 'center' },
  bulletDot: { width: sx(5), height: sx(5), borderRadius: 999, backgroundColor: '#a4bbd3' },
  bulletText: {
    flex: 1,
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(14),
    lineHeight: sy(20),
    letterSpacing: -0.14,
    color: '#332d41',
  },
  bold: { fontFamily: 'NationalPark_600SemiBold' },
  citation: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(12),
    lineHeight: sy(16),
    letterSpacing: -0.12,
    color: '#a4bbd3',
  },
});
