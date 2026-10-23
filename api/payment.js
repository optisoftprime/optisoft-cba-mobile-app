import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

const errorMap = {
  'BELOW MINIMUM AMOUNT ALLOWED': 'The amount entered is below the minimum allowed.',
  'INSUFFICIENT BALANCE': 'You do not have enough balance to complete this transaction.',
};
export async function executeBillServices(payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.executeBillServices, payload);

    return { ok: true, data: response.data };
  } catch (error) {
    console.log('Status:', error?.response, error?.response.data.message, error?.response.message);
    console.log('Response Data:', JSON.stringify(error?.response?.data, null, 2));

    console.log(error?.response, error?.response.data.message, 'error?.response.data.message');
    return {
      ok: false,
      message: error?.response?.data?.message,
      errorCode: error?.response?.status,
    };
  }
}

// export async function executeBillServices(payload) {
//   try {
//     const response = await axiosCbaInstance.post(routes.executeBillServices, payload, {
//       baseURL: 'https://gateway.ezoneapps.com:30002/ezone-bills-service',
//     });

//     console.log(response, 'executeBillServices response ');
//     return {
//       ok: true,
//       data: response.data,
//     };
//   } catch (error) {
//     console.log(JSON.stringify(error, null, 2));

//     return {
//       ok: false,
//       message: extractApiErrorMessage(error),
//     };
//   }
// }

// export async function validateMeter(payload) {
//   console.log('logged validate meter 0125213383784');
//   try {
//     const response = await axiosCbaInstance.post(routes.validateMeter, payload, {
//       baseURL: 'https://gateway.ezoneapps.com:30002/ezone-bills-service',
//     });

//     console.log(
//       response,
//       'difference response.data.body.content                  ',
//       response.data.body,

//       'validateMeter response 1',

//       response.data.body.content,

//       'validateMeter response 2',
//       response.body.content
//     );
//     return {
//       ok: true,
//       data: response.data.body,
//     };
//   } catch (error) {
//     console.log(JSON.stringify(error, null, 2));

//     return {
//       ok: false,
//       message: extractApiErrorMessage(error),
//     };
//   }
// }

export async function validateMeter(payload) {
  try {
    // const response = await axiosCbaInstance.post(routes.validateMeter, payload, {
    //   baseURL: 'https://gateway.ezoneapps.com:30002/ezone-bills-service',
    //   timeout: 30000,
    // });

    // Find a way to refatcor it it should also be a varialbe in the abckendCinfig that i an change with one line maybe youll add soemthing like  billServiceApi=....
    const response = await axiosCbaInstance.post(routes.validateMeter, payload, {
      baseURL: 'https://gateway.ezoneapps.com:30002/ezone-bills-service',
    });

    return {
      ok: true,
      data: response.data.data.body.content,
    };
  } catch (error) {
    console.log('Error:', error);
    console.log('Status:', error?.response?.status);
    console.log('Data:', error?.response?.data);

    return {
      ok: false,
      message: extractApiErrorMessage(error) || error?.message,
    };
  }
}
