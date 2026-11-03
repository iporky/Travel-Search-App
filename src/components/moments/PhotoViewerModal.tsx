import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { AnimatedModal } from '../AnimatedModal';

type Props = {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
};

// Figma: "Moments_PhotoViewer" (node 11452:71398) — full-screen lightbox with a
// large photo (heart overlay top-right) and a thumbnail carousel; the selected
// thumbnail gets a 2px accent border, the rest are dimmed 50%.
export function PhotoViewerModal({ visible, photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [liked, setLiked] = useState(false);

  // Re-sync when the viewer is opened on a different thumbnail.
  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  if (!photos.length) return null;
  const current = photos[Math.min(index, photos.length - 1)];

  return (
    <AnimatedModal visible={visible} onRequestClose={onClose} variant="fade" scrimColor="rgba(0,0,0,0.75)">
        <View style={styles.container}>
          <View style={styles.photoWrap}>
            <Image
              source={{ uri: current.replace(/\/300\/300$/, '/672/504') }}
              style={styles.photo}
            />
            <Pressable style={styles.heartBtn} hitSlop={6} onPress={() => setLiked((v) => !v)}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={22}
                color={liked ? colors.red[100] : colors.gray[1000]}
              />
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbRow}
          >
            {photos.map((uri, i) => (
              <Pressable key={uri} onPress={() => setIndex(i)}>
                <View style={[styles.thumbWrap, i === index && styles.thumbSelected]}>
                  <Image source={{ uri }} style={styles.thumb} />
                  {i !== index && <View style={styles.thumbDim} />}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
    </AnimatedModal>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing[5], gap: spacing[3] },
  photoWrap: { borderRadius: radius.md, overflow: 'hidden' },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.md,
    backgroundColor: colors.gray[1300],
  },
  heartBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRow: { gap: spacing[2], flexGrow: 1, justifyContent: 'center' },
  thumbWrap: { borderRadius: radius.md, overflow: 'hidden' },
  thumbSelected: {
    borderWidth: 2,
    borderColor: colors.blue[500],
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.gray[400],
  },
  thumbDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.gray[1400],
    opacity: 0.5,
    borderRadius: radius.md,
  },
});
