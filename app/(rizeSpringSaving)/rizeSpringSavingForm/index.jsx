import React from 'react';
import {
  View,
  RefreshControl,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import Header from 'components/header';
import { navigateBack } from 'app/navigate';
import Dropdown from 'components/dropDown';
import TouchBtn from 'components/touchBtn';
import WalletBalanceCard from 'components/walletCard';
import TextInputComponent from 'components/textInputs';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import { ProductSummaryCard } from '../../../components/SavingsFormCards';
import { useSavingsApplication } from '../../../components/useSavingsApplication';

export default function RizeSpringForm() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const {
    amount,
    description,
    setDescription,
    transactionMode,
    setTransactionMode,
    tenorDuration,
    setTenorDuration,
    savingAccountNumber,
    setSavingAccountNumber,
    showProductDropdown,
    showTransactionModeDropdown,
    showTenorDropdown,
    selectedProduct,
    loadingProducts,
    bookingSaving,
    isBusy,
    isRefetching,
    refetch,
    productOptions,
    transactionModeOptions,
    tenorOptions,
    amountError,
    handleAmountChange,
    handleProductSelect,
    handleToggleProductDropdown,
    handleToggleTransactionModeDropdown,
    handleToggleTenorDropdown,
    handleBookSaving,
    interestRateOptions,
  } = useSavingsApplication();

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }>
          <Header
            title={t('savings.rizeSpringFormHeader')}
            onLeftPress={navigateBack}
            showLeftIcon={true}
            color={colors.textPrimary}
          />

          <WalletBalanceCard
            walletName={t('savings.rizeSpringFormWalletName')}
            balance={selectedProduct ? `${selectedProduct.interestRate}%` : '—'}
            description={
              selectedProduct
                ? t('savings.commonInterestRateOnPlan')
                : t('savings.commonSelectPlanToSeeRate')
            }
            showWalletName={true}
            showBalance={true}
            showBalanceToggle={false}
            showDescription={true}
            showDescriptionButton={false}
            showPoints={false}
            showWalletNumber={false}
            showCopyWallet={false}
            showTopRightButton={false}
            containerClassName="mx-5 mb-8"
          />

          <View className="flex-1 px-5">
            <Dropdown
              label={t('savings.commonSavingsProduct')}
              placeholder={
                loadingProducts ? t('savings.commonLoading') : t('savings.commonSelectProduct')
              }
              value={selectedProduct ? String(selectedProduct.id) : ''}
              options={loadingProducts ? [] : productOptions}
              onSelect={handleProductSelect}
              isOpen={showProductDropdown && !isBusy}
              onToggle={handleToggleProductDropdown}
              isLoading={isBusy}
              search
            />

            <ProductSummaryCard product={selectedProduct} />

            <TextInputComponent
              label={t('savings.commonAmount')}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="₦0.00"
              keyboardType="decimal-pad"
              error={amountError}
              isLoading={isBusy}
              containerStyle={{ marginBottom: 16, marginTop: 12 }}
            />

            <TextInputComponent
              label={t('savings.commonDescription')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('savings.commonDescriptionPlaceholder')}
              returnKeyType="done"
              isLoading={isBusy}
              containerStyle={{ marginBottom: 16 }}
            />

            <Dropdown
              label={t('savings.commonTenorDuration')}
              placeholder={
                selectedProduct
                  ? t('savings.commonSelectDuration')
                  : t('savings.commonSelectProductFirst')
              }
              value={tenorDuration}
              options={interestRateOptions}
              onSelect={setTenorDuration}
              isOpen={showTenorDropdown && !isBusy}
              onToggle={handleToggleTenorDropdown}
              isLoading={isBusy}
              style={{ marginTop: 10 }}
            />

            <TextInputComponent
              label={t('savings.commonInterestRate')}
              value={selectedProduct ? `${selectedProduct.interestRate}%` : '—'}
              editable={false}
              isLoading={isBusy}
              inputStyle={{ backgroundColor: colors.cardMuted }}
              containerStyle={{ marginBottom: 32, marginTop: 20 }}
            />
          </View>

          <View className="px-5 pb-6">
            <TouchBtn
              onPress={() => {
                // Dismiss keyboard before navigating — avoids the Fabric "child already has a parent" crash on teardown.
                Keyboard.dismiss();
                handleBookSaving();
              }}
              label={t('savings.commonContinue')}
              isLoading={bookingSaving}
              loadingText={t('savings.commonBooking')}
              textClassName="text-base font-semibold"
              buttonClassName="items-center rounded-xl py-4"
              activeOpacity={0.8}
              containerClassName=""
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
