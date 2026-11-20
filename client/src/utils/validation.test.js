import {
  isValidEmail,
  isValidPanNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from './validation';

test('validates email addresses and rejects malformed values', () => {
  expect(isValidEmail('seller@example.com')).toBe(true);
  expect(isValidEmail(' seller+tea@example.co.np ')).toBe(true);
  expect(isValidEmail('seller@example')).toBe(false);
  expect(isValidEmail('seller @example.com')).toBe(false);
  expect(isValidEmail('seller@example..com')).toBe(false);
});

test('validates Nepal phone numbers in local and international formats', () => {
  expect(isValidPhoneNumber('9801234567')).toBe(true);
  expect(isValidPhoneNumber('+977 9801234567')).toBe(true);
  expect(normalizePhoneNumber('+977 9801234567')).toBe('9801234567');
  expect(isValidPhoneNumber('980123456')).toBe(false);
  expect(isValidPhoneNumber('7801234567')).toBe(false);
});

test('validates Nepal PAN numbers as exactly nine digits', () => {
  expect(isValidPanNumber('600123456')).toBe(true);
  expect(isValidPanNumber('60012345')).toBe(false);
  expect(isValidPanNumber('60012345A')).toBe(false);
});

test('validates the phone-number format used for shipment tracking numbers', () => {
  expect(isValidPhoneNumber('9801234567')).toBe(true);
  expect(isValidPhoneNumber('+977 9801234567')).toBe(true);
  expect(isValidPhoneNumber('1Z-ABC-123')).toBe(false);
});
