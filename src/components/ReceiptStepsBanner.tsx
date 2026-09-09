import React from 'react';
import {
  DimensionValue,
  Dimensions,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CASHBACK_STEP1_SOURCE,
  CASHBACK_STEP2_SOURCE,
  CASHBACK_STEP3_SOURCE,
} from '../assets/cashback';

const { width: W } = Dimensions.get('window');
const DESIGN_W = 375;
const sx = (n: number) => (n * W) / DESIGN_W;

/**
 * Home "how cashback works" banner — Sep 1 round (Figma 12915:85188).
 *
 * Three numbered step cards over a "Get started →" link, replacing the single
 * flat Banner_M artwork. Tapping anywhere opens the receipt-cashback flow.
 *
 * Per the designer's implementation note on the image frames: the 120×79 frame
 * is the same on every row, but each illustration has its own size and offset
 * inside it *on purpose*. So each step carries its own width/height/offset and
 * the images are never normalised or stretched to fill the frame.
 */

type Step = {
  key: 'taxi' | 'receipt' | 'cashback';
  source: ImageSourcePropType;
  /** Rendered size inside the 120×79 frame (design px). */
  w: number;
  h: number;
  /** Offset from the frame's centre (design px). */
  dx: number;
  dy: number;
  /**
   * Step 2's artwork is cropped by its frame rather than fitted: the source is
   * drawn oversized and clipped, which is how it sits in Figma.
   */
  crop?: { width: DimensionValue; height: DimensionValue; left: DimensionValue; top: DimensionValue };
};

const STEPS: readonly Step[] = [
  { key: 'taxi', source: CASHBACK_STEP1_SOURCE, w: 115, h: 77, dx: -0.62, dy: 1.09 },
  {
    key: 'receipt',
    source: CASHBACK_STEP2_SOURCE,
    w: 117,
    h: 71,
    dx: 2.38,
    dy: 3.43,
    crop: { width: '131.93%', height: '161.25%', left: '-17.52%', top: '-20.65%' },
  },
  { key: 'cashback', source: CASHBACK_STEP3_SOURCE, w: 116, h: 77, dx: -2.12, dy: 1.76 },
];

/** Design height: three 111 cards, two 6 gaps, the 6 gap and the 21 CTA line. */
const DESIGN_H = 111 * 3 + 6 * 2 + 6 + 21;

export function ReceiptStepsBanner({
  onPress,
  availableHeight,
}: {
  onPress: () => void;
  /**
   * Height this banner may occupy. Home never scrolls, so when the space is
   * shorter than the design the whole block is scaled down uniformly — that
   * keeps every Figma proportion intact rather than squeezing rows or type.
   */
  availableHeight?: number;
}) {
  const { t } = useTranslation();
  const natural = sx(DESIGN_H);
  const scale =
    availableHeight && availableHeight > 0 ? Math.min(1, availableHeight / natural) : 1;

  return (
    <Pressable
      style={({ pressed }) => [styles.root, { transform: [{ scale }] }, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('home.receiptSteps.cta')}
    >
      {STEPS.map((step, i) => (
        <View key={step.key} style={[styles.card, i > 0 && styles.cardGap]}>
          <View style={styles.imageFrame}>
            <View
              style={{
                position: 'absolute',
                width: sx(step.w),
                height: sx(step.h),
                left: (sx(120) - sx(step.w)) / 2 + sx(step.dx),
                top: (sx(79) - sx(step.h)) / 2 + sx(step.dy),
                overflow: step.crop ? 'hidden' : 'visible',
              }}
            >
              <Image
                source={step.source}
                style={step.crop ? { position: 'absolute', ...step.crop } : styles.stepImage}
                resizeMode={step.crop ? 'stretch' : 'cover'}
              />
            </View>
          </View>

          <Text style={styles.label}>{t(`home.receiptSteps.${step.key}`)}</Text>

          {/* Numbered badge, pinned to the card's top-left corner. */}
          <View style={styles.badge}>
            <Text style={styles.badgeNumber}>{i + 1}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.cta}>{t('home.receiptSteps.cta')} →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 338 wide inside the 375 design frame, right-aligned CTA under the stack.
  root: { alignSelf: 'center', width: sx(338), alignItems: 'flex-end', gap: sx(6) },
  pressed: { opacity: 0.9 },
  card: {
    width: '100%',
    height: sx(111),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sx(48),
    paddingLeft: sx(28),
    paddingRight: sx(12),
    backgroundColor: '#f6f9ff',
    borderWidth: 1,
    borderColor: '#c9e3ff',
    borderRadius: sx(4),
  },
  cardGap: { marginTop: sx(6) },
  imageFrame: { width: sx(120), height: sx(79) },
  stepImage: { width: '100%', height: '100%' },
  label: {
    width: sx(90),
    fontFamily: 'NationalPark_500Medium',
    fontSize: sx(16),
    lineHeight: sx(24),
    color: '#332d41',
    letterSpacing: -0.16,
  },
  badge: {
    position: 'absolute',
    left: sx(11),
    top: sx(9),
    width: sx(20),
    height: sx(20),
    borderRadius: sx(10),
    backgroundColor: '#d8ecfb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumber: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(13),
    lineHeight: sx(16),
    color: '#527dff',
    letterSpacing: -0.13,
  },
  cta: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: sx(16),
    lineHeight: sx(21),
    color: '#527dff',
    letterSpacing: -0.16,
  },
});
