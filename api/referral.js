import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

// All referral endpoints are GET and per-organisation. When the org has no
// programme configured they return 404 "The referral programme is not available
// for your organisation" — callers surface that as a friendly empty state.
async function getReferral(route, params) {
  try {
    const response = await axiosCbaInstance.get(route, params ? { params } : undefined);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return {
      ok: false,
      status: error?.response?.status,
      message: extractApiErrorMessage(error),
    };
  }
}

// data: { code, programmeName, rewardAmount, ... }
export const getReferralCode = () => getReferral(routes?.referralCode);

// data: { totalReferrals, pending, processing, rewarded, expired }
export const getReferralSummary = () => getReferral(routes?.referralSummary);

// paginated: { content: [...], page, totalPages, ... }
export const getReferralList = (params) => getReferral(routes?.referralList, params);
