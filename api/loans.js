import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

export async function fetchAllLoanProducts() {
  try {
    const response = await axiosCbaInstance.get(routes?.fetchAllOrgLoanProducts);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// Pre-booking preview: same payload shape as bookLoan, but computes the figures
// (fees, interest, total repayment, installments) WITHOUT creating a loan. Lets
// the form show the real breakdown — all numbers come from the backend.
export async function previewLoan(payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.loanPreview, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function bookLoan(payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.loanBooking, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function getMyLoans(params) {
  try {
    const response = await axiosCbaInstance.get(routes?.myLoans, { params });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function repayLoan(payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.loanRepayment, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}
