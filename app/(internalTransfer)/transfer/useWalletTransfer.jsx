import { useState, useEffect, useRef } from 'react';
import Toast from 'react-native-toast-message';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { validateAccountNumber, makeInternalTransfer } from 'api/transfer';
import { getDashBoardData } from 'api/home';
import { formatWithCommas, getUniqueRecipients, stripCommas } from 'helper';
import { Alert } from 'react-native';
import { navigateTo } from 'app/navigate';

export function useWalletTransfer() {
  const [walletNumber, setWalletNumber] = useState('');
  const [validatedAccount, setValidatedAccount] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const debounceRef = useRef(null);

  const { data: dashData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await getDashBoardData();
      console.log(JSON.stringify(response, null, 2));
      return (
        response?.data?.data ?? {
          walletBalance: 0,
          accountNumber: '',
          accountName: '',
          transactionHistory: [],
        }
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const allRecipients = getUniqueRecipients(dashData?.transactionHistory ?? []);

  const suggestions =
    walletNumber.trim().length === 0
      ? allRecipients.slice(0, 8)
      : allRecipients
          .filter((r) => {
            // Match against the RECIPIENT's account number and name — not
            // customerName (that's the logged-in account owner) or accountNumber
            // (the tx field is recipientAccountNumber). Using the wrong fields
            // made the recent list disappear the moment a digit was typed.
            const query = walletNumber.toLowerCase();
            const acct = String(r.recipientAccountNumber ?? '');
            const name = String(r.recipientName ?? r.recipient ?? '').toLowerCase();
            return acct.includes(walletNumber) || name.includes(query);
          })
          .slice(0, 8);

  // ── Validation ──────────────────────────────────────────────────────────

  const runValidation = async (accountNumber) => {
    setValidating(true);
    try {
      const response = await validateAccountNumber({ accountNumber });
      console.log(JSON.stringify(response, null, 2));
      if (response?.ok && response?.data?.data) {
        if (response.data.data.length > 1) {
          setValidatedAccount(response.data.data);
        } else {
          setValidatedAccount(response.data.data[0]);
        }
      } else if (response?.ok && response?.data?.data === null) {
        setValidatedAccount(response.data.data);
      } else {
        setValidationError(response?.message ?? 'Account not found');
      }
    } catch (error) {
      setValidationError(error?.message ?? 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  const handleWalletNumberChange = (text) => {
    const digits = text.replace(/[^0-9]/g, '');
    setWalletNumber(digits);
    setValidatedAccount(null);
    setValidationError('');
    setShowSuggestions(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (digits.length === 10) {
      debounceRef.current = setTimeout(() => {
        setShowSuggestions(false);

        // Nigerian mobile numbers without leading 0 start with 7, 8, or 9
        // (MTN: 803/806/813/816, Airtel: 802/808, Glo: 805/807, 9mobile: 809/817 etc.)
        // NUBAN account numbers start with 0, 1, 2, 3
        const firstDigit = digits.charAt(0);
        const isPhoneNumber = ['7', '8', '9'].includes(firstDigit);

        runValidation(isPhoneNumber ? `0${digits}` : digits);
      }, 500);
    }
  };

  const handleSelectSuggestion = (tx) => {
    setWalletNumber(tx.recipientAccountNumber);
    setShowSuggestions(false);
    setValidatedAccount(null);
    setValidationError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    runValidation(tx.recipientAccountNumber);
  };

  const handleAmountChange = (text) => setAmount(formatWithCommas(text));

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleContinue = () => {
    // For phone number lookups (array response), user must pick an account first
    if (Array.isArray(validatedAccount) && !selectedAccount) {
      Toast.show({
        type: 'error',
        text1: 'Select an account',
        text2: 'Please select one of the accounts to continue.',
      });
      return;
    }

    // For single account validation
    if (!validatedAccount && !selectedAccount) {
      Toast.show({
        type: 'error',
        text1: 'Invalid recipient',
        text2: 'Please enter a valid wallet number or phone number.',
      });
      return;
    }

    if (!amount || parseFloat(stripCommas(amount)) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Enter amount',
        text2: 'Amount must be greater than ₦0.',
      });
      return;
    }

    setPinModalVisible(true);
  };

  const handlePinConfirm = async (pin) => {
    setSubmitting(true);
    try {
      const response = await makeInternalTransfer(
        {},
        {
          destinationAccountNumber: walletNumber,
          amount: parseFloat(stripCommas(amount)),
          description: narration,
          transactionPin: pin,
        }
      );
      if (response?.ok) {
        setPinModalVisible(false);
        Toast.show({
          type: 'success',
          text1: 'Transfer Successful',
          text2: response?.message ?? 'Your transfer was completed.',
        });
        setSuccessData(response?.data?.data ?? response?.data ?? {});
        setSuccessModalVisible(true);
        await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

        // console.log(response,response.data, "transactionReceipt im wallet ransfer")

        // navigateReplace('transactionReceipt');
        //   navigateReplace('transactionReceipt', {
        //             receiptDetails: response.data.data,
        //         });
      } else if (response?.errorCode === 'TRANSFER_DISABLED') {
        // The user's OWN transfer switch is off — not a generic failure.
        // Show the backend message verbatim and deep-link to the Transfer
        // Permission screen where they can switch transfers back on.
        setPinModalVisible(false);
        Alert.alert('Transfers are switched off', response?.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => navigateTo('transferPermission') },
        ]);
      } else {
        Toast.show({ type: 'error', text1: 'Transfer Failed', text2: response?.message });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'An error occurred', text2: error?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAccount = (acct) => {
    setSelectedAccount(acct);
    // Update walletNumber to the actual account number for the transfer payload.
    // Strip any masking (e.g. "******9435" → use as-is; backend handles masked numbers,
    // or if your backend needs the full number, store it separately from validation response)
    setWalletNumber(acct.accountNumber);
  };

  const handleClearSelectedAccount = () => {
    setSelectedAccount(null);
    // Keep validatedAccount (the array) so the list re-appears without re-validating
  };

  // ── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    // field values
    walletNumber,
    amount,
    narration,
    setNarration,
    // validation state
    selectedAccount,
    setSelectedAccount,
    validatedAccount,
    validating,
    validationError,
    // suggestions
    suggestions,
    showSuggestions,
    setShowSuggestions,
    // modal state
    pinModalVisible,
    setPinModalVisible,
    submitting,
    setSubmitting,
    // handlers
    handleSelectAccount,
    handleClearSelectedAccount,
    handleWalletNumberChange,
    handleSelectSuggestion,
    handleAmountChange,
    handleContinue,
    handlePinConfirm,
    successModalVisible,
    successData,
  };
}
