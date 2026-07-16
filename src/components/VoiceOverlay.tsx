import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SvgXml } from 'react-native-svg';
import { XMarkIcon } from 'react-native-heroicons/solid';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { onboardingSource } from '../assets/onboardingAssets';

const VOICE_BIRD = onboardingSource(
  require('../../assets/voice/bird.png') as ImageSourcePropType,
  'voice_processing_bird',
);
const MIC_SELECTED_SVG = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.8346 8.16952V12.8362C19.8346 16.0578 17.2229 18.6695 14.0013 18.6695C10.7796 18.6695 8.16797 16.0578 8.16797 12.8362V8.16952C8.16797 4.94786 10.7796 2.33618 14.0013 2.33618C17.2229 2.33618 19.8346 4.94786 19.8346 8.16952Z" fill="#527DFF" stroke="#527DFF" stroke-width="1.75" stroke-linecap="round"/><path d="M23.3346 12.8362C23.3346 17.9909 19.156 22.1695 14.0013 22.1695M14.0013 22.1695C8.84664 22.1695 4.66797 17.9909 4.66797 12.8362M14.0013 22.1695V25.6695M14.0013 25.6695H17.5013M14.0013 25.6695H10.5013" stroke="#527DFF" stroke-width="2" stroke-linecap="round"/></svg>`;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Live partial transcript from speech recognition. */
  transcript?: string;
  /** Whether the recognizer is actively listening. */
  listening?: boolean;
};

export function VoiceOverlay({ visible, onClose, transcript, listening = true }: Props) {
  const { t } = useTranslation();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);

  const micScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const outerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const middleScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const outerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.32, 0.2] });
  const middleOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.34] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <LinearGradient
        colors={['#E3F1FF', '#2F52EC', '#5446FB']}
        locations={[0, 0.85, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(17, 26, 96, 0.24)']}
        start={{ x: 0, y: 0.45 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.container}>
        <View style={styles.headerWrap}>
          <Text style={[typography.heading35Semibold, styles.title]}>
            {listening ? t('voice.listening') : t('voice.processing')}
          </Text>
        </View>

        <View style={styles.middle}>
          <Image source={VOICE_BIRD} style={styles.bird} resizeMode="contain" />
          {transcript ? (
            <Text style={styles.transcript} numberOfLines={4}>
              {transcript}
            </Text>
          ) : null}
        </View>

        <View style={styles.row}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <XMarkIcon size={22} color={colors.text.onDark} />
          </Pressable>

          <View style={styles.micWrap}>
            <Animated.View
              style={[styles.ringOuter, { opacity: outerOpacity, transform: [{ scale: outerScale }] }]}
            />
            <Animated.View
              style={[styles.ringMiddle, { opacity: middleOpacity, transform: [{ scale: middleScale }] }]}
            />
            <LinearGradient
              colors={['#FFFFFF', '#D9D6FF']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.ringInner}
            />
            <Animated.View style={[styles.mic, { transform: [{ scale: micScale }] }]}>
              <SvgXml xml={MIC_SELECTED_SVG} width={26} height={26} />
            </Animated.View>
          </View>

          <View style={{ width: 48 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[12],
    paddingTop: spacing[16],
  },
  headerWrap: {
    marginTop: spacing[12],
    alignItems: 'center',
    zIndex: 5,
    elevation: 5,
  },
  title: {
    color: colors.text.primary,
    textAlign: 'center',
    fontSize: 35,
    letterSpacing: -1.4,
    lineHeight: 44,
    fontWeight: "600",
    fontFamily: "National Park",
    overflow: "hidden"
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[5],
    zIndex: 6,
    elevation: 6,
  },
  bird: {
    width: 188,
    height: 188,
    zIndex: 7,
    elevation: 7,
  },
  transcript: {
    color: colors.text.onDark,
    opacity: 0.9,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    marginTop: spacing[6],
    paddingHorizontal: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micWrap: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mic: {
    width: 70,
    height: 70,
    borderRadius: radius.full,
    backgroundColor: '#f9fbfc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  ringOuter: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: radius.full,
    backgroundColor: '#527DFF',
  },
  ringMiddle: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: radius.full,
    backgroundColor: '#F2F9FF',
  },
  ringInner: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: radius.full,
  },
});
