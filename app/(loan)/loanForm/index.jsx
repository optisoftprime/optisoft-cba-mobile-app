// screens/LoanApplicationForm.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Header from 'components/header';
import { navigateBack } from 'app/navigate';
import { useBlockBackWhileBusy } from 'app/hooks/useBlockBackWhileBusy';
import Dropdown from 'components/dropDown';
import TouchBtn from 'components/touchBtn';
import WalletBalanceCard from 'components/walletCard';
import TextInputComponent from 'components/textInputs';
import { useTheme } from 'config/ThemeContext';
import { GlobalStatusBar } from 'config/statusBar';
import { ProductSummaryCard, FeesCard, LoanPreviewCard } from './LoanFormCards';
import { useLoanApplication } from './useLoanApplication';

export default function LoanApplicationForm() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const {
    loanAmount,
    loanPurpose,
    setLoanPurpose,
    setAcceptTc,
    repaymentDuration,
    setRepaymentDuration,
    understood,
    showDurationDropdown,
    showProductDropdown,
    selectedProduct,
    loadingProducts,
    bookingLoan,
    isBusy,
    isRefetching,
    refetch,
    productOptions,
    durationOptions,
    productFees,
    loanAmountError,
    loanPreview,
    previewLoading,
    previewError,
    canPreview,
    handleLoanAmountChange,
    handleProductSelect,
    handleToggleDurationDropdown,
    handleToggleProductDropdown,
    handleToggleUnderstood,
    handleBookLoan,
  } = useLoanApplication();

  // Loan booking isn't behind the (self-guarding) transaction-PIN modal, so block
  // hardware back while the booking request is in flight — the backend can't
  // cancel a submitted loan. The header back arrow is guarded the same way below.
  useBlockBackWhileBusy(bookingLoan);

  const [tcModalVisible, setTcModalVisible] = useState(false);

  // Terms & Conditions now come from the backend per loan product, in
  // `productTcResponse` ({ id, name, content }). Show that content directly —
  // no more hardcoded template. When a product has no T&C configured
  // (productTcResponse is null) we say so plainly rather than faking one.
  const productTc = selectedProduct?.productTcResponse;
  const tcText = typeof productTc?.content === 'string' ? productTc.content.trim() : '';
  const hasTc = tcText.length > 0;
  const tcContent = hasTc ? tcText : t('loans.tcUnavailable');

  const handleCheckboxPress = () => {
    if (isBusy) return;

    // If already accepted, tapping again un-accepts (no need to re-read)
    if (understood) {
      handleToggleUnderstood();
      setAcceptTc?.(false);
      return;
    }

    // Not yet accepted — show the T&C popup first
    setTcModalVisible(true);
  };

  const handleAcceptTc = () => {
    setTcModalVisible(false);
    handleToggleUnderstood();
    setAcceptTc?.(true);
  };

  const handleDeclineTc = () => {
    setTcModalVisible(false);
  };

  console.log(loadingProducts, productOptions, 'loadingProducts');

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        <Header
          title={t('loans.applicationFormTitle')}
          onLeftPress={() => {
            if (!bookingLoan) navigateBack();
          }}
          showLeftIcon={true}
          color={colors.textPrimary}
          leftIconColor={colors.textPrimary}
        />

        {/* Booking form — there's no wallet balance to show here, so a fake
            ₦0.00 was misleading. Show the SELECTED product's real interest rate
            instead (a prompt until one is picked). */}
        <WalletBalanceCard
          walletName={t('loans.loanProduct')}
          balance={selectedProduct ? `${selectedProduct.interestRate}%` : '—'}
          description={
            selectedProduct ? t('loans.interestRateOnProduct') : t('loans.selectProductToSeeRate')
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
            label={t('loans.loanProduct')}
            placeholder={loadingProducts ? t('loans.loading') : t('loans.selectLoanProduct')}
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
            label={t('loans.loanAmount')}
            value={loanAmount}
            onChangeText={handleLoanAmountChange}
            placeholder="₦0.00"
            keyboardType="decimal-pad"
            error={loanAmountError}
            isLoading={isBusy}
            containerStyle={{ marginBottom: 16, marginTop: 12 }}
          />

          <TextInputComponent
            label={t('loans.loanPurpose')}
            value={loanPurpose}
            onChangeText={setLoanPurpose}
            placeholder={t('loans.loanPurposePlaceholder')}
            returnKeyType="done"
            isLoading={isBusy}
            containerStyle={{ marginBottom: 16 }}
          />

          <Dropdown
            label={t('loans.repaymentDuration')}
            placeholder={
              selectedProduct ? t('loans.selectDuration') : t('loans.selectProductFirst')
            }
            value={repaymentDuration}
            options={durationOptions}
            onSelect={setRepaymentDuration}
            isOpen={showDurationDropdown && !isBusy}
            onToggle={handleToggleDurationDropdown}
            isLoading={isBusy}
          />

          <TextInputComponent
            label={t('loans.interestRate')}
            value={selectedProduct ? `${selectedProduct.interestRate}%` : '—'}
            editable={false}
            isLoading={isBusy}
            inputStyle={{ backgroundColor: colors.cardMuted }}
            containerStyle={{ marginBottom: 16, marginTop: 10 }}
          />

          <FeesCard fees={productFees} />

          {/* Backend-computed loan breakdown (disbursement, fees, interest, total
              to repay) shown before booking — no client-side calculation. */}
          <LoanPreviewCard
            preview={loanPreview}
            loading={previewLoading && canPreview}
            error={previewError}
          />

          {/* Accept Terms & Conditions */}
          <TouchableOpacity
            onPress={handleCheckboxPress}
            activeOpacity={isBusy ? 1 : 0.7}
            disabled={isBusy || !selectedProduct}
            className="mb-6 flex-row items-start">
            <View
              className="mt-0.5 h-5 w-5 items-center justify-center rounded-md border-2"
              style={{
                borderColor:
                  isBusy || !selectedProduct
                    ? colors.inkSoft
                    : understood
                      ? colors.primary
                      : colors.line,
                backgroundColor:
                  isBusy || !selectedProduct
                    ? colors.cardMuted
                    : understood
                      ? colors.primary
                      : colors.card,
              }}>
              {understood && !isBusy && (
                <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text
                className={`text-sm ${isBusy || !selectedProduct ? 'text-ink-soft' : 'text-ink'}`}>
                {t('loans.acceptTcPrefix')}{' '}
                <Text
                  className="font-semibold text-primary"
                  onPress={() => !isBusy && selectedProduct && setTcModalVisible(true)}>
                  {t('loans.termsAndConditions')}
                </Text>
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="px-5 pb-6">
          <TouchBtn
            onPress={handleBookLoan}
            label={t('loans.continue')}
            isLoading={bookingLoan}
            loadingText={t('loans.booking')}
            disabled={!understood || isBusy}
            textClassName="text-base font-semibold"
            buttonClassName="items-center rounded-xl py-4"
            activeOpacity={0.8}
            containerClassName=""
          />
        </View>
      </ScrollView>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={tcModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleDeclineTc}>
        <View className="flex-1 justify-end" style={{ backgroundColor: colors.heroOverlay }}>
          <View
            className="rounded-t-3xl px-6 pt-5"
            style={{ paddingBottom: 28, maxHeight: '85%', backgroundColor: colors.card }}>
            {/* Drag handle */}
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full" style={{ backgroundColor: colors.line }} />
            </View>

            {/* Header */}
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="text-[17px] font-bold" style={{ color: colors.ink }}>
                {t('loans.termsAndConditions')}
              </Text>
              <TouchableOpacity onPress={handleDeclineTc}>
                <Ionicons name="close" size={24} color={colors.inkSoft} />
              </TouchableOpacity>
            </View>

            {selectedProduct?.name && (
              <Text className="mb-4 mt-1 text-xs" style={{ color: colors.inkMuted }}>
                {t('loans.forProduct', { name: selectedProduct.name })}
              </Text>
            )}

            {/* Scrollable T&C body */}
            <ScrollView
              className="mb-5"
              style={{ maxHeight: 380 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled>
              <Text className="text-sm leading-6" style={{ color: colors.ink }}>
                {tcContent}
              </Text>
            </ScrollView>

            {/* Actions */}
            <TouchBtn
              onPress={handleAcceptTc}
              label={t('loans.acceptContinue')}
              backgroundColor={colors.primary}
              textColor={colors.onPrimary}
              buttonClassName="items-center rounded-xl py-4"
              textClassName="text-base font-semibold"
              activeOpacity={0.8}
            />
            <TouchableOpacity onPress={handleDeclineTc} className="mt-3 items-center py-2">
              <Text className="text-sm font-semibold" style={{ color: colors.inkMuted }}>
                {t('loans.decline')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
