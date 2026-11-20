const EMAIL_REGEX = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,}$/i;
const PHONE_REGEX = /^9[0-9]{9}$/;
const PAN_REGEX = /^[0-9]{9}$/;

export const isValidEmail = (value) => {
  const email = String(value || '').trim();
  return email.length <= 254 && EMAIL_REGEX.test(email);
};

export const normalizePhoneNumber = (value) =>
  String(value || '').trim().replace(/[\s()-]/g, '').replace(/^\+977/, '');

export const isValidPhoneNumber = (value) => PHONE_REGEX.test(normalizePhoneNumber(value));

export const isValidPanNumber = (value) => PAN_REGEX.test(String(value || '').trim());
