// screens/WalletToWalletTransfer.jsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardController,
  AndroidSoftInputModes,
} from 'react-native-keyboard-controller';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import TextInputComponent from 'components/textInputs';
import TransactionPinModal from 'components/transactionPinModal';
import { RecipientSuggestion } from './RecipientSuggestion.jsx';
import { VerifiedRecipientCard, ValidationErrorCard } from './RecipientResultCards.jsx';
import { useWalletTransfer } from './useWalletTransfer';
// import { makeInternalTransfer } from 'api/payment';
import { makeInternalTransfer } from 'api/transfer';

import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import {
  RECEIPT_LAYOUT,
  buildReceiptHTML,
  formatAmountNaira,
} from '../../../components/transferReceiptTemplate.js';
import { printReceiptPdf } from 'utils/receiptPdf';
import { HeroBanner } from 'components/ui/photo-card';

const PIN_LENGTH = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripCommas(value) {
  return String(value ?? '').replace(/,/g, '');
}

function getNow() {
  const now = new Date();
  return (
    now.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) +
    ', ' +
    now.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  );
}

// ─── Share Format Picker Modal ────────────────────────────────────────────────

function ShareFormatModal({ visible, onClose, onSelectPDF, onSelectImage, isGenerating }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.heroOverlay,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 32,
        }}>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            padding: 24,
            width: '100%',
          }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.textPrimary,
              textAlign: 'center',
              marginBottom: 6,
            }}>
            {t('transfer.shareReceiptAs')}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              textAlign: 'center',
              marginBottom: 24,
            }}>
            {t('transfer.shareFormatSubtitle')}
          </Text>

          {/* PDF option */}
          <TouchableOpacity
            onPress={onSelectPDF}
            disabled={isGenerating}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 14,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: colors.line,
            }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: colors.dangerSoft,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}>
              <Ionicons name="document-text-outline" size={20} color={colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}>
                {t('transfer.pdfDocument')}
              </Text>
            </View>
            {isGenerating === 'pdf' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, fontWeight: '500' }}>
              {t('transfer.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value, highlight, isLast }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border,
      }}>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: highlight ? colors.primary : colors.textPrimary,
          maxWidth: '60%',
          textAlign: 'right',
        }}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

// ─── Success Modal ────────────────────────────────────────────────────────────

