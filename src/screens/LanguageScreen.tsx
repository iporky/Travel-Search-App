import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { AppLanguage, LANGUAGES, useLanguage } from '../context/LanguageContext';

const { width: W, height: H } = Dimensions.get('window');
const DESIGN_W = 375;
const DESIGN_H = 812;
const sx = (n: number) => (n * W) / DESIGN_W;
const sy = (n: number) => (n * H) / DESIGN_H;

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Select Language screen (Figma node 10352:31136).
 * Presented as a full-screen modal so it can open from any splash page.
 */
export function LanguageScreen({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();
  const [pending, setPending] = useState<AppLanguage>(language);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter(
      (l) => l.label.toLowerCase().includes(q) || l.code.toLowerCase().includes(q),
    );
  }, [query]);

  const confirm = () => {
    setLanguage(pending);
    setSearchOpen(false);
    setQuery('');
    onClose();
  };

  const close = () => {
    setPending(language);
    setSearchOpen(false);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <LinearGradient colors={['#eaf4ff', '#f2f9ff']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={close} hitSlop={10} style={styles.topBtn}>
            <Ionicons name="chevron-back" size={sx(22)} color="#1d192b" />
          </Pressable>

          {searchOpen ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('language.searchPlaceholder')}
              placeholderTextColor="#93a5b9"
              autoFocus
              style={styles.searchInput}
            />
          ) : (
            <Text style={styles.title}>{t('language.select')}</Text>
          )}

          <Pressable
            onPress={() => {
              if (searchOpen) setQuery('');
              setSearchOpen((s) => !s);
            }}
            hitSlop={10}
            style={styles.topBtn}
          >
            <Ionicons name={searchOpen ? 'close' : 'search'} size={sx(20)} color="#1d192b" />
          </Pressable>
        </View>

        {/* Language rows */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {list.map((lang) => {
            const selected = lang.code === pending.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => setPending(lang)}
                style={[styles.row, selected && styles.rowSelected]}
              >
                <Text style={styles.rowLabel}>{lang.label}</Text>
                {selected ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={sx(15)} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <Pressable onPress={confirm} style={styles.cta}>
            <Text style={styles.ctaText}>{t('common.confirm')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  topBar: {
    height: sy(44),
    marginTop: sy(8),
    paddingHorizontal: sx(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: sx(8),
  },
  topBtn: {
    width: sx(36),
    height: sx(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_700Bold',
    fontSize: sx(20),
    lineHeight: sy(24),
    color: '#1d192b',
    letterSpacing: -0.2,
  },
  searchInput: {
    flex: 1,
    height: sy(40),
    borderRadius: sx(20),
    backgroundColor: '#fff',
    paddingHorizontal: sx(16),
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(15),
    color: '#1d192b',
  },

  scroll: { flex: 1, marginTop: sy(14) },
  listContent: {
    paddingHorizontal: sx(20),
    paddingBottom: sy(16),
    gap: sy(10),
  },
  row: {
    minHeight: sy(64),
    borderRadius: sx(16),
    backgroundColor: '#fefefe',
    paddingHorizontal: sx(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: {
    backgroundColor: '#eaefff',
    borderColor: '#527dff',
  },
  rowLabel: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    lineHeight: sy(24),
    color: '#1d192b',
    letterSpacing: -0.16,
  },
  checkCircle: {
    width: sx(24),
    height: sx(24),
    borderRadius: 999,
    backgroundColor: '#2b5ef8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomBar: {
    paddingHorizontal: sx(20),
    paddingTop: sy(12),
    paddingBottom: sy(12),
  },
  cta: {
    height: sy(56),
    borderRadius: 999,
    backgroundColor: '#527dff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    color: '#f2f9ff',
    letterSpacing: -0.16,
  },
});
