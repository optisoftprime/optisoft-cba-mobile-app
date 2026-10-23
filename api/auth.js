import axiosCbaInstance from 'config/api';
import { baseUrl, orgKey, routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';
import { getDeviceHeaders } from 'config/device';

export async function initiate(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.initiate, payload, { params: param });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// export async function generateOtp(param, payload) {
//   try {
//     const response = await axiosCbaInstance.post(routes?.generateOtpForReset, payload, {
//       params: param,
//     });
//     return { ok: true, data: response.data };
//   } catch (error) {
//     console.log(
//       JSON.stringify(
//         error?.response?.data || error?.response?.data?.message || error?.message,
//         null,
//         2
//       )
//     );
//     return { ok: false, message: extractApiErrorMessage(error) };
//   }
// }

// export async function generateOnRegOtp(param) {
//   try {
//     const response = await axiosCbaInstance.post(routes?.generateOnRegOtp, {
//       params: param,
//       headers: {
//         'Content-Type': 'application/json',
//         'org-key': orgKey,
//       },
//     });

//     return { ok: true, data: response.data };
//   } catch (error) {
//     console.log(
//       JSON.stringify(
//         error?.response?.data || error?.response?.data?.message || error?.message,
//         null,
//         2
//       )
//     );

//     return {
//       ok: false,
//       message: extractApiErrorMessage(error),
//     };
//   }
// }

export async function generateOnRegOtp(param = {}, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.generateOnRegOtp, payload, {
      params: { username: param.username },
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function validateOtp(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.validateOtp, payload, { params: param });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function verifyAccountOtp(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.verifyAccountOtp, payload, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function validateResetPasswordOtp(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.validateResetPasswordOtp, payload, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function register(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.register, payload, { params: param });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function login(param, payload) {
  try {
    const url = new URL(`${baseUrl}${routes?.login}`);
    if (param) {
      Object.entries(param).forEach(([key, value]) => url.searchParams.append(key, value));
    }

    // Device-management headers (x-device-id + handset info). Harmless while the
    // backend feature is off; needed for the account to recognise this device
    // once it's enabled. See config/device.js and the integration guide.
    const deviceHeaders = await getDeviceHeaders();

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-org-key': orgKey,
        ...deviceHeaders,
      },
      body: JSON.stringify(payload),
    });

    console.log('⬅️', response.status, routes?.login);
    const data = await response.json();

    if (!response.ok) {
      console.log(JSON.stringify(data?.message || data, null, 2));
      return { ok: false, message: extractApiErrorMessage(data) };
    }

    return { ok: true, data };
  } catch (error) {
    console.log(JSON.stringify(error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function getSecurityQuestions(param) {
  try {
    // The backend requires the username as a REQUEST HEADER. It must go in the
    // axios config (2nd arg) — a 3rd arg to .get() is ignored, which is why this
    // used to send no username and 400 with "Required header 'username' is missing".
    const response = await axiosCbaInstance.get(routes?.getSecurityQuestions, {
      headers: { username: param?.username },
    });

    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));

    return {
      ok: false,
      message: extractApiErrorMessage(error),
    };
  }
}

export async function setSecurityQuestions(username, payload) {
  try {
    // const response = await axiosCbaInstance.post(routes?.setSecurityQuestions, payload, {
    //   headers: { username },
    // });
    // const response = await axiosCbaInstance.post(routes.setSecurityQuestions, payload, {
    //   headers: {
    //     username,
    //   },
    // });

    const response = await axiosCbaInstance.post(routes.setSecurityQuestions, payload, {
      headers: {
        username,
      },
    });

    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function setupTransactionPin(username, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.setupTransactionPin, payload, {
      headers: { username },
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function resetTransactionPin(username, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.resetTransactionPin, payload, {
      headers: { username },
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// Forgot transaction PIN — step 1. No body: the user is resolved from the JWT.
// Returns { data: { maskedPhoneNumber, message } }. `status` is surfaced so the
// caller can branch on HTTP code (e.g. 409 = no PIN set → send to setup),
// because errorCode is unreliable per the integration guide.
export async function forgotTransactionPinInitiate() {
  try {
    const response = await axiosCbaInstance.post(routes?.forgotTransactionPinInitiate);
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

// Forgot transaction PIN — step 2. Body: { otp, newPin, confirmNewPin }. The OTP
// is verified inside this call, in the same transaction that writes the new PIN.
export async function forgotTransactionPinConfirm(payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.forgotTransactionPinConfirm, payload);
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

export async function validateSecurityQuestion(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.validateSecurityQuestion, payload, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// export async function forgotPassword(param, payload) {
//   try {
//     console.log(payload, 'forgot password payload');
//     console.log(param, 'forgot password param');

//     // const url = new URL(`${baseUrl}${routes?.passwordResetRequest}`);
//     const url = new URL(
//       `https://gateway.ezoneapps.com:30002/ezone-cba-mobile/api/v1/auth/password-reset/request`
//     );

//     const response = await fetch(url.toString(), {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-org-key': orgKey,
//       },
//       body: JSON.stringify(payload),
//     });

//     const data = await response.json();
//     console.log(data, 'forgot password response');
//     if (!response.ok) {
//       console.log(JSON.stringify(data?.message || data, null, 2));
//       return { ok: false, message: extractApiErrorMessage(data) };
//     }

//     return { ok: true, data };
//   } catch (error) {
//     console.log(JSON.stringify(error?.message, null, 2));
//     return { ok: false, message: extractApiErrorMessage(error) };
//   }
// }

export async function forgotPassword(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.passwordResetRequest, payload, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// export async function confirmResetPassword(param, payload) {
//   try {
//     const response = await axiosCbaInstance.post(routes?.passwordResetConfirm, payload, {
//       params: param,
//     });
//     return { ok: true, data: response.data };
//   } catch (error) {
//     console.log(JSON.stringify(error, null, 2));
//     return { ok: false, message: extractApiErrorMessage(error) };
//   }
// }

export async function confirmResetPassword(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.passwordResetConfirm, payload, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// export async function accountSetup(payload) {
//   try {
//     const response = await axiosCbaInstance.post(routes?.onBoardNewUser, payload);
//     return { ok: true, data: response.data };
//   } catch (error) {
//     console.log('STATUS:', error?.response?.status);
//     console.log('DATA:', JSON.stringify(error?.response?.data, null, 2));
//     console.log(JSON.stringify(error, null, 2));
//     return { ok: false, message: extractApiErrorMessage(error) };
//   }
// }

export async function accountSetup(payload) {
  try {
    const response = await axiosCbaInstance.post(routes.onBoardNewUser, payload, {
      baseURL: 'https://cbamobile.ezoneapps.com:8088',
    });

    console.log(response, 'account setup response ');

    return {
      ok: true,
      data: response.data,
    };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));

    return {
      ok: false,
      message: extractApiErrorMessage(error),
    };
  }
}

export async function refreshToken(payload) {
  try {
    const response = await fetch(`${baseUrl}${routes?.refreshToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-org-key': orgKey,
      },
      body: JSON.stringify(payload), // { refreshToken: "..." }
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(JSON.stringify(data?.message || data, null, 2));
      return { ok: false, message: extractApiErrorMessage(data) };
    }

    return { ok: true, data };
  } catch (error) {
    console.log(JSON.stringify(error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function getTransactionPinStatus() {
  try {
    const response = await axiosCbaInstance.get(routes?.transactionPinStatus);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function generateOtp(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.generateOtp, payload, { params: param });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function getAllUserAccounts(param) {
  try {
    const response = await axiosCbaInstance.get(routes?.allUserAccounts, { params: param });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// Public onboarding endpoint. GET with query { accountNumber }. Returns
// { success, data: [{ accountNumber, accountName, phoneNumber }] } — the
// customer's accounts — and triggers the registration OTP automatically.
export async function publicValidateAccountNumber(param) {
  try {
    const response = await axiosCbaInstance.get(routes?.publicValidateAccountNumber, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// Public onboarding endpoint. GET with query { accountNumber }. Re-sends the
// registration OTP for that account.
export async function publicRegenerateOtp(param) {
  try {
    const response = await axiosCbaInstance.get(routes?.publicRegenerateOtp, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function markAccountPrimary(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.markAccountPrimary, payload, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}
