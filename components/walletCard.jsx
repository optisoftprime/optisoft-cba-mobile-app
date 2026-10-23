// components/walletCard.jsx
//
// The balance card on the savings / loan / referral screens. Same design as
// the home screen's wallet (components/dashboard/wallet-panel): a solid brand
// card with two soft circles in the corner, the figure large and bold, and
// translucent pills for the secondary actions.
//
// The card always takes the brand colour (each product used to carry its own
// hardcoded colour and decoration image).
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';

const WalletBalanceCard = ({
  // Content props
  walletName,
  balance = '₦0.00',
  description = '',
  points = '0 Points',
  walletNumber = '',
  referralCount = null,

  moneyImagePath = null,

  // Visibility props
  showWalletName = true,
  showBalance = true,
  showBalanceToggle = true,
  showDescription = true,
  showDescriptionButton = true,
  showPoints = true,
  showWalletNumber = true,
  showCopyWallet = true,
  showTopRightButton = false,
  showTopRightBadge = false,
  showMoneyImage = false,
  showShareButton = false,
  showWithdrawButton = false,

  // Top right button/badge props
  topRightText,
  topRightAction,
  topRightIcon = 'account-balance-wallet',
  topRightIconSize = 14,

  // Withdraw button props
  withdrawText,
  onWithdraw,

  // Callbacks
  onDescriptionPress,
  onCopyWallet,
  onToggleBalance,
  onShareWallet,

  // Container styling
  containerClassName = 'mx-4 mb-6',
}) => {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const withdrawLabel = withdrawText ?? t('components.wallet.withdraw');
  const resolvedWalletName = walletName ?? t('savings.hubWalletName');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const toggleBalanceVisibility = () => {
    const next = !isBalanceVisible;
    setIsBalanceVisible(next);
    onToggleBalance?.(next);
  };

  const handleCopyWallet = async () => {
    if (walletNumber) {
      await Clipboard.setStringAsync(walletNumber);
      onCopyWallet?.(walletNumber);
    }
  };

  const handleShareWallet = () => {
    onShareWallet?.(walletNumber);
  };

  const hasTopRight =
    (showTopRightButton && topRightText && topRightAction) ||
    (showTopRightBadge && referralCount !== null);

  return (
    <View className={containerClassName}>
      <View className="overflow-hidden rounded-3xl bg-primary" style={shadows.md}>
        {/* Decorative circles — depth without a second colour. */}
        <View className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-on-primary/10" />
        <View className="absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-on-primary/5" />

        {showMoneyImage && moneyImagePath ? (
          <Image
            source={moneyImagePath}
            className="absolute bottom-0 right-0"
            style={{ width: 160, height: 140 }}
            resizeMode="contain"
          />
        ) : null}

        <View className="px-5 pb-5 pt-5">
          {/* Name row: wallet name on the left; points, a badge or an action on the right */}
          {showWalletName || hasTopRight ? (
            <View className="flex-row items-center justify-between gap-3">
              {showWalletName ? (
                <View className="shrink flex-row items-center gap-2">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-on-primary/15">
                    <Ionicons name="wallet-outline" size={15} color={colors.onPrimary} />
                  </View>
                  <Text
                    className="shrink text-[13px] font-medium text-on-primary/85"
                    numberOfLines={1}>
                    {resolvedWalletName}
                  </Text>
                </View>
              ) : (
                <View />
              )}

              {showTopRightButton && topRightText && topRightAction ? (
                <TouchableOpacity
                  onPress={topRightAction}
                  activeOpacity={0.8}
                  className="flex-row items-center gap-1 rounded-full bg-on-primary px-3 py-1.5">
                  <MaterialIcons
                    name={topRightIcon}
                    size={topRightIconSize}
                    color={colors.primary}
                  />
                  <Text className="text-[12px] font-semibold text-primary">{topRightText}</Text>
                </TouchableOpacity>
              ) : showTopRightBadge && referralCount !== null ? (
                <View className="rounded-full bg-on-primary/15 px-3 py-1.5">
                  <Text className="text-[12px] font-semibold text-on-primary">
                    {referralCount} {referralCount === 1 ? 'Referral' : 'Referrals'}
                  </Text>
                </View>
              ) : showWalletName && showPoints ? (
                <Text className="text-[13px] font-bold text-on-primary">{points}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Balance */}
          {showBalance ? (
            <View className="mt-3 flex-row items-center gap-3">
              <Text
                className="shrink text-[30px] font-extrabold text-on-primary"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}>
                {isBalanceVisible ? balance : '••••••••'}
              </Text>
              {showBalanceToggle ? (
                <TouchableOpacity
                  onPress={toggleBalanceVisibility}
                  hitSlop={10}
                  className="h-8 w-8 items-center justify-center rounded-full bg-on-primary/15">
                  <Ionicons
                    name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'}
                    size={16}
                    color={colors.onPrimary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Wallet number pill + withdraw */}
          {(showWalletNumber && walletNumber) || (showWithdrawButton && onWithdraw) ? (
            <View className="mt-4 flex-row items-center justify-between gap-3">
              {showWalletNumber && walletNumber ? (
                <View className="shrink flex-row items-center gap-2 rounded-full bg-on-primary/15 px-3 py-1.5">
                  <Text className="text-[13px] font-semibold text-on-primary" numberOfLines={1}>
                    {walletNumber}
                  </Text>
                  {showCopyWallet ? (
                    <TouchableOpacity onPress={handleCopyWallet} hitSlop={8}>
                      <Ionicons name="copy-outline" size={14} color={colors.onPrimary} />
                    </TouchableOpacity>
                  ) : null}
                  {showShareButton ? (
                    <TouchableOpacity onPress={handleShareWallet} hitSlop={8}>
                      <Ionicons name="share-social-outline" size={14} color={colors.onPrimary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : (
                <View />
              )}

              {showWithdrawButton && onWithdraw ? (
                <TouchableOpacity
                  onPress={onWithdraw}
                  activeOpacity={0.8}
                  className="flex-row items-center gap-1 rounded-full bg-on-primary px-3 py-1.5">
                  <MaterialIcons name="account-balance-wallet" size={14} color={colors.primary} />
                  <Text className="text-[12px] font-semibold text-primary">{withdrawLabel}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Description: a pill (tappable) or a plain line */}
          {showDescription && description ? (
            showDescriptionButton ? (
              <TouchableOpacity
                className="mt-3 self-start rounded-full bg-on-primary/15 px-3 py-1.5"
                activeOpacity={0.8}
                disabled={!onDescriptionPress}
                onPress={onDescriptionPress}>
                <Text className="text-[12px] font-semibold text-on-primary">{description}</Text>
              </TouchableOpacity>
            ) : (
              <Text className="mt-2 text-[13px] text-on-primary/85">{description}</Text>
            )
          ) : null}
        </View>
      </View>
    </View>
  );
};

export default WalletBalanceCard;
