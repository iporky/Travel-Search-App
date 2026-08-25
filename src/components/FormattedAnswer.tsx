import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

// Lightweight renderer for Kiki's markdown-ish answers — shared by the live
// search results screen and the History accordion (the History API stores the
// same text the stream produced). Handles "### " headings, "- " bullets,
// **bold** inline, and [Web N] / [Source N] citations.
//
// `compact` renders at the History card's Body/14/20 scale (Figma
// History_Expanded 12354:55779); default matches the search results screen.

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

const CITATION_SPLIT = /(\*\*[^*]+\*\*|\[(?:Web|Source) \d+\])/g;
const CITATION_TEST = /^\[(?:Web|Source) \d+\]$/;

function InlineText({ text, style }: { text: string; style: any }) {
  const parts = text.split(CITATION_SPLIT).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={i} style={mdStyles.bold}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (CITATION_TEST.test(part)) {
          return (
            <Text key={i} style={mdStyles.citation}>
              {' '}{part}
            </Text>
          );
        }
        return <Text key={i}>{part}</Text>;
      })}
    </Text>
  );
}

export function FormattedSummary({ text, compact }: { text: string; compact?: boolean }) {
  const blocks = useMemo(() => text.split('\n').map((l) => l.trimEnd()), [text]);
  const s = compact ? compactStyles : mdStyles;
  return (
    <View style={s.container}>
      {blocks.map((line, i) => {
        if (!line.trim()) return <View key={i} style={s.gap} />;
        const h = /^(#{1,4}) /.exec(line);
        if (h) {
          return <InlineText key={i} text={line.slice(h[1].length + 1)} style={s.h3} />;
        }
        if (line.startsWith('- ')) {
          return (
            <View key={i} style={s.bulletRow}>
              <Text style={s.bulletDot}>•</Text>
              <InlineText text={line.slice(2)} style={[s.body, s.bulletText]} />
            </View>
          );
        }
        return <InlineText key={i} text={line} style={s.body} />;
      })}
    </View>
  );
}

const mdStyles = StyleSheet.create({
  container: { gap: sy(2) },
  gap: { height: sy(10) },
  h3: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(16),
    lineHeight: sy(24),
    color: '#1d192b',
    letterSpacing: -0.16,
    marginTop: sy(6),
  },
  body: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: sx(15),
    lineHeight: sy(24),
    color: '#1d192b',
    letterSpacing: -0.1,
  },
  bold: { fontFamily: 'NationalPark_700Bold' },
  citation: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(11),
    color: '#527dff',
  },
  bulletRow: { flexDirection: 'row', gap: sx(8), paddingRight: sx(8) },
  bulletDot: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(15),
    lineHeight: sy(24),
    color: '#527dff',
  },
  bulletText: { flex: 1 },
});

// History accordion scale — Body/14/Medium with 14/Bold headings.
const compactStyles = StyleSheet.create({
  container: { gap: 2 },
  gap: { height: 8 },
  h3: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: '#332d41',
    marginTop: 4,
  },
  body: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: '#332d41',
  },
  bulletRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  bulletDot: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 14,
    lineHeight: 20,
    color: '#527dff',
  },
  bulletText: { flex: 1 },
});
