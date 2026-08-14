import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import {
  BuzzActivity,
  BuzzContentKind,
  BuzzHistoryFilters,
  HistorySort,
  HistoryTimeRange,
} from '../../types/history';
import { buzzHistory } from '../../mocks/history';
import { DropdownFilter, FilterOption } from '../../components/history/FilterChips';
import { ActionSheetMenu } from '../../components/buzz/ActionSheetMenu';
import { MomentAvatar } from '../../components/moments/MomentCard';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';

// Figma: SearchResult_WithQuery (10936:78165). Back arrow + search input,
// "245 results for "E7 Visa"" count line, the Buzz filter bar, then Ping-style
// feed cards (category, title, author · time · location, heart + ··· / bookmark).

type Props = { onBack: () => void };

export function HistorySearchScreen({ onBack }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<BuzzHistoryFilters>({
    activity: null,
    content: null,
    sort: 'newest',
    time: 'thisYear',
  });
  const [liked, setLiked] = useState<Record<string, boolean>>(
    () => Object.fromEntries(buzzHistory.map((i) => [i.id, i.liked])),
  );
  const [saved, setSaved] = useState<Record<string, boolean>>(
    () => Object.fromEntries(buzzHistory.map((i) => [i.id, i.saved])),
  );
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const activityOptions: FilterOption[] = (
    ['saved', 'liked', 'myPosts', 'myComments'] as const
  ).map((v) => ({ value: v, label: t(`history.activity.${v}`) }));
  const contentOptions: FilterOption[] = (['ping', 'drop', 'vibe'] as const).map((v) => ({
    value: v,
    label: t(`history.content.${v}`),
  }));
  const sortOptions: FilterOption[] = (['newest', 'oldest', 'recentlyViewed'] as const).map(
    (v) => ({ value: v, label: t(`history.sort.${v}`) }),
  );
  const timeOptions: FilterOption[] = (
    ['today', 'last7', 'last30', 'last3m', 'last6m', 'thisYear', 'allTime'] as const
  ).map((v) => ({ value: v, label: t(`history.time.${v}`) }));

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = buzzHistory;
    if (q) {
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.author.toLowerCase().includes(q),
      );
    }
    if (filters.activity) {
      items = items.filter((i) =>
        filters.activity === 'saved'
          ? saved[i.id]
          : filters.activity === 'liked'
            ? liked[i.id]
            : i.activity === filters.activity,
      );
    }
    if (filters.content) items = items.filter((i) => i.kind === filters.content);
    if (filters.sort === 'oldest') items = [...items].reverse();
    return items;
  }, [query, filters, liked, saved]);

  return (
    <KeyboardStickyView style={styles.screen}>
      {/* Search bar: back + input (Onboarding/Input/Field pattern). */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} hitSlop={8} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.gray[1300]} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={20} color={colors.gray[900]} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t('history.searchPlaceholder')}
            placeholderTextColor={colors.gray[900]}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.gray[700]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* "245 results for "E7 Visa"" */}
      {query.trim().length > 0 && (
        <View style={styles.countRow}>
          <Text style={styles.countStrong}>
            {t('history.resultsCount', { count: results.length })}
          </Text>
          <Text style={styles.countMuted}> {t('history.for')} </Text>
          <Text style={styles.countQuery}>"{query.trim()}"</Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        <DropdownFilter
          label={t('history.filters.activity')}
          valueLabel={
            filters.activity
              ? t(`history.activity.${filters.activity}`)
              : t('history.filters.activity')
          }
          active={filters.activity != null}
          title={t('history.filters.activity')}
          options={activityOptions}
          selected={filters.activity}
          clearable
          onSelect={(v) => setFilters((f) => ({ ...f, activity: v as BuzzActivity | null }))}
        />
        <DropdownFilter
          label={t('history.filters.content')}
          valueLabel={
            filters.content ? t(`history.content.${filters.content}`) : t('history.filters.content')
          }
          active={filters.content != null}
          title={t('history.filters.content')}
          options={contentOptions}
          selected={filters.content}
          clearable
          onSelect={(v) => setFilters((f) => ({ ...f, content: v as BuzzContentKind | null }))}
        />
        <DropdownFilter
          label={t('history.filters.sort')}
          valueLabel={t(`history.sort.${filters.sort}`)}
          active={filters.sort !== 'newest'}
          title={t('history.filters.sort')}
          options={sortOptions}
          selected={filters.sort}
          onSelect={(v) => v && setFilters((f) => ({ ...f, sort: v as HistorySort }))}
        />
        <DropdownFilter
          label={t('history.filters.time')}
          valueLabel={t(`history.time.${filters.time}`)}
          active={filters.time !== 'thisYear'}
          title={t('history.filters.time')}
          options={timeOptions}
          selected={filters.time}
          onSelect={(v) => v && setFilters((f) => ({ ...f, time: v as HistoryTimeRange }))}
        />
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.results}
        keyboardShouldPersistTaps="handled"
      >
        {results.length === 0 ? (
          <Text style={styles.empty}>{t('history.noResults')}</Text>
        ) : (
          results.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.category}>{item.category}</Text>
                <Pressable
                  hitSlop={8}
                  onPress={() => setSaved((m) => ({ ...m, [item.id]: !m[item.id] }))}
                >
                  <Ionicons
                    name={saved[item.id] ? 'bookmark' : 'bookmark-outline'}
                    size={22}
                    color={saved[item.id] ? colors.blue[500] : colors.icon.disabled}
                  />
                </Pressable>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.infoRow}>
                <View style={styles.userDetails}>
                  <MomentAvatar name={item.author} />
                  <Text style={styles.username} numberOfLines={1}>
                    {item.author}
                  </Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.meta}>{item.time}</Text>
                  <Text style={styles.dot}>•</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={styles.actionBtn}
                    hitSlop={4}
                    onPress={() => setLiked((m) => ({ ...m, [item.id]: !m[item.id] }))}
                  >
                    <Ionicons
                      name={liked[item.id] ? 'heart' : 'heart-outline'}
                      size={22}
                      color={liked[item.id] ? colors.red[100] : colors.icon.disabled}
                    />
                  </Pressable>
                  <Pressable style={styles.moreBtn} hitSlop={6} onPress={() => setMenuFor(item.id)}>
                    <Ionicons name="ellipsis-horizontal" size={22} color={colors.icon.disabled} />
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <ActionSheetMenu
        visible={menuFor != null}
        items={
          menuFor
            ? [
                {
                  label: saved[menuFor]
                    ? t('history.actions.unsave')
                    : t('history.actions.save'),
                  onPress: () => setSaved((m) => ({ ...m, [menuFor]: !m[menuFor] })),
                },
              ]
            : []
        }
        onClose={() => setMenuFor(null)}
      />
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface.default },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingLeft: spacing[1],
    paddingRight: spacing[5],
    paddingVertical: spacing[1],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.subtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 40,
  },
  input: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    letterSpacing: -0.14,
    color: colors.gray[1300],
    padding: 0,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[1],
  },
  countStrong: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.text.primary,
  },
  countMuted: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    color: colors.icon.disabled,
  },
  countQuery: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.blue[500],
  },
  chipsScroll: { flexGrow: 0 },
  chipsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
  },
  results: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    gap: spacing[3],
  },
  empty: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    color: colors.text.disabled,
    textAlign: 'center',
    marginTop: spacing[10],
  },
  // Ping feed card (10247:63373): rounded except bottom-left.
  card: {
    backgroundColor: colors.gray[100],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    borderBottomLeftRadius: 0,
    paddingTop: spacing[2],
    paddingLeft: spacing[4],
    paddingRight: spacing[1],
    paddingBottom: spacing[1],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 35,
  },
  category: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[1000],
  },
  cardTitle: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
    paddingRight: spacing[3],
  },
  infoRow: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userDetails: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], flex: 1, minWidth: 0 },
  username: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
    marginLeft: 2,
  },
  dot: { fontSize: 11, color: colors.gray[900] },
  meta: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
  actions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  actionBtn: { padding: spacing[2] },
  moreBtn: { padding: spacing[2] },
});
