const EMAIL_REGEX = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,}$/i;
const PHONE_REGEX = /^9[0-9]{9}$/;
const PAN_REGEX = /^[0-9]{9}$/;

const isValidEmail = (value) => {
  const email = typeof value === 'string' ? value.trim() : '';
  return email.length <= 254 && EMAIL_REGEX.test(email);
};

const normalizePhoneNumber = (value) =>
  (typeof value === 'string' ? value : '').trim().replace(/[\s()-]/g, '').replace(/^\+977/, '');

const isValidPhoneNumber = (value) => PHONE_REGEX.test(normalizePhoneNumber(value));

const isValidPanNumber = (value) =>
  typeof value === 'string' && PAN_REGEX.test(value.trim());

module.exports = {
  isValidEmail,
  isValidPanNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
};
