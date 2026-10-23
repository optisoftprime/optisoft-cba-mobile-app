import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

export async function getDashBoardData() {
  try {
    const response = await axiosCbaInstance.get(routes?.dashboard);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function getOrgAccountFormat() {
  try {
    const response = await axiosCbaInstance.get(routes?.orgAccountFormat);
    return { ok: true, data: response.data };
  } catch (error) {
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}
