import React, { useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { colors, radius, spacing } from '../../theme/tokens';

type Props = {
  initialPhotos?: string[];
  initialCaption?: string;
  editing?: boolean;
  onBack: () => void;
  onSubmit: (photos: string[], caption: string) => void;
};

// Figma: "WritingPost_Drop_Empty / _PhotoAttached" (11478:75321 / 75340) —
// empty shows a big "+" add-photo tile (Publish disabled); once photos are added
// it shows the main preview with a remove (×), a selectable thumbnail strip, a
// caption input, and an enabled blue Publish.
export function DropComposeView({
  initialPhotos = [],
  initialCaption = '',
  editing,
  onBack,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [cover, setCover] = useState(0);
  const [caption, setCaption] = useState(initialCaption);

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('drops.permissionTitle'), t('drops.permissionBody'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 1,
    });
    if (!res.canceled) {
      setPhotos((prev) => [...prev, ...res.assets.map((a) => a.uri)]);
    }
  };

  const removeCover = () => {
    setPhotos((prev) => prev.filter((_, i) => i !== cover));
    setCover(0);
  };

  const canPublish = photos.length > 0;

  return (
    <KeyboardStickyView style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} hitSlop={6} onPress={onBack}>
          <Ionicons name="chevron-back" size={24} color={colors.icon.primary} />
        </Pressable>
        <Text style={styles.topTitle}>{t('drops.composeTitle')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {photos.length === 0 ? (
          <Pressable style={styles.emptyTile} onPress={pickPhotos}>
            <View style={styles.plusCircle}>
              <Ionicons name="add" size={24} color={colors.icon.accent} />
            </View>
            <Text style={styles.emptyHint}>{t('drops.emptyHint')}</Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.preview}>
              <Image source={{ uri: photos[cover] }} style={styles.previewImage} />
              <Pressable style={styles.removeBtn} hitSlop={6} onPress={removeCover}>
                <Ionicons name="close" size={20} color={colors.gray[100]} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbRow}
            >
              {photos.map((uri, i) => (
                <Pressable key={`${uri}-${i}`} onPress={() => setCover(i)}>
                  <Image
                    source={{ uri }}
                    style={[styles.thumb, i === cover && styles.thumbSelected]}
                  />
                </Pressable>
              ))}
              <Pressable style={styles.addThumb} onPress={pickPhotos}>
                <Ionicons name="add" size={22} color={colors.icon.accent} />
              </Pressable>
            </ScrollView>

            <View style={styles.captionBox}>
              <TextInput
                style={styles.captionInput}
                value={caption}
                onChangeText={setCaption}
                placeholder={t('drops.captionPlaceholder')}
                placeholderTextColor={colors.gray[700]}
                multiline
              />
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.cta, !canPublish && styles.ctaDisabled]}
          disabled={!canPublish}
          onPress={() => canPublish && onSubmit(photos, caption.trim())}
        >
          <Text style={[styles.ctaText, !canPublish && styles.ctaTextDisabled]}>
            {t('drops.publish')}
          </Text>
        </Pressable>
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[6], gap: spacing[4] },
  emptyTile: {
    height: 427,
    backgroundColor: colors.gray[100],
    borderRadius: radius['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[8],
  },
  plusCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[700],
  },
  preview: { borderRadius: radius.md, overflow: 'hidden' },
  previewImage: {
    width: '100%',
    height: 427,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  removeBtn: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.red[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRow: { gap: spacing[2] },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  thumbSelected: { borderWidth: 2, borderColor: colors.blue[500] },
  addThumb: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionBox: {
    backgroundColor: colors.gray[100],
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    minHeight: 60,
  },
  captionInput: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[1300],
    padding: 0,
  },
  bottomBar: { paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[6] },
  cta: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { backgroundColor: colors.surface.subtle },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
  ctaTextDisabled: { color: colors.gray[700] },
});
