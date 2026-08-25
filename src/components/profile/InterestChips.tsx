import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

// Figma Interests section (12322:53992 / "Popular categories list", Aug
// revision): chips live inside a white card; unselected: 1px SOLID #abbed2,
// radius 12, p8, 14/Medium; selected: #527dff fill, 14/Medium #f2f9ff. Only
// "+ Add more" keeps the dashed border. Rows gap 4, list gap 8. Chips are
// inert until the section's edit pencil is active (same as the website).

/** The web app's predefined interests (stored verbatim in personalization.interests). */
export const PREDEFINED_INTERESTS = [
  'Technology',
  'Science',
  'Music',
  'Art',
  'Sports',
  'Cooking',
  'Photography',
  'Reading',
  'Gaming',
] as const;

/** Max selected interests (design annotation: "Maximum 5 interests can be selected"). */
export const MAX_INTERESTS = 5;

const PRESET_EMOJI: Record<string, string> = {
  Technology: '💻',
  Science: '🔬',
  Music: '🎵',
  Art: '🎨',
  Sports: '⚽',
  Cooking: '🍳',
  Photography: '📷',
  Reading: '📚',
  Gaming: '🎮',
};

/**
 * Emoji prefix for a chip. Presets are fixed; custom interests get a keyword
 * guess (the design's open question — auto-generated rather than hand-set).
 */
export function interestEmoji(name: string): string {
  if (PRESET_EMOJI[name]) return PRESET_EMOJI[name];
  const s = name.toLowerCase();
  const rules: [RegExp, string][] = [
    [/eat|food|snack|burger|pizza|dining|restaurant/, '🍔'],
    [/shop|fashion|cloth|style/, '🛍️'],
    [/coffee|cafe|tea/, '☕'],
    [/travel|trip|explor|adventure/, '✈️'],
    [/hik|mountain|nature|camp|outdoor/, '🏞️'],
    [/movie|film|cinema|drama|k-drama|netflix/, '🎬'],
    [/k-?pop|concert|dance|sing|karaoke/, '🎤'],
    [/fitness|gym|yoga|run|workout|health/, '🏋️'],
    [/language|korean|study|learn|book/, '📖'],
    [/beauty|skin|makeup/, '💄'],
    [/pet|dog|cat|animal/, '🐶'],
    [/car|drive|bike|cycling/, '🚗'],
    [/history|museum|culture|temple|palace/, '🏛️'],
    [/night|bar|club|drink|beer|soju/, '🍻'],
    [/photo|camera/, '📸'],
    [/game|esport/, '🕹️'],
    [/business|startup|invest|finance/, '💼'],
    [/volunteer|community|social|meet/, '🤝'],
  ];
  for (const [re, e] of rules) if (re.test(s)) return e;
  return '✨';
}

export function InterestChip({
  label,
  selected,
  onPress,
  dashed,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Dashed border — only "+ Add more" uses it in the Aug design. */
  dashed?: boolean;
}) {
  const filled = selected && !dashed;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        filled ? styles.chipSelected : styles.chipOutline,
        dashed && styles.chipDashed,
        pressed && !!onPress && (filled ? styles.chipSelectedPressed : styles.chipOutlinePressed),
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.chipText, filled && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function InterestChipList({
  interests,
  selected,
  onToggle,
  onAddMore,
  addMoreLabel,
  editable = true,
}: {
  /** Every chip to show (presets + custom), in order. */
  interests: string[];
  selected: string[];
  onToggle: (name: string) => void;
  onAddMore: () => void;
  addMoreLabel: string;
  /** When false (pencil not active) the chips render but don't respond. */
  editable?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {interests.map((name) => (
        <InterestChip
          key={name}
          label={`${interestEmoji(name)} ${name}`}
          selected={selected.includes(name)}
          onPress={editable ? () => onToggle(name) : undefined}
        />
      ))}
      <InterestChip label={addMoreLabel} dashed onPress={editable ? onAddMore : undefined} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 4, rowGap: spacing[2] },
  chip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOutline: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.gray[600],
  },
  chipDashed: { borderStyle: 'dashed' },
  chipOutlinePressed: { backgroundColor: colors.surface.soft },
  chipSelected: { backgroundColor: colors.blue[500] },
  chipSelectedPressed: { backgroundColor: colors.blue[600] },
  chipText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[900],
    textAlign: 'center',
  },
  chipTextSelected: { color: colors.surface.default },
});
