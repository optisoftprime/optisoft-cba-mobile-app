import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

import { useTheme } from 'config/ThemeContext';

const HIDDEN = '••••••••';

/**
 * The wallet on the home screen: a solid brand card with two soft circles in
 * the corner for depth, carrying the balance (hideable), the account number
 * (tap to copy) and the KYC tier with its upgrade action.
 *
 * Props:
 *   balance         — the formatted balance string
 *   accountNumber   — shown in a copy pill once it is known
 *   accountTier     — e.g. "Tier 1 Account"
 *   upgradeLabel    — the upgrade CTA's label; null hides it (top tier)
 *   upgradePending  — a request is awaiting review: show a muted, non-pressable
 *                     chip instead of the CTA so it can't be requested twice
 *   onUpgradePress  — the CTA's action
 */
export function WalletPanel({
  balance,
  accountNumber,
  accountTier,
  upgradeLabel = null,
  upgradePending = false,
  onUpgradePress,
  className = '',
}) {
  const { t } = useTranslation();
  const { colors, shadows } = useTheme();
  const [visible, setVisible] = useState(true);
  const hasAccountNumber = Boolean(accountNumber);

  const copyAccountNumber = async () => {
    if (!hasAccountNumber) return;
    await Clipboard.setStringAsync(String(accountNumber));
    Toast.show({
      type: 'success',
      text1: t('components.wallet.copied'),
      text2: t('components.wallet.copiedMessage'),
    });
  };

  return (
    <View className={`overflow-hidden rounded-3xl bg-primary ${className}`} style={shadows.md}>
      {/* Decorative circles — depth without a second colour. */}
      <View className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-on-primary/10" />
      <View className="absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-on-primary/5" />

      <View className="px-5 pb-5 pt-5">
        <View className="flex-row items-center justify-between gap-3">
          <View className="shrink flex-row items-center gap-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-on-primary/15">
              <Ionicons name="wallet-outline" size={15} color={colors.onPrimary} />
            </View>
            <Text className="shrink text-[13px] font-medium text-on-primary/85" numberOfLines={1}>
              {t('components.wallet.availableBalance')}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? t('dashboard.hideBalance') : t('dashboard.showBalance')}
            hitSlop={10}
            onPress={() => setVisible((v) => !v)}
            className="h-8 w-8 items-center justify-center rounded-full bg-on-primary/15">
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={16}
              color={colors.onPrimary}
            />
          </Pressable>
        </View>

        {/* The headline figure shrinks to fit rather than overflow: a large
            balance must stay whole and on one line. */}
        <Text
          className="mt-3 text-[32px] font-extrabold text-on-primary"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}>
          {visible ? balance : HIDDEN}
        </Text>

        {/* Account number gets a row of its own. It used to share one with the
            upgrade pill, and on a normal-width phone the two collided. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.copyAccountNumber')}
          disabled={!hasAccountNumber}
          onPress={copyAccountNumber}
          hitSlop={6}
          className="mt-3 self-start">
          <Text className="text-[11px] text-on-primary/75">
            {t('components.wallet.accountNumber')}
          </Text>
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <Text
              className="text-[15px] font-semibold tracking-wide text-on-primary"
              numberOfLines={1}>
              {accountNumber || '—'}
            </Text>
            {hasAccountNumber ? (
              <Ionicons name="copy-outline" size={14} color={colors.onPrimary} />
            ) : null}
          </View>
        </Pressable>

        {/* Tier on the left, its upgrade action on the right — under a hairline
            so the two rows read as separate. */}
        <View className="mt-4 flex-row items-center justify-between gap-3 border-t border-on-primary/15 pt-3">
          <Text className="shrink text-[12px] font-medium text-on-primary/85" numberOfLines={1}>
            {accountTier}
          </Text>

          {upgradePending ? (
            <View className="rounded-full bg-on-primary/15 px-3 py-1.5">
              <Text className="text-[12px] font-semibold text-on-primary" numberOfLines={1}>
                {t('components.wallet.upgradePending')}
              </Text>
            </View>
          ) : upgradeLabel && onUpgradePress ? (
            <Pressable
              accessibilityRole="button"
              onPress={onUpgradePress}
              className="flex-row items-center gap-1 rounded-full bg-on-primary px-3 py-1.5 active:opacity-80">
              <Ionicons name="arrow-up-circle" size={14} color={colors.primary} />
              <Text className="text-[12px] font-semibold text-primary" numberOfLines={1}>
                {upgradeLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
