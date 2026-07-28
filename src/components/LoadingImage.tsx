import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/tokens';

type Props = {
  source: ImageSourcePropType;
  /** Sizing + radius live on the wrapper so the image can clip to it. */
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /** Hide the spinner on small tiles (avatars) where it would crowd the frame. */
  showSpinner?: boolean;
};

/** Spinner only appears past this delay, so cached images don't flash one. */
const SPINNER_DELAY_MS = 180;

/**
 * Image with a placeholder, a delayed spinner for slow networks, a fade-in on
 * load, and a graceful broken-image state. Buzz feeds pull remote photos, so a
 * bare <Image> leaves empty rectangles while they download.
 */
export function LoadingImage({
  source,
  style,
  imageStyle,
  resizeMode = 'cover',
  showSpinner = true,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [spinnerVisible, setSpinnerVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loaded || failed || !showSpinner) return;
    const id = setTimeout(() => setSpinnerVisible(true), SPINNER_DELAY_MS);
    return () => clearTimeout(id);
  }, [loaded, failed, showSpinner]);

  const handleLoad = () => {
    setLoaded(true);
    setSpinnerVisible(false);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={[styles.wrap, style]}>
      {!loaded && !failed && spinnerVisible && (
        <ActivityIndicator size="small" color={colors.blue[300]} style={styles.centered} />
      )}

      {failed && (
        <View style={styles.centered}>
          <Ionicons name="image-outline" size={20} color={colors.icon.disabled} />
        </View>
      )}

      {!failed && (
        <Animated.Image
          source={source}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={() => {
            setFailed(true);
            setSpinnerVisible(false);
          }}
          style={[StyleSheet.absoluteFill, { opacity }, imageStyle]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Placeholder tint shows through until the image fades in.
  wrap: { backgroundColor: colors.gray[400], overflow: 'hidden' },
  centered: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
