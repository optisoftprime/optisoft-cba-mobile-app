import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

export async function fetchAllSavingProducts(params) {
  try {
    const response = await axiosCbaInstance.get(routes?.allSavingProducts, { params });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function bookSavingProduct(payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.bookSavingProduct, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function getUserSavingTransactions(params) {
  try {
    console.log(params);
    const response = await axiosCbaInstance.get(routes?.userSavingTransactions, { params });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}
