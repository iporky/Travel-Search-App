import React, { forwardRef, useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { PlusIcon, MicrophoneIcon, PaperAirplaneIcon } from 'react-native-heroicons/solid';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius, shadows, spacing, typography } from '../theme/tokens';

type Props = {
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  onSubmit?: () => void;
  onPlusPress?: () => void;
  onMicPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  multiline?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
};

export const SearchBar = forwardRef<TextInput, Props>(function SearchBar(
  {
    value,
    placeholder = 'Type a message',
    onChangeText,
    onSubmit,
    onPlusPress,
    onMicPress,
    onFocus,
    onBlur,
    multiline,
    autoFocus,
    disabled,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasText = !!value && value.length > 0;

  return (
    <View
      style={[
        styles.wrapper,
        focused ? styles.focused : styles.default,
        disabled && styles.disabled,
        multiline && styles.multiline,
      ]}
    >
      <Pressable
        onPress={onPlusPress}
        style={[styles.iconButton, styles.leftButton]}
        hitSlop={8}
        disabled={disabled}
      >
        <PlusIcon size={20} color={disabled ? colors.icon.disabled : colors.icon.secondary} />
      </Pressable>

      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        style={[typography.body16Regular, styles.input, multiline && styles.inputMultiline]}
        returnKeyType="send"
        multiline={multiline}
        autoFocus={autoFocus}
        editable={!disabled}
      />

      {hasText ? (
        <Pressable onPress={onSubmit} hitSlop={8} style={styles.iconButton}>
          <LinearGradient
            colors={gradients.surfaceAccentGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sendGradient}
          >
            <PaperAirplaneIcon
              size={16}
              color={colors.text.onDark}
              style={{ transform: [{ rotate: '-45deg' }] }}
            />
          </LinearGradient>
        </Pressable>
      ) : (
        <Pressable onPress={onMicPress} style={styles.iconButton} hitSlop={8} disabled={disabled}>
          <MicrophoneIcon size={20} color={disabled ? colors.icon.disabled : colors.icon.accent} />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    gap: spacing[1],
    minHeight: 56,
  },
  default: { ...shadows.inputDefault },
  focused: {
    ...shadows.inputDefault,
    borderWidth: 1,
    borderColor: colors.blue[300],
  },
  disabled: {
    backgroundColor: colors.surface.soft,
    shadowOpacity: 0,
    elevation: 0,
  },
  multiline: { borderRadius: radius['2xl'], alignItems: 'flex-end', paddingVertical: spacing[2] },
  input: {
    flex: 1,
    color: colors.text.primary,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
  },
  inputMultiline: { maxHeight: 120, paddingTop: spacing[3] },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftButton: { backgroundColor: colors.surface.soft },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
