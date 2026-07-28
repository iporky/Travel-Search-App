import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

export type BuzzTab = 'ping' | 'drops' | 'vibes';

// Fixed display order — links are the other two tabs in this order.
export const BUZZ_TABS: BuzzTab[] = ['ping', 'drops', 'vibes'];

const TITLES: Record<BuzzTab, string> = { ping: 'Ping', drops: 'Drops', vibes: 'Vibes' };

type Props = {
  active: BuzzTab;
  onChange: (tab: BuzzTab) => void;
  onSearch?: () => void;
  onAdd?: () => void;
  /** Ping hides the add action by default; sub-sections that can create opt in. */
  showAdd?: boolean;
};

// Figma: "Main container" (node 10329:26399) — shared header/tab-switcher for the
// three Buzz sub-features. Active tab renders large (35px ExtraBold) with a
// tagline; the other two appear as light-blue links. Ping shows a search icon;
// Drops/Vibes show search + add.
export function BuzzTabHeader({ active, onChange, onSearch, onAdd, showAdd }: Props) {
  const { t } = useTranslation();
  const links = BUZZ_TABS.filter((tab) => tab !== active);
  const withAdd = showAdd ?? active !== 'ping';

  return (
    <View style={[styles.container, withAdd && styles.containerWithAdd]}>
      <View style={styles.row}>
        <View style={styles.logoLinks}>
          <Text style={styles.activeTitle}>{TITLES[active]}</Text>
          <View style={styles.links}>
            {links.map((tab) => (
              <Pressable key={tab} onPress={() => onChange(tab)} hitSlop={8}>
                <Text style={styles.linkText}>{TITLES[tab]}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.iconBtn} hitSlop={4} onPress={onSearch}>
            <Ionicons name="search" size={24} color={colors.icon.primary} />
          </Pressable>
          {withAdd && (
            <Pressable style={styles.iconBtn} hitSlop={4} onPress={onAdd}>
              <Ionicons name="add" size={28} color={colors.icon.primary} />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.tagline}>{t(`buzzTabs.${active}Tagline`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: spacing[5],
    paddingRight: spacing[5],
    paddingTop: spacing[2],
    gap: spacing[2],
  },
  containerWithAdd: { paddingRight: spacing[2] },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoLinks: { flexDirection: 'row', alignItems: 'center', gap: spacing[5], flexShrink: 1 },
  activeTitle: {
    fontFamily: 'NationalPark_800ExtraBold',
    fontSize: 35,
    lineHeight: 44,
    letterSpacing: -1.4,
    color: colors.text.primary,
  },
  links: { flexDirection: 'row', alignItems: 'center', gap: spacing[4] },
  linkText: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 16,
    lineHeight: 44,
    letterSpacing: -0.64,
    color: colors.blue[170],
  },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.12,
    color: colors.gray[700],
  },
});
