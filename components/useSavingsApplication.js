import { useState, useEffect } from 'react';
import { Keyboard } from 'react-native';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import { bookSavingProduct, fetchAllSavingProducts } from 'api/save';
import { navigateReplace } from 'app/navigate';
import { getUser } from 'config/storage';
import { formatWithCommas, stripCommas } from 'helper';

const getTenorUnit = (tenorDisplayIn, count) => {
  if (tenorDisplayIn === 'IN_DAYS') return count === 1 ? 'day' : 'days';
  if (tenorDisplayIn === 'IN_MONTHS') return count === 1 ? 'month' : 'months';
  return count === 1 ? 'year' : 'years';
};

export function useSavingsApplication({ productType = 'FIXED' } = {}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionMode, setTransactionMode] = useState('');
  const [tenorDuration, setTenorDuration] = useState('');
  const [savingAccountNumber, setSavingAccountNumber] = useState('');

  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showTransactionModeDropdown, setShowTransactionModeDropdown] = useState(false);
  const [showTenorDropdown, setShowTenorDropdown] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [bookingSaving, setBookingSaving] = useState(false);

  // The savings source account is the user's OWN account — read it from the
  // profile saved at login/dashboard instead of asking them to type it. Kept in
  // state so the booking payload always carries a real account number.
  useEffect(() => {
    (async () => {
      try {
        const user = await getUser();
        if (user?.accountNumber) setSavingAccountNumber(String(user.accountNumber));
      } catch {
        // non-fatal: handleBookSaving surfaces a clear error if it's still empty
      }
    })();
  }, []);

  const {
    data: savingProducts = [],
    isLoading: loadingProducts,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['savingProducts', productType],
    queryFn: async () => {
      const response = await fetchAllSavingProducts({ productType });

      // console.log(JSON.stringify(response, null, 2));
      if (response?.ok && response?.data?.data) return response.data.data;
      Toast.show({
        type: 'error',
        text1: 'Failed To Fetch Products',
        text2: response?.message,
      });
      return [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const isBusy = loadingProducts || bookingSaving;

  // ── Derived data ──────────────────────────────────────────────────────────

  // Filter by the product type that was passed in
  const filteredProducts = savingProducts.filter((p) => p.savingProductType === productType);

  const productOptions = filteredProducts.map((p) => ({
    label: p.productName,
    value: String(p.id),
  }));

  // ⚠️ TODO: Confirm these enum values with backend swagger before going live
  const transactionModeOptions = [
    { label: 'One Time', value: 'ONE_TIME' },
    { label: 'Daily', value: 'DAILY' },
    { label: 'Weekly', value: 'WEEKLY' },
    { label: 'Monthly', value: 'MONTHLY' },
  ];

  //OTHERS

  const interestRateOptions = ['WEEKLY', 'QUARTERLY', 'ANNUALLY', 'MONTHLY', 'DAILY'].map(
    (item) => ({ label: item, value: item })
  );

  const tenorOptions = (() => {
    if (!selectedProduct) return [];
    const { minimumTenor, maximumTenor, tenorDisplayIn } = selectedProduct;
    if (minimumTenor == null || maximumTenor == null) return [];
    const options = [];
    for (let i = minimumTenor; i <= maximumTenor; i++) {
      options.push({
        label: `${i} ${getTenorUnit(tenorDisplayIn, i)}`,
        value: String(i),
      });
    }
    return options;
  })();

  const amountError = (() => {
    if (!selectedProduct || !amount) return '';
    const val = parseFloat(stripCommas(amount));
    if (val < selectedProduct.minTransactionLimit)
      return `Minimum amount is ₦${selectedProduct.minTransactionLimit?.toLocaleString()}`;
    if (val > selectedProduct.maxTransactionLimit)
      return `Maximum amount is ₦${selectedProduct.maxTransactionLimit?.toLocaleString()}`;
    return '';
  })();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAmountChange = (text) => setAmount(formatWithCommas(text));

  const handleProductSelect = (value) => {
    const product = filteredProducts.find((p) => String(p.id) === value);
    setSelectedProduct(product || null);
    setTenorDuration('');
    setTransactionMode('');
  };

  const handleToggleProductDropdown = () => {
    if (isBusy) return;
    setShowProductDropdown((prev) => !prev);
  };

  const handleToggleTransactionModeDropdown = () => {
    if (isBusy) return;
    setShowTransactionModeDropdown((prev) => !prev);
  };

  const handleToggleTenorDropdown = () => {
    if (isBusy) return;
    if (!selectedProduct) {
      Toast.show({
        type: 'error',
        text1: 'Select a savings product',
        text2: 'Please choose a savings product first to see tenor options.',
      });
      return;
    }
    setShowTenorDropdown((prev) => !prev);
  };

  const handleBookSaving = async () => {
    // Dismiss the keyboard before the request / navigation. Navigating away
    // with the keyboard still open let the keyboard-adjusted layout collide
    // with the native (Fabric) view teardown — the "child already has a
    // parent" crash. This is the single source-level guard for every savings
    // form that uses this hook.
    Keyboard.dismiss();

    if (!selectedProduct || !amount || !description || !tenorDuration) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all required fields before continuing.',
      });
      return;
    }

    // Account number is read from the saved profile, not typed. If it's somehow
    // missing, tell the user how to recover instead of silently sending a blank.
    if (!savingAccountNumber) {
      Toast.show({
        type: 'error',
        text1: 'Account Not Found',
        text2: 'We could not find your account number. Please reopen the app and try again.',
      });
      return;
    }

    if (amountError) {
      Toast.show({ type: 'error', text1: 'Invalid Amount', text2: amountError });
      return;
    }

    const payload = {
      savingsProductId: selectedProduct.id,
      amount: parseFloat(stripCommas(amount)),
      description,
      interestPeriod: tenorDuration,
      interestRate: selectedProduct.interestRate,
      transactionMode: 'RECEIPT',
      savingAccountNumber,
    };

    setBookingSaving(true);
    try {
      console.log(payload);
      const response = await bookSavingProduct(payload);
      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: 'Savings Booked',
          text2: response?.message ?? 'Your savings plan was created successfully.',
        });
        navigateReplace('rizeSpringsSavings');
      } else {
        Toast.show({
          type: 'error',
          text1: 'An error occurred',
          text2: response?.message?.message || response?.message,
        });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'An error occurred', text2: error?.message });
    } finally {
      setBookingSaving(false);
    }
  };

  return {
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
  };
}
