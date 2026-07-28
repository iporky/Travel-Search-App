import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { TIP_MAX_LENGTH, tipCategoryGroups } from '../../mocks/tips';

type Props = {
  initialCategory?: string;
  initialText?: string;
  editing?: boolean;
  onBack: () => void;
  onSubmit: (category: string, text: string) => void;
};

// Figma: "TipsFeed_WritingPost_SelectCategory" (node 11478:74819) — pick exactly
// one category from three labelled groups (unselected chips are dashed outlines,
// the selected one fills accent blue), then write the tip. Capped at 40 chars.
export function TipComposeView({
  initialCategory,
  initialText = '',
  editing,
  onBack,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<string | undefined>(initialCategory);
  const [text, setText] = useState(initialText);

  const canSave =
    !!category && text.trim().length > 0 && (text !== initialText || category !== initialCategory);

  return (
    <KeyboardStickyView style={styles.flex}>
      <View style={styles.appBar}>
        <Pressable style={styles.backBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={28} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.appBarTitle}>
          {editing ? t('tips.editTitle') : t('tips.composeTitle')}
        </Text>
        <Pressable
          style={styles.saveBtn}
          hitSlop={6}
          disabled={!canSave}
          onPress={() => canSave && onSubmit(category!, text.trim())}
        >
          <Text style={[styles.saveText, canSave && styles.saveTextActive]}>{t('tips.save')}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t('tips.selectCategory')}</Text>
          <Text style={styles.blockSubtitle}>{t('tips.selectCategoryHint')}</Text>
        </View>

        {tipCategoryGroups.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{t(`tips.groups.${group.title.toLowerCase()}`)}</Text>
            <View style={styles.chipWrap}>
              {group.categories.map((c) => {
                const selected = category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Text style={selected ? styles.chipTextSelected : styles.chipText}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.group}>
          <Text style={styles.blockTitle}>{t('tips.shareTips')}</Text>
          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={(v) => setText(v.slice(0, TIP_MAX_LENGTH))}
              placeholder={t('tips.placeholder')}
              placeholderTextColor={colors.gray[700]}
              multiline
              maxLength={TIP_MAX_LENGTH}
            />
          </View>
          <Text style={styles.counter}>
            {text.length}/{TIP_MAX_LENGTH}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.cta, !canSave && styles.ctaDisabled]}
          disabled={!canSave}
          onPress={() => canSave && onSubmit(category!, text.trim())}
        >
          <Text style={styles.ctaText}>{editing ? t('tips.save') : t('tips.post')}</Text>
        </Pressable>
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  appBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  appBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 18,
    lineHeight: 21,
    letterSpacing: -0.18,
    color: colors.gray[1300],
  },
  saveBtn: { minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  saveText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[700],
  },
  saveTextActive: { color: colors.blue[500] },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[6], gap: spacing[6] },
  block: { gap: spacing[2] },
  blockTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  blockSubtitle: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
  },
  group: { gap: spacing[3] },
  groupTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[900],
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1] },
  chip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gray[600],
    borderRadius: radius.md,
    padding: spacing[2],
  },
  chipSelected: {
    backgroundColor: colors.blue[500],
    borderColor: colors.blue[500],
    borderStyle: 'solid',
  },
  chipText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    textAlign: 'center',
    color: colors.gray[900],
  },
  chipTextSelected: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    textAlign: 'center',
    color: colors.surface.default,
  },
  inputArea: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    minHeight: 72,
  },
  input: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[1300],
    padding: 0,
  },
  counter: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    textAlign: 'right',
    opacity: 0.7,
    color: colors.gray[700],
  },
  bottomBar: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[6] },
  cta: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: colors.gray[600] },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
});
