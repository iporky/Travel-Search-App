import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/tokens';
import { useAuth } from '../../context/AuthContext';
import { TopBar } from '../../components/profile/ProfileUI';
import { ReceiptFile, uploadReceipt, validateReceiptFile } from '../../api/receipts';
import { track } from '../../api/tracking';
import {
  CASHBACK_CONFIRMATION_SOURCE,
  CASHBACK_DETAIL_SOURCE,
  CASHBACK_UPLOAD_ICON_SVG,
} from '../../assets/cashback';

// Taxi-cashback ("Ride & Shop") flow — Figma "Banner popup" section
// (12393:85037), opened from the Home banner card:
//   Detail (How it works + Claim Cashback) → Upload (native document picker,
//   JPG/PNG/PDF ≤ 10 MB, 1 file) → [uploading] → Choose a Voucher → Email
//   (account / custom) → success dialog → back to Home.
// APIs and tracking mirror the website's TaxiCashbackModal: the receipt POSTs
// to /receipts/ with category "taxi" (+ platform & device_id per the mobile
// contract), receipt_upload is tracked only after a successful upload, and the
// voucher/email choices stay client-side (web parity — no API behind them).
// Error dialogs per the annotations: upload failure → Cancel stays / Try Again
// re-uploads the same file; invalid custom email → Cancel keeps the text /
// Try Again refocuses the field.

