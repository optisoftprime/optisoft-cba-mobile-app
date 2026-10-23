import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Clipboard,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { printReceiptPdf } from 'utils/receiptPdf';
import {
  RECEIPT_LAYOUT,
  buildReceiptHTML,
  formatAmountNaira,
  formatFullDate,
  safeString,
} from './receiptTemplate';
import { BrandLogo } from 'components/ui/brand-logo';
import { brand } from 'config/brand';

// ─── Helpers (UI-only, unrelated to PDF design) ─────────────────────────────

// Status colours come from the active palette so they follow light/dark.
function getStatusColor(status, colors) {
  const s = status?.toLowerCase();
  if (s === 'successful' || s === 'success' || s === 'approved') return colors.success;
  if (s === 'failed' || s === 'declined' || s === 'rejected') return colors.danger;
  return colors.warning;
}

function getStatusBg(status, colors) {
  const s = status?.toLowerCase();
  if (s === 'successful' || s === 'success' || s === 'approved') return colors.successSoft;
  if (s === 'failed' || s === 'declined' || s === 'rejected') return colors.dangerSoft;
  return colors.warningSoft;
}

function getStatusIcon(status) {
  const s = status?.toLowerCase();
  if (s === 'successful' || s === 'success' || s === 'approved') return 'checkmark-circle';
  if (s === 'failed' || s === 'declined' || s === 'rejected') return 'close-circle';
  return 'time';
}

function amountToWords(amount) {
  if (!amount) return '';
  const num = Number(amount);
  if (isNaN(num) || num === 0) return '';
  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  function convertHundreds(n) {
    if (n >= 100) return ones[Math.floor(n / 100)] + ' Hundred ' + convertHundreds(n % 100);
    if (n >= 20) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[n];
  }
  function convert(n) {
    if (n >= 1000000) return convert(Math.floor(n / 1000000)) + ' Million ' + convert(n % 1000000);
    if (n >= 1000) return convert(Math.floor(n / 1000)) + ' Thousand ' + convert(n % 1000);
    if (n >= 100) return convertHundreds(n);
    return convertHundreds(n);
  }
  const intPart = Math.floor(num);
  const result = convert(intPart).trim();
  return result ? result + ' Naira Only' : '';
}

// ─── Scalloped (ticket) edge ────────────────────────────────────────────────
// A row of small circles, colored like the outer background, that "bite"
// into the card to create the postage-stamp / ticket edge look.

function ScallopEdge({ position, bgColor, cardColor, size = 20 }) {
  const count = 12;
  const circles = Array.from({ length: count });
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        [position]: -size / 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: -size / 2,
      }}>
      {circles.map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
          }}
        />
      ))}
    </View>
  );
}

// ─── Detail Row ──────────────────────────────────────────────────────────────

