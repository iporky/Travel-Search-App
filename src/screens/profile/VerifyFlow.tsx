import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, radius, spacing } from '../../theme/tokens';
import { FilterSelectSheet } from '../../components/history/FilterChips';
import { DarkButton, P } from '../../components/profile/ProfileUI';
import { KeyboardStickyView } from '../../components/KeyboardStickyView';

// Figma: screen-1-phone (10978:93560), screen-2-email (10978:93596),
// OTP (10978:93626), screen-3-success (10978:93678).
// Steps: contact input (1 of 4) → 6-digit OTP (2 of 4) → success (4 of 4).
// No verification backend yet — codes are accepted after basic validation.

type Props = {
  mode: 'phone' | 'email';
  onCancel: () => void;
  onComplete: (mode: 'phone' | 'email', value: string) => void;
};

type Step = 'input' | 'otp' | 'success';

const COUNTRY_CODES = [
  { value: '+82', label: '🇰🇷 +82' },
  { value: '+1', label: '🇺🇸 +1' },
  { value: '+44', label: '🇬🇧 +44' },
  { value: '+81', label: '🇯🇵 +81' },
  { value: '+86', label: '🇨🇳 +86' },
  { value: '+91', label: '🇮🇳 +91' },
  { value: '+84', label: '🇻🇳 +84' },
  { value: '+66', label: '🇹🇭 +66' },
];

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export function VerifyFlow({ mode, onCancel, onComplete }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('input');
  const [countryCode, setCountryCode] = useState('+82');
  const [codePickerOpen, setCodePickerOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const otpInputRef = useRef<TextInput>(null);

  const contactValue = mode === 'phone' ? `${countryCode} ${phone.trim()}` : email.trim();
  const inputValid =
    mode === 'phone'
      ? phone.replace(/\D/g, '').length >= 7
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Countdown for the resend timer while on the OTP step.
  useEffect(() => {
    if (step !== 'otp' || secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step, secondsLeft]);

  const startOtp = () => {
    setOtp('');
    setOtpError(false);
    setSecondsLeft(RESEND_SECONDS);
    setStep('otp');
  };

  const verifyOtp = (value: string) => {
    if (value.length < OTP_LENGTH) {
      setOtpError(true);
      return;
    }
    setStep('success');
  };

  const handleOtpChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    setOtpError(false);
    // Auto-submit once all six digits are in (annotation: auto-submit).
    if (digits.length === OTP_LENGTH) verifyOtp(digits);
  };

  const back = () => {
    if (step === 'otp') setStep('input');
    else onCancel();
  };

  const timerLabel = `00:${String(secondsLeft).padStart(2, '0')}`;

  if (step === 'success') {
    return (
      <View style={styles.screen}>
        <View style={styles.topRow}>
          <View style={{ width: 40 }} />
          <View style={styles.stepChip}>
            <Text style={styles.stepText}>{t('verify.step', { n: 4 })}</Text>
          </View>
        </View>
        <View style={styles.successBody}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={44} color={P.dark} />
          </View>
          <Text style={styles.successTitle}>{t('verify.completeTitle')}</Text>
          <Text style={styles.successText}>{t('verify.completeBody')}</Text>
        </View>
        <View style={styles.bottomArea}>
          <DarkButton
            label={t('verify.continueToProfile')}
            onPress={() => onComplete(mode, contactValue)}
          />
        </View>
      </View>
    );
  }

  if (step === 'otp') {
    return (
      <KeyboardStickyView style={styles.screen}>
        <View style={styles.topRow}>
          <Pressable style={styles.backSquare} hitSlop={8} onPress={back}>
            <Ionicons name="arrow-back" size={20} color={P.textDark} />
          </Pressable>
          <View style={styles.stepChip}>
            <Text style={styles.stepText}>{t('verify.step', { n: 2 })}</Text>
          </View>
        </View>

        <Text style={styles.h1}>{t('verify.otpTitle')}</Text>
        <Text style={styles.sub}>{t('verify.otpBody')}</Text>

        {/* Six visual boxes over one hidden input → focus/paste/auto-submit. */}
        <Pressable style={styles.otpRow} onPress={() => otpInputRef.current?.focus()}>
          {Array.from({ length: OTP_LENGTH }).map((_, i) => {
            const char = otp[i];
            const isActive = i === otp.length;
            return (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  isActive && styles.otpBoxActive,
                  otpError && styles.otpBoxError,
                ]}
              >
                <Text style={styles.otpChar}>{char ?? '–'}</Text>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={otpInputRef}
          style={styles.hiddenInput}
          value={otp}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoFocus
        />
        <Text style={styles.otpHint}>{t('verify.otpHint')}</Text>
        {otpError && <Text style={styles.otpErrorText}>{t('verify.otpInvalid')}</Text>}

        <View style={styles.timerRow}>
          <Ionicons name="time-outline" size={16} color={P.textMuted} />
          <Text style={styles.timerText}>
            {t('verify.remaining', { time: timerLabel })}
          </Text>
        </View>
        <View style={styles.resendRow}>
          <Text style={styles.resendMuted}>{t('verify.didntReceive')} </Text>
          <Pressable disabled={secondsLeft > 0} onPress={startOtp} hitSlop={6}>
            <Text style={[styles.resendLink, secondsLeft > 0 && { opacity: 0.4 }]}>
              {t('verify.resend')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.bottomArea}>
          <DarkButton label={t('verify.verify')} onPress={() => verifyOtp(otp)} />
          <View style={styles.secureRow}>
            <Ionicons name="lock-closed-outline" size={12} color={P.textFaint} />
            <Text style={styles.secureText}>{t('verify.secure')}</Text>
          </View>
        </View>
      </KeyboardStickyView>
    );
  }

  // step === 'input'
  return (
    <KeyboardStickyView style={styles.screen}>
      <View style={styles.topRow}>
        <Pressable hitSlop={10} onPress={back}>
          <Ionicons name="arrow-back" size={22} color={P.textDark} />
        </Pressable>
        <Text style={styles.stepPlain}>{t('verify.step', { n: 1 })}</Text>
      </View>

      {mode === 'phone' ? (
        <>
          <Text style={styles.h1}>{t('verify.phoneTitle')}</Text>
          <Text style={styles.sub}>{t('verify.phoneBody')}</Text>
          <View style={styles.phoneRow}>
            <Pressable style={styles.codeBox} onPress={() => setCodePickerOpen(true)}>
              <Text style={styles.codeText}>{countryCode}</Text>
              <Ionicons name="chevron-down" size={14} color={P.textMuted} />
            </Pressable>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 000-0000"
              placeholderTextColor={P.textFaint}
              keyboardType="phone-pad"
              autoFocus
            />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.h1}>{t('verify.emailTitle')}</Text>
          <Text style={styles.sub}>{t('verify.emailBody')}</Text>
          <Text style={styles.fieldLabel}>{t('verify.emailLabel')}</Text>
          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={P.textFaint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
        </>
      )}

      <View style={styles.bottomArea}>
        <DarkButton
          label={mode === 'phone' ? t('verify.sendCode') : t('verify.sendVerification')}
          onPress={startOtp}
          disabled={!inputValid}
        />
        <Text style={styles.footNote}>
          {mode === 'phone' ? t('verify.smsRates') : t('verify.checkSpam')}
        </Text>
      </View>

      <FilterSelectSheet
        visible={codePickerOpen}
        title={t('verify.countryCode')}
        options={COUNTRY_CODES}
        selected={countryCode}
        onClose={() => setCodePickerOpen(false)}
        onSelect={(v) => {
          if (v) setCountryCode(v);
          setCodePickerOpen(false);
        }}
      />
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.gray[100], paddingHorizontal: spacing[6] },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing[4],
    paddingBottom: spacing[6],
  },
  backSquare: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: P.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepChip: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
  },
  stepText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    color: P.textMuted,
  },
  stepPlain: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    color: P.textMuted,
  },
  h1: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 22,
    lineHeight: 28,
    color: P.textDark,
    marginBottom: spacing[2],
  },
  sub: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: P.textMuted,
    marginBottom: spacing[6],
  },
  phoneRow: { flexDirection: 'row', gap: spacing[3] },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: spacing[3],
    borderWidth: 1,
    borderColor: colors.gray[600],
    borderRadius: radius.sm,
  },
  codeText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 15,
    color: P.textDark,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: colors.gray[600],
    borderRadius: radius.sm,
    paddingHorizontal: spacing[4],
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    color: P.textDark,
  },
  fieldLabel: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 12,
    color: P.textDark,
    marginBottom: spacing[2],
  },
  emailInput: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.gray[600],
    borderRadius: radius.sm,
    paddingHorizontal: spacing[4],
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    color: P.textDark,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.9,
    maxWidth: 56,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: radius.sm,
    backgroundColor: P.well,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: P.dark,
    borderWidth: 2,
    backgroundColor: colors.gray[100],
  },
  otpBoxError: { borderColor: '#ef4444' },
  otpChar: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    color: P.textDark,
  },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  otpHint: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 12,
    color: P.textMuted,
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  otpErrorText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing[2],
  },
  timerText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    color: P.textMuted,
  },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  resendMuted: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 13,
    color: P.textFaint,
  },
  resendLink: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 13,
    color: P.textDark,
    textDecorationLine: 'underline',
  },
  bottomArea: { marginTop: 'auto', paddingBottom: spacing[6], gap: spacing[3] },
  footNote: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 12,
    color: P.textMuted,
    textAlign: 'center',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  secureText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 11,
    color: P.textFaint,
  },
  successBody: { flex: 1, alignItems: 'center', paddingTop: 80, gap: spacing[4] },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: P.dark,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  successTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 20,
    color: P.textDark,
  },
  successText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: P.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
});