function TransferSuccessModal({ visible, onDone, data, senderName, receiptRef }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [shareFormatVisible, setShareFormatVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // 'pdf' | 'image' | false

  if (!data) return null;

  const { amount, destinationAccountName, destinationAccountNumber, transactionId } = data;

  const handleSharePDF = async () => {
    try {
      setIsGenerating('pdf');
      const html = buildReceiptHTML({
        amount,
        destinationAccountName,
        destinationAccountNumber,
        transactionId,
        senderName,
      });
      const { uri } = await printReceiptPdf(html, RECEIPT_LAYOUT);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        setShareFormatVisible(false);
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('transfer.shareReceiptDialog'),
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(t('transfer.savedTitle'), t('transfer.receiptSavedTo', { value: uri }));
      }
    } catch (err) {
      Alert.alert(t('transfer.errorTitle'), t('transfer.pdfGenerationError'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareImage = async () => {
    try {
      setIsGenerating('image');
      // Generate as PDF but save with .png-friendly name so it previews inline
      // on WhatsApp and other apps that render PDFs as images in chat
      const html = buildReceiptHTML({
        amount,
        destinationAccountName,
        destinationAccountNumber,
        transactionId,
        senderName,
      });

      const { uri } = await printReceiptPdf(html, RECEIPT_LAYOUT);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        setShareFormatVisible(false);
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('transfer.shareReceiptDialog'),
        });
      }
    } catch (err) {
      Alert.alert(t('transfer.errorTitle'), t('transfer.imageGenerationError'));
    } finally {
      setIsGenerating(false);
    }
  };
  return (
    <>
      <Modal
        visible={true}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onDone}>
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: colors.heroOverlay,
          }}>
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 24,
              paddingTop: 16,
              paddingBottom: 40,
            }}>
            {/* Drag handle */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View
                style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line }}
              />
            </View>

            {/* Capturable receipt card — this is what gets screenshotted for image share */}
            <View
              ref={receiptRef}
              collapsable={false}
              style={{ backgroundColor: colors.cardBackground }}>
              {/* Success icon */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 24,
                    backgroundColor: colors.successSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}>
                  <Ionicons name="checkmark" size={36} color={colors.success} />
                </View>

                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: '800',
                    color: colors.textPrimary,
                    marginBottom: 10,
                    letterSpacing: -0.5,
                  }}>
                  {t('transfer.sentTitle')}
                </Text>

                <Text
                  style={{
                    fontSize: 16,
                    color: colors.textSecondary,
                    textAlign: 'center',
                    lineHeight: 24,
                  }}>
                  <Text style={{ fontWeight: '700' }}>{formatAmountNaira(amount)}</Text>{' '}
                  {t('transfer.onItsWayTo')}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginTop: 2,
                    textAlign: 'center',
                  }}>
                  {destinationAccountName ?? '—'}
                </Text>
              </View>

              {/* Details card */}
              <View
                style={{
                  backgroundColor: colors.cardMuted,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                  marginBottom: 16,
                }}>
                {senderName && <DetailRow label={t('transfer.from')} value={senderName} />}
                <DetailRow label={t('transfer.to')} value={destinationAccountName} />
                <DetailRow label={t('transfer.accountNumber')} value={destinationAccountNumber} />
                <DetailRow
                  label={t('transfer.amount')}
                  value={formatAmountNaira(amount)}
                  highlight
                />
                <DetailRow label={t('transfer.transactionId')} value={transactionId} isLast />
              </View>

              {/* Timestamp */}
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  textAlign: 'center',
                  marginBottom: 16,
                }}>
                {getNow()}
              </Text>
            </View>

            {/* Done button */}
            <TouchableOpacity
              onPress={onDone}
              activeOpacity={0.8}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
              }}>
              <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: '700' }}>
                {t('transfer.done')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Format picker */}
      <ShareFormatModal
        visible={shareFormatVisible}
        onClose={() => setShareFormatVisible(false)}
        onSelectPDF={handleSharePDF}
        // onSelectImage={handleShareImage}
        isGenerating={isGenerating}
      />
    </>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WalletToWalletTransfer({ senderName }) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const receiptRef = React.useRef(null);

  // Only THIS screen switches Android to adjustResize so the KeyboardAwareScrollView
  // can lift the recipient input and keep the suggestions dropdown above the
  // keyboard. The app default stays `pan`; restore it on blur so no other screen
  // is affected.
  useFocusEffect(
    useCallback(() => {
      KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_RESIZE);
      return () => KeyboardController.setDefaultMode();
    }, [])
  );

  // PIN state — previously owned internally by EnterPINModal, now lifted up
  // so we can drive the shared TransactionPinModal (keypad + auto-submit).
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const {
    walletNumber,
    amount,
    narration,
    setNarration,
    validatedAccount,
    validating,
    validationError,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    pinModalVisible,
    setPinModalVisible,
    submitting,
    selectedAccount,
    setSelectedAccount,
    setSubmitting,
    queryClient,
    handleSelectAccount,
    handleClearSelectedAccount,
    handleWalletNumberChange,
    handleSelectSuggestion,
    handleAmountChange,
    handleContinue,
  } = useWalletTransfer();

  // The account currently being shown to the user for confirmation —
  // either a directly validated single account, or one picked from a
  // multi-account lookup result.
  const displayAccount =
    selectedAccount || (!Array.isArray(validatedAccount) ? validatedAccount : null);

  const handlePinConfirm = async (pinValue) => {
    setSubmitting(true);
    console.log(walletNumber, 'walletNumber');
    try {
      const response = await makeInternalTransfer(
        {},
        {
          destinationAccountNumber: walletNumber,
          amount: parseFloat(stripCommas(amount)),
          description: narration,
          transactionPin: pinValue,
        }
      );

      if (response?.ok) {
        setPinModalVisible(false);
        setPin('');
        setPinError('');
        setSuccessData(response?.data?.data ?? response?.data ?? {});
        setSuccessModalVisible(true);
        queryClient?.invalidateQueries({ queryKey: ['dashboard'] });
      } else {
        setPin('');
        setPinError(response?.message ?? t('transfer.transferFailedRetry'));
        Toast.show({
          type: 'error',
          text1: t('transfer.transferFailedTitle'),
          text2: response?.message ?? t('transfer.somethingWentWrong'),
        });
      }
    } catch (error) {
      setPin('');
      setPinError(error?.message ?? t('transfer.somethingWentWrongRetry'));
      Toast.show({
        type: 'error',
        text1: t('transfer.errorOccurred'),
        text2: error?.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Keypad ────────────────────────────────────────────────────────────────
  const handleKeyPress = (key) => {
    if (submitting) return;
    if (key === 'backspace') {
      setPinError('');
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const nextPin = pin + key;
    setPinError('');
    setPin(nextPin);
    if (nextPin.length === PIN_LENGTH) {
      handlePinConfirm(nextPin);
    }
  };

  const closePinModal = () => {
    if (submitting) return;
    setPinModalVisible(false);
    setPin('');
    setPinError('');
  };

  const handleSuccessDone = () => {
    setSuccessModalVisible(false);
    setSuccessData(null);
    navigateBack();
  };

  console.log('validatedAccount:', suggestions, walletNumber);
  return (
    <View className="flex-1 bg-background">
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Keep this much space between the focused input and the keyboard so the
        // "Recent recipients" dropdown (which hangs ~250px below the input) stays
        // visible above the keyboard instead of being covered by it.
        bottomOffset={280}>
        <Header
          title={t('transfer.walletToWalletTitle')}
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.textPrimary}
          leftIconColor={colors.textPrimary}
        />

        {/* Hero banner — drawn from the brand colours (components/ui/photo-card). */}
        <HeroBanner
          icon="swap-horizontal-outline"
          title={t('transfer.walletToWalletTitle')}
          subtitle={t('transfer.walletToWalletDescription')}
        />

        <View className="flex-1 px-4 pt-5">
          {/* Section heading + link to full transaction history */}
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[17px] font-bold text-ink">{t('transfer.sendMoney')}</Text>
            <TouchableOpacity
              onPress={() => navigateTo('allTransactions')}
              className="flex-row items-center rounded-full bg-primary-light px-3 py-1.5"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="time-outline" size={14} color={colors.primaryDark} />
              <Text className="mx-1 text-xs font-semibold text-primary-dark">
                {t('transfer.transactionHistory')}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>

          {/* Info banner above the recipient input */}
          <View className="mb-4 flex-row items-start rounded-2xl bg-info-soft p-3">
            <Ionicons name="information-circle" size={18} color={colors.info} />
            <Text className="ml-2 flex-1 text-xs text-on-info-soft" style={{ lineHeight: 16 }}>
              {t('transfer.walletInfoBanner')}
            </Text>
          </View>

          {/* ── Wallet input + floating suggestions ── */}
          <View style={{ zIndex: 10 }}>
            <TextInputComponent
              label={t('transfer.recipientLabel')}
              value={walletNumber}
              onChangeText={handleWalletNumberChange}
              onFocus={() => setShowSuggestions(true)}
              placeholder={t('transfer.recipientPlaceholder')}
              keyboardType="number-pad"
              maxLength={10}
              isLoading={validating}
              containerStyle={{ marginBottom: 0 }}
            />

            {showSuggestions && !validatedAccount && !validationError && suggestions.length > 0 && (
              <View
                className="overflow-hidden rounded-2xl border border-line bg-card"
                style={[
                  { position: 'absolute', top: 78, left: 0, right: 0, zIndex: 999, elevation: 8 },
                  shadows.md,
                ]}>
                <View className="flex-row items-center border-b border-line bg-card-muted px-4 py-2.5">
                  <Ionicons name="time-outline" size={14} color={colors.inkMuted} />
                  <Text className="ml-1.5 text-xs font-medium text-ink-muted">
                    {t('transfer.recentRecipients')}
                  </Text>
                </View>
                <ScrollView
                  scrollEnabled
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 250 }}>
                  {suggestions.map((tx) => (
                    <RecipientSuggestion
                      key={tx.recipientAccountNumber}
                      tx={tx}
                      onPress={handleSelectSuggestion}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <View style={{ marginBottom: 16 }} />

          {/* ── Multiple accounts returned (phone number lookup) ── */}
          {Array.isArray(validatedAccount) && validatedAccount.length > 1 && !selectedAccount && (
            <View style={{ marginBottom: 20 }}>
              <View className="mb-2.5 flex-row items-center">
                <View className="mr-2 h-5 w-5 items-center justify-center rounded-full bg-primary-light">
                  <Ionicons name="information" size={12} color={colors.primary} />
                </View>
                <Text className="text-[13px] font-semibold text-primary">
                  {t('transfer.multipleAccountsFound')}
                </Text>
              </View>

              {validatedAccount.map((acct, index) => (
                <TouchableOpacity
                  key={acct.accountNumber ?? index}
                  onPress={() => handleSelectAccount(acct)}
                  activeOpacity={0.7}
                  className="mb-2 flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5">
                  {/* Initial avatar */}
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-light">
                    <Text className="text-[15px] font-semibold text-primary-dark">
                      {acct.accountName?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  </View>

                  {/* Account info */}
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
                      {acct.accountName}
                    </Text>
                    <Text className="mt-0.5 text-xs text-ink-muted">{acct.accountNumber}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* ── Single validated account (account number entered directly) ── */}
          {!Array.isArray(validatedAccount) && validatedAccount && (
            <VerifiedRecipientCard account={validatedAccount} />
          )}

          {/* ── Selected account from multi-account list ── */}
          {selectedAccount && (
            <VerifiedRecipientCard
              account={selectedAccount}
              onChange={() => handleClearSelectedAccount()}
            />
          )}

          {/* ── Validation error ── */}
          {validationError ? <ValidationErrorCard message={validationError} /> : null}

          <TextInputComponent
            label={t('transfer.amount')}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="₦0.00"
            keyboardType="decimal-pad"
            containerStyle={{ marginBottom: 16 }}
          />

          <TextInputComponent
            label={t('transfer.narration')}
            value={narration}
            onChangeText={setNarration}
            placeholder={t('transfer.narrationPlaceholder')}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            inputStyle={{ minHeight: 100 }}
            containerStyle={{ marginBottom: 24 }}
          />
        </View>

        <View className="px-4 pb-6">
          <TouchBtn
            onPress={handleContinue}
            label={t('transfer.continue')}
            textClassName="text-base font-semibold"
            buttonClassName="items-center rounded-xl py-4"
            activeOpacity={0.8}
            containerClassName=""
          />
        </View>
      </KeyboardAwareScrollView>

      <TransactionPinModal
        visible={pinModalVisible}
        onClose={closePinModal}
        pin={pin}
        pinError={pinError}
        isSubmitting={submitting}
        onKeyPress={handleKeyPress}
        pinLength={PIN_LENGTH}
        title={t('transfer.confirmTransferTitle')}
        promptText={t('transfer.pinPrompt')}
        processingText={t('transfer.processingTransfer')}
        summary={{
          icon: () => (
            <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 16 }}>
              {displayAccount?.accountName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          ),
          iconBackgroundColor: colors.primary,
          title: displayAccount?.accountName || t('transfer.recipient'),
          subtitle: displayAccount?.accountNumber || walletNumber,
          amountLabel: `₦${amount || '0.00'}`,
        }}
      />

      <TransferSuccessModal
        visible={successModalVisible}
        onDone={handleSuccessDone}
        data={successData}
        senderName={senderName}
        receiptRef={receiptRef}
      />
    </View>
  );
}