const VOUCHERS = ['GS25', 'Olive Young', 'Starbucks'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'detail' | 'upload' | 'voucher' | 'email';
type ErrorDialog = 'upload' | 'email' | null;

type Props = { onClose: () => void };

export function CashbackFlowScreen({ onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('detail');
  const [file, setFile] = useState<ReceiptFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [voucher, setVoucher] = useState<string | null>(null);
  const [emailChoice, setEmailChoice] = useState<'account' | 'other' | null>(null);
  const [otherEmail, setOtherEmail] = useState('');
  const [errorDialog, setErrorDialog] = useState<ErrorDialog>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const emailInputRef = useRef<TextInput>(null);

  const goBack = () => {
    if (step === 'detail') onClose();
    else if (step === 'upload') setStep('detail');
    else if (step === 'voucher') setStep('upload');
    else setStep('voucher');
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (successOpen || errorDialog) return true; // dialogs own the back key
      goBack();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, successOpen, errorDialog]);

  // ── Upload step ────────────────────────────────────────────────────────────
  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      const asset = res.canceled ? null : res.assets?.[0];
      if (!asset) return;
      const candidate: ReceiptFile = {
        uri: asset.uri,
        name: asset.name ?? 'receipt',
        mimeType: asset.mimeType ?? null,
        size: asset.size ?? null,
      };
      if (validateReceiptFile(candidate)) {
        setFile(null);
        setErrorDialog('upload');
        return;
      }
      setFile(candidate);
    } catch (e) {
      console.warn('[cashback] picker failed', (e as Error)?.message ?? e);
    }
  };

  const submitReceipt = async () => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      await uploadReceipt(file, { category: 'taxi' });
      // Web parity: logged after the upload succeeds, not on the click.
      track.receiptUpload();
      setStep('voucher');
    } catch (e) {
      console.warn('[cashback] upload failed', (e as Error)?.message ?? e);
      setErrorDialog('upload');
    } finally {
      setUploading(false);
    }
  };

  // ── Email step ─────────────────────────────────────────────────────────────
  const accountEmail = user?.email || '';
  const emailNextEnabled =
    emailChoice === 'account' || (emailChoice === 'other' && otherEmail.trim().length > 0);

  const submitEmail = () => {
    if (emailChoice === 'other' && !EMAIL_RE.test(otherEmail.trim())) {
      setErrorDialog('email');
      return;
    }
    setSuccessOpen(true);
  };

  // ── Shared pieces ──────────────────────────────────────────────────────────
  const cta = (label: string, opts: { disabled?: boolean; caption?: string; onPress: () => void }) => (
    <View style={styles.bottomBar}>
      {opts.caption ? <Text style={styles.ctaCaption}>{opts.caption}</Text> : null}
      <Pressable
        style={({ pressed }) => [
          styles.ctaBtn,
          opts.disabled && styles.ctaBtnDisabled,
          pressed && !opts.disabled && styles.ctaBtnPressed,
        ]}
        onPress={opts.onPress}
        disabled={opts.disabled}
      >
        <Text style={[styles.ctaText, opts.disabled && styles.ctaTextDisabled]}>{label}</Text>
      </Pressable>
    </View>
  );

  const selectionRow = (opts: {
    key: string;
    selected: boolean;
    onPress: () => void;
    children: React.ReactNode;
  }) => (
    <Pressable
      key={opts.key}
      style={[styles.row, opts.selected && styles.rowSelected]}
      onPress={opts.onPress}
    >
      {opts.children}
    </Pressable>
  );

  // ── Steps ──────────────────────────────────────────────────────────────────
  const detailStep = (
    <>
      <TopBar title="" onBack={goBack} />
      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{t('cashback.rideShop')}</Text>
          <Text style={styles.detailSubtitle}>{t('cashback.subtitle')}</Text>
        </View>
        <Image source={CASHBACK_DETAIL_SOURCE} style={styles.detailImage} resizeMode="contain" />
        <View style={styles.stepsBlock}>
          <Text style={styles.stepsHeading}>{t('cashback.howItWorks')}</Text>
          <View style={styles.stepsList}>
            {[1, 2, 3].map((n) => (
              <View key={n} style={styles.stepRow}>
                <View style={styles.stepBullet}>
                  <Text style={styles.stepBulletText}>{n}</Text>
                </View>
                <View style={styles.stepTexts}>
                  <Text style={styles.stepTitle}>{t(`cashback.step${n}Title`)}</Text>
                  <Text style={styles.stepDesc}>{t(`cashback.step${n}Desc`)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      {cta(t('cashback.claimCta'), {
        caption: t('cashback.limitCaption'),
        onPress: () => setStep('upload'),
      })}
    </>
  );

  const uploadStep = (
    <>
      <TopBar title={t('cashback.uploadTitle')} onBack={goBack} />
      {uploading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.blue[500]} />
          <Text style={styles.loadingText}>{t('cashback.uploading')}</Text>
        </View>
      ) : (
        <View style={styles.uploadWrap}>
          <Pressable style={styles.uploadCard} onPress={pickFile}>
            <SvgXml xml={CASHBACK_UPLOAD_ICON_SVG} width={60} height={60} />
            <View style={styles.uploadTexts}>
              {file ? (
                <>
                  <Text style={styles.uploadTitleText} numberOfLines={1}>
                    {file.name}
                  </Text>
                  <Text style={styles.uploadHintText}>{t('cashback.tapToChange')}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.uploadTitleText}>{t('cashback.uploadHere')}</Text>
                  <Text style={styles.uploadHintText}>{t('cashback.uploadHint')}</Text>
                </>
              )}
            </View>
          </Pressable>
        </View>
      )}
      {!uploading &&
        cta(t('cashback.submit'), {
          caption: t('cashback.limitCaption'),
          disabled: !file,
          onPress: submitReceipt,
        })}
    </>
  );

  const voucherStep = (
    <>
      <TopBar title={t('cashback.voucherTitle')} onBack={goBack} />
      <ScrollView contentContainerStyle={styles.optionsContent} showsVerticalScrollIndicator={false}>
        {VOUCHERS.map((v) =>
          selectionRow({
            key: v,
            selected: voucher === v,
            onPress: () => setVoucher(v),
            children: (
              <View style={styles.rowLine}>
                <Text style={styles.rowLabel}>{v}</Text>
                {voucher === v && (
                  <MaterialIcons name="check-circle" size={24} color={colors.blue[500]} />
                )}
              </View>
            ),
          }),
        )}
      </ScrollView>
      {cta(t('cashback.next'), { disabled: !voucher, onPress: () => setStep('email') })}
    </>
  );

  const emailStep = (
    <>
      <TopBar title={t('cashback.emailTitle')} onBack={goBack} />
      <ScrollView
        contentContainerStyle={styles.optionsContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {selectionRow({
          key: 'account',
          selected: emailChoice === 'account',
          onPress: () => setEmailChoice('account'),
          children: (
            <View style={styles.rowColumn}>
              <View style={styles.rowLine}>
                <Text style={styles.rowLabel}>{t('cashback.sendMyEmail')}</Text>
                {emailChoice === 'account' && (
                  <MaterialIcons name="check-circle" size={24} color={colors.blue[500]} />
                )}
              </View>
              {!!accountEmail && <Text style={styles.rowSub}>{accountEmail}</Text>}
            </View>
          ),
        })}
        {selectionRow({
          key: 'other',
          selected: emailChoice === 'other',
          onPress: () => {
            setEmailChoice('other');
            requestAnimationFrame(() => emailInputRef.current?.focus());
          },
          children: (
            <View style={styles.rowColumn}>
              <View style={styles.rowLine}>
                <Text style={styles.rowLabel}>{t('cashback.sendOther')}</Text>
                {emailChoice === 'other' && (
                  <MaterialIcons name="check-circle" size={24} color={colors.blue[500]} />
                )}
              </View>
              {emailChoice === 'other' && (
                <View style={styles.emailInputBox}>
                  <TextInput
                    ref={emailInputRef}
                    style={styles.emailInput}
                    value={otherEmail}
                    onChangeText={setOtherEmail}
                    placeholder={t('cashback.emailPlaceholder')}
                    placeholderTextColor={colors.gray[900]}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
            </View>
          ),
        })}
      </ScrollView>
      {cta(t('cashback.next'), { disabled: !emailNextEnabled, onPress: submitEmail })}
    </>
  );

  return (
    // Full-screen Modal — the design (Banner_Detail 12393:85071) is a whole
    // page: no tab bar, CTA at the true screen bottom. Rendering inline inside
    // Home's content area both showed the tab bar and double-counted the top
    // inset (the shell already applies it), pushing everything down.
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={goBack}>
      <View style={styles.root}>
        <View style={[StyleSheet.absoluteFill, styles.flatBg]} />
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {step === 'detail' && detailStep}
        {step === 'upload' && uploadStep}
        {step === 'voucher' && voucherStep}
        {step === 'email' && emailStep}
      </SafeAreaView>

      {/* Error dialogs (upload failure / invalid email). */}
      <Modal visible={errorDialog != null} transparent animationType="fade" onRequestClose={() => setErrorDialog(null)}>
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <Text style={styles.dialogTitle}>
              {errorDialog === 'email' ? t('cashback.invalidEmailTitle') : t('cashback.uploadErrorTitle')}
            </Text>
            <Text style={styles.dialogBody}>
              {errorDialog === 'email' ? t('cashback.invalidEmailBody') : t('cashback.uploadErrorBody')}
            </Text>
            <View style={styles.dialogButtons}>
              <Pressable style={styles.dialogCancel} onPress={() => setErrorDialog(null)}>
                <Text style={styles.dialogCancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={styles.dialogDanger}
                onPress={() => {
                  const which = errorDialog;
                  setErrorDialog(null);
                  if (which === 'upload') {
                    // Retry the previously selected file, else re-open the picker.
                    if (file) submitReceipt();
                    else pickFile();
                  } else {
                    requestAnimationFrame(() => emailInputRef.current?.focus());
                  }
                }}
              >
                <Text style={styles.dialogDangerText}>{t('cashback.tryAgain')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success dialog — Confirm closes the whole flow back to Home. */}
      <Modal visible={successOpen} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.scrim}>
          <View style={styles.dialog}>
            <Text style={[styles.dialogTitle, styles.dialogTitleCenter]}>{t('cashback.successTitle')}</Text>
            <Text style={[styles.dialogBody, styles.dialogBodyCenter]}>{t('cashback.successBody')}</Text>
            <Image source={CASHBACK_CONFIRMATION_SOURCE} style={styles.successImage} resizeMode="contain" />
            <Pressable
              style={[styles.ctaBtn, styles.dialogConfirm]}
              onPress={() => {
                setSuccessOpen(false);
                onClose();
              }}
            >
              <Text style={styles.ctaText}>{t('cashback.confirm')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Flat #ecf4fe — same single surface as the rest of the signed-in shell.
  flatBg: { backgroundColor: '#ecf4fe' },
  safe: { flex: 1 },

  // ── Detail ──
  detailContent: { paddingBottom: 24 },
  detailHeader: { paddingHorizontal: 20, gap: 6, marginTop: 8 },
  detailTitle: {
    fontFamily: 'NationalPark_700Bold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: colors.gray[1300],
  },
  detailSubtitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  detailImage: { width: '100%', height: 250, marginTop: 24 },
  stepsBlock: { paddingHorizontal: 20, marginTop: 36, gap: 16 },
  stepsHeading: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    color: colors.text.primary,
  },
  stepsList: { gap: 12 },
  stepRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  stepBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d8ecfb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBulletText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    color: '#145dd3',
    letterSpacing: -0.16,
  },
  stepTexts: { flex: 1, gap: 1 },
  stepTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  stepDesc: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.text.primary,
  },

  // ── Upload ──
  uploadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  uploadCard: {
    width: '100%',
    maxWidth: 336,
    height: 249,
    borderRadius: 28,
    backgroundColor: colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 24,
  },
  uploadTexts: { alignItems: 'center', gap: 2, alignSelf: 'stretch' },
  uploadTitleText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1000],
    textAlign: 'center',
  },
  uploadHintText: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.14,
    color: colors.gray[1000],
    textAlign: 'center',
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1000],
  },

  // ── Selection rows (voucher / email) ──
  optionsContent: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  row: {
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 16,
    minHeight: 64,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  rowSelected: { backgroundColor: colors.blue[100], borderColor: colors.blue[500] },
  rowLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowColumn: { gap: 4 },
  rowLabel: {
    flex: 1,
    fontFamily: 'NationalPark_500Medium',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1300],
  },
  rowSub: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.gray[1000],
  },
  emailInputBox: {
    marginTop: 8,
    backgroundColor: colors.surface.card,
    borderRadius: 12,
    paddingHorizontal: 20,
    height: 52,
    justifyContent: 'center',
  },
  emailInput: {
    padding: 0,
    fontFamily: 'NationalPark_400Regular',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1300],
  },

  // ── Bottom CTA ──
  bottomBar: { paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  ctaCaption: {
    fontFamily: 'NationalPark_500Medium',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.14,
    color: colors.gray[1000],
    textAlign: 'center',
  },
  ctaBtn: {
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.blue[500],
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  ctaBtnPressed: { backgroundColor: colors.blue[600] },
  ctaBtnDisabled: { backgroundColor: colors.blue[100] },
  ctaText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
  ctaTextDisabled: { color: colors.gray[800] },

  // ── Dialogs ──
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(29, 25, 43, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 38,
  },
  dialog: {
    width: 300,
    borderRadius: 24,
    backgroundColor: colors.surface.card,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 10,
  },
  dialogTitle: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: '#000000',
  },
  dialogTitleCenter: { textAlign: 'center' },
  dialogBody: {
    fontFamily: 'NationalPark_400Regular',
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.16,
    color: colors.text.primary,
  },
  dialogBodyCenter: { textAlign: 'center' },
  dialogButtons: { flexDirection: 'row', gap: 8, marginTop: 6 },
  dialogCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#eaf4ff',
    alignItems: 'center',
  },
  dialogCancelText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.gray[1000],
  },
  dialogDanger: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#e62d3c',
    alignItems: 'center',
  },
  dialogDangerText: {
    fontFamily: 'NationalPark_600SemiBold',
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.16,
    color: colors.surface.default,
  },
  dialogConfirm: { marginTop: 6 },
  successImage: { width: 166, height: 124, alignSelf: 'center' },
});
