import { useQuery } from '@tanstack/react-query';
import { getOrgAccountFormat } from 'api/home';

export const useAccountFormat = (fallbackData) => {
  return useQuery({
    queryKey: ['orgAccountFormat'],
    queryFn: async () => {
      const response = await getOrgAccountFormat();
      const accountFormat = response?.data?.data;

      if (!accountFormat) {
        throw new Error('Failed to fetch organization account format');
      }

      return accountFormat;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: fallbackData ?? [],
    retry: false,
  });
};

export const formatPhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber?.replace(/\D/g, '');

  return cleaned?.startsWith('0') ? cleaned?.slice(1) : cleaned;
};

// Single source of truth for the "account number" shown to the user, so the SAME
// value appears on every screen (BUG-016). When the org's format is PHONE_NUMBER
// the phone is shown (falling back to the raw account number if the phone is
// missing on that payload); otherwise the raw account number. Pass whatever
// object you have — it just needs { mobilePhone, accountNumber }.
export const getDisplayAccountNumber = (accountNumberFormat, source) => {
  const accountNumber = source?.accountNumber ?? null;
  if (accountNumberFormat === 'PHONE_NUMBER') {
    return formatPhoneNumber(source?.mobilePhone) || accountNumber;
  }
  return accountNumber;
};
