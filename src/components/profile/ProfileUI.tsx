import React from 'react';
import { StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../theme/tokens';
import { PressableScale } from '../PressableScale';

// Shared building blocks for the Profile suite — Figma "Profile for Aug
// release" (section 12276:93796). Google (Material) icons throughout, as the
// design annotations name them ("Google Icon: Edit / Check / Setting / …").

/** Section title — Heading/20/Bold, content-strong. */
export function SectionTitle({ children, style }: { children: string; style?: ViewStyle }) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

/** White card (#fefefe, radius 16, px 20 / py 12). */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** 2px #ebf3ff @ 70% divider between card rows. */
export function CardDivider() {
  return <View style={styles.divider} />;
}

type InfoRowProps = {
  /** Uppercase caption — "NAME", "BIRTHDAY", … */
  label: string;
  /** Current value; empty → placeholder. */
  value?: string | null;
  placeholder?: string;
  /** Edit mode: render a TextInput in place (same typography, no box). */
  editable?: boolean;
  multiline?: boolean;
  onChangeText?: (v: string) => void;
  /** Tap handler for the whole row (e.g. open the date picker). */
  onPress?: () => void;
  /** Trailing 24px Google icon (e.g. calendar_today). */
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightIconPress?: () => void;
  /** Whether the row is the last in its card (no divider below). */
  last?: boolean;
};

/**
 * Figma "row-*": 13/SemiBold uppercase label (content-subtle), 4px gap, then
 * the value — 16/Medium content-primary when set, 13/Medium muted placeholder
 * when empty. A trailing icon sits at the row's right edge.
 */
export function InfoRow({
  label,
  value,
  placeholder,
  editable,
  multiline,
  onChangeText,
  onPress,
  rightIcon,
  onRightIconPress,
  last,
}: InfoRowProps) {
  const hasValue = !!(value && value.trim());
  const body = editable ? (
    <TextInput
      style={[styles.rowValue, styles.rowInput, multiline && styles.rowInputMultiline]}
      value={value ?? ''}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.gray[700]}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      autoCorrect={false}
      underlineColorAndroid="transparent"
    />
  ) : (
    <Text style={hasValue ? styles.rowValue : styles.rowPlaceholder}>
      {hasValue ? value : placeholder}
    </Text>
  );
  const content = (
    <View style={[styles.row, rightIcon ? styles.rowWithIcon : null]}>
      <Text style={styles.rowLabel}>{label.toUpperCase()}</Text>
      {body}
      {rightIcon && (
        <PressableScale style={styles.rowIcon} hitSlop={8} onPress={onRightIconPress ?? onPress} disabled={!onRightIconPress && !onPress}>
          <MaterialIcons name={rightIcon} size={24} color={colors.gray[900]} />
        </PressableScale>
      )}
    </View>
  );
  return (
    <>
      {onPress && !editable ? <PressableScale onPress={onPress}>{content}</PressableScale> : content}
      {!last && <CardDivider />}
    </>
  );
}

/** Plain value row without a caption (the "Personalized" bio card). */
export function TextCard({ children }: { children: string }) {
  return (
    <Card>
      <Text style={styles.rowValueStrong}>{children}</Text>
    </Card>
  );
}

/** 44×44 icon button (header Edit / Check / Settings). */
export function IconButton({
  icon,
  onPress,
  color = colors.gray[1300],
  disabled,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      style={styles.iconBtn}
      hitSlop={6}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={icon}
    >
      <MaterialIcons name={icon} size={24} color={disabled ? colors.gray[600] : color} />
    </PressableScale>
  );
}

/**
 * Sub-screen top bar (Figma Onboarding/Navigation/TopBar): 44px back chevron,
 * centred 20/SemiBold title, optional right slot.
 */
export function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.topBar}>
      <PressableScale style={styles.iconBtn} hitSlop={8} onPress={onBack}>
        <MaterialIcons name="chevron-left" size={28} color={colors.gray[1300]} />
      </PressableScale>
      <Text style={styles.topBarTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.topBarRight}>{right}</View>
    </View>
  );
}

/**
 * Settings row (Figma Onboarding/Selection/Row): #fefefe, radius 12, 64 tall,
 * px 12, 24px Google icon + 16/Medium label, optional right value (16/Medium
 * content-tertiary).
 */
export function SettingsRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <PressableScale
      style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
      onPress={onPress}
      disabled={!onPress}
    >
      <MaterialIcons name={icon} size={24} color={colors.gray[1300]} />
      <Text style={styles.settingsLabel} numberOfLines={1}>
        {label}
      </Text>
      {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
    </PressableScale>
  );
}

/** Form field — 14/SemiBold tertiary label + white input (radius 12, px 20 / py 16). */
export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
  footer,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  /** Optional row rendered inside the field box below the input (e.g. attach icon). */
  footer?: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={[styles.fieldBox, multiline && styles.fieldBoxMultiline]}>
        <TextInput
          style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray[700]}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? (keyboardType === 'email-address' ? 'none' : 'sentences')}
          autoCorrect={keyboardType !== 'email-address'}
          underlineColorAndroid="transparent"
        />
        {footer}
      </View>
    </View>
  );
}

/** Bottom CTA (Figma Onboarding/Action/BottomCTA): accent pill, 56 tall, radius 20. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <PressableScale
      style={({ pressed }) => [
        styles.primaryBtn,
        (disabled || loading) && styles.primaryBtnDisabled,
        pressed && !disabled && styles.primaryBtnPressed,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  card: {
    backgroundColor: colors.surface.card,
    borderRadius: 16,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    width: '100%',
  },
  divider: { height: 2, backgroundColor: colors.surface.line, opacity: 0.7, marginVertical: spacing[2] },
  row: { gap: 4, position: 'relative' },
  rowWithIcon: { paddingRight: 36 },
  rowLabel: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[1000],
  },
  rowValue: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.text.primary,
  },
  rowValueStrong: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: '#111827',
  },
  rowPlaceholder: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.13,
    color: colors.gray[700],
  },
  rowInput: { padding: 0, margin: 0, minHeight: 24 },
  rowInputMultiline: { minHeight: 48 },
  rowIcon: {
    position: 'absolute',
    right: 0,
    top: 8,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing[1],
    paddingRight: spacing[1],
    paddingVertical: spacing[1],
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.gray[1300],
  },
  topBarRight: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    height: 64,
    paddingHorizontal: spacing[3],
    borderRadius: 12,
    backgroundColor: colors.surface.card,
  },
  settingsRowPressed: { backgroundColor: colors.surface.soft },
  settingsLabel: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  settingsValue: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[900],
  },
  field: { gap: spacing[2] },
  fieldLabel: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[900],
  },
  fieldBox: {
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  fieldBoxMultiline: { minHeight: 96 },
  fieldInput: {
    padding: 0,
    margin: 0,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },
  fieldInputMultiline: { minHeight: 64 },
  primaryBtn: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
  },
  primaryBtnPressed: { backgroundColor: colors.blue[600] },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
});