function DetailRow({ label, value, subValue, copyable, onCopy, isLast, colors }) {
  const display = safeString(value);
  if (display === '—') return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.line,
      }}>
      <Text style={{ fontSize: 13.5, color: colors.inkMuted, flex: 1, marginTop: 1 }}>{label}</Text>
      <TouchableOpacity
        activeOpacity={copyable ? 0.6 : 1}
        onPress={copyable ? onCopy : undefined}
        style={{ flex: 1.5, alignItems: 'flex-end' }}>
        <Text
          style={{ fontSize: 14, fontWeight: '700', color: colors.ink, textAlign: 'right' }}
          numberOfLines={2}>
          {display}
        </Text>
        {!!subValue && (
          <Text
            style={{ fontSize: 12, color: colors.inkMuted, marginTop: 2, textAlign: 'right' }}
            numberOfLines={1}>
            {subValue}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function ReceiptRow({ label, value, colors }) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="flex-1 text-sm" style={{ color: colors.inkMuted }}>
        {label}
      </Text>
      <Text className="flex-1 text-right text-sm font-semibold" style={{ color: colors.primary }}>
        {value}
      </Text>
    </View>
  );
}
// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function TransactionDetailModal({ visible, onClose, transaction: tx }) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const BRAND = colors.primary;
  const BRAND_DARK = colors.secondary;
  const [generating, setGenerating] = React.useState(false);
  if (!tx) return null;

  const isDeposit = tx?.transactionType === 'Deposit';

  const statusColor = getStatusColor(tx?.status, colors);
  const statusBg = getStatusBg(tx?.status, colors);
  const statusIcon = getStatusIcon(tx?.status);
  const statusLabel = tx?.status === 'Approved' ? 'Successful' : safeString(tx?.status);
  const txDate = formatFullDate(tx?.transactionDate || tx?.paymentDate);
  const words = amountToWords(tx?.amount);

  // NOTE: the API sends the recipient's name as `recipient` (not `recipientName`).
  // `recipientName` is kept as a fallback in case some endpoints use that key instead.
  const recipient = {
    name: isDeposit ? tx?.customerName : (tx?.recipient ?? tx?.recipientName),
    account: isDeposit ? tx?.accountNumber : tx?.recipientAccountNumber,
    bank: brand.appName,
    // bank: isDeposit
    //     ? (tx?.bankName || tx?.branch)
    //     : (tx?.recipientBankName || tx?.bankName || tx?.channel || tx?.branch),
  };
  const sender = {
    name: isDeposit ? (tx?.recipient ?? tx?.recipientName) : tx?.customerName,
    account: isDeposit ? tx?.recipientAccountNumber : tx?.accountNumber,
    bank: brand.appName,
    // bank: isDeposit ? (tx?.channel || tx?.bankName) : (tx?.branch || brand.appName),
  };

  function maskAccount(acc) {
    const s = safeString(acc);
    if (s === '—' || s.length < 4) return s;
    return `${s.slice(0, 3)}****${s.slice(-3)}`;
  }

  function copy(label, value) {
    Clipboard.setString(String(value));
    Toast.show({
      type: 'success',
      text1: t('components.details.copied'),
      text2: t('components.details.copiedMessage', { label }),
    });
  }

  async function handleGenerateReceipt() {
    try {
      setGenerating(true);

      const html = buildReceiptHTML({
        brandName: brand.appName,
        brandSubtitle: `Powered by ${brand.poweredBy}`,
        amount: tx?.amount,
        status: statusLabel,
        date: txDate,
        recipient,
        sender: { ...sender, masked: true },
        transactionId: tx?.transactionId || tx?.id,
        sessionId: tx?.reference || tx?.transactionRef,
        fee: tx?.fee,
      });

      const { uri } = await printReceiptPdf(html, RECEIPT_LAYOUT);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Transaction Receipt',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(t('components.details.receiptReady'), 'Saved to: ' + uri);
      }
    } catch (err) {
      Alert.alert(t('components.details.error'), t('components.details.receiptError'));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <StatusBar barStyle={isDark ? 'dark-content' : 'light-content'} />
      <View style={{ flex: 1, backgroundColor: BRAND }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}
          showsVerticalScrollIndicator={false}>
          {/* ── Ticket Card ── */}
          <View style={{ marginHorizontal: 20 }}>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 24,
                paddingTop: 28,
                paddingBottom: 20,
                paddingHorizontal: 20,
                overflow: 'hidden',
              }}>
              <ScallopEdge position="top" bgColor={BRAND} cardColor={colors.card} />
              <ScallopEdge position="bottom" bgColor={BRAND} cardColor={colors.card} />

              {/* Logo — using the transparent-background crop so it sits cleanly
                                in the circle. Adjust the require() path to wherever this
                                lives in your assets folder. */}
              <View style={{ position: 'absolute', top: 20, right: 20 }}>
                <View
                  style={{
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: colors.primaryLight,
                    paddingHorizontal: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <BrandLogo size={22} />
                </View>
              </View>

              {/* ── Hero ── */}
              <View style={{ alignItems: 'center', paddingBottom: 18 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: statusBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}>
                  <Ionicons name={statusIcon} size={36} color={statusColor} />
                </View>

                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '800',
                    color: colors.ink,
                    letterSpacing: -0.5,
                  }}>
                  {formatAmountNaira(tx?.amount)}
                </Text>

                <Text style={{ fontSize: 15, fontWeight: '700', color: statusColor, marginTop: 8 }}>
                  {statusLabel}
                </Text>

                <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>{txDate}</Text>

                {!!words && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.inkMuted,
                      marginTop: 4,
                      textAlign: 'center',
                    }}>
                    {words}
                  </Text>
                )}
              </View>

              {/* ── Dashed divider ── */}
              <View
                style={{
                  borderStyle: 'dashed',
                  borderTopWidth: 1.5,
                  borderColor: colors.line,
                  marginBottom: 6,
                }}
              />

              {/* ── Transaction Details ── */}
              {/* ── Details ── */}
              <View>
                {/* <DetailRow label="Transaction Type" value={tx?.transactionType} /> */}
                <DetailRow
                  label={t('components.details.recipient')}
                  value={recipient.name}
                  subValue={[brand.appName, maskAccount(recipient.account)]
                    .filter((v) => v && v !== '—')
                    .join(' | ')}
                  colors={colors}
                />
                <DetailRow
                  label={t('components.details.sender')}
                  value={sender.name}
                  subValue={[brand.appName, maskAccount(sender.account)]
                    .filter((v) => v && v !== '—')
                    .join(' | ')}
                  colors={colors}
                />
                {!!tx?.description && (
                  <DetailRow
                    label={t('components.details.narration')}
                    value={tx.description}
                    colors={colors}
                  />
                )}
                <DetailRow
                  label={t('components.details.referenceId')}
                  value={tx?.transactionId || tx?.id}
                  copyable
                  onCopy={() =>
                    copy(t('components.details.referenceId'), tx?.transactionId || tx?.id)
                  }
                  isLast={!tx?.fee}
                  colors={colors}
                />
                {tx?.fee != null && (
                  <DetailRow
                    label={t('components.details.fee')}
                    value={formatAmountNaira(tx.fee)}
                    isLast
                    colors={colors}
                  />
                )}
              </View>

              {/* ── Secure badge ── */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.primaryLight,
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 16,
                }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}>
                  <Ionicons name="shield-checkmark" size={18} color={BRAND} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>
                    {t('components.details.secure')}
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.inkMuted, marginTop: 1 }}>
                    {t('components.details.secureSubtitle')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Actions ── */}
          <View style={{ paddingHorizontal: 20, marginTop: 24, gap: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.card,
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
              }}>
              <Text style={{ color: BRAND, fontWeight: '700', fontSize: 15 }}>
                {t('components.details.done')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleGenerateReceipt}
              activeOpacity={0.85}
              disabled={generating}
              style={{
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                borderWidth: 1.5,
                borderColor: colors.onPrimary,
                backgroundColor: generating ? BRAND_DARK : 'transparent',
              }}>
              {generating ? (
                <>
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                  <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 15 }}>
                    {t('components.details.generating')}
                  </Text>
                </>
              ) : (
                <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 15 }}>
                  {t('components.details.shareReceipt')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Toast />
      </View>
    </Modal>
  );
}
