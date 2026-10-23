// config/registrationSteps.js
import { brand } from 'config/brand';

export const registrationSteps = [
  {
    step: 1,
    title: 'Validate your account',
    description:
      'Enter your account number and we will send a one time password (OTP) to the email address linked to your bank account',
  },
  {
    step: 2,
    title: 'Set your user name and password',
    description: `Set up your username and password to secure your account. This will be your personal key to access ${brand.appName} anytime. Choose something unique and memorable for safe banking.`,
  },
  {
    step: 3,
    title: 'Set Security Questions and transaction PIN',
    description:
      'Set your security questions and transaction PIN to protect your account. These will help verify your identity and keep your money safe. Choose questions only you can answer and a PIN you won\'t forget."',
  },
];

export const registrationConfig = {
  title: 'New User Registration',
  subtitle: '3 Simple steps to Register',
  buttonText: 'Continue',
};
