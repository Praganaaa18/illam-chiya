const assert = require('node:assert/strict');
const test = require('node:test');
const {
  isValidEmail,
  isValidPanNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
} = require('./validation');

test('validates email addresses', () => {
  assert.equal(isValidEmail('seller@example.com'), true);
  assert.equal(isValidEmail('seller@example'), false);
  assert.equal(isValidEmail('seller @example.com'), false);
});

test('validates local and international Nepal phone numbers', () => {
  assert.equal(isValidPhoneNumber('9801234567'), true);
  assert.equal(isValidPhoneNumber('+977 9801234567'), true);
  assert.equal(normalizePhoneNumber('+977 9801234567'), '9801234567');
  assert.equal(isValidPhoneNumber('980123456'), false);
});

test('validates nine-digit PAN numbers', () => {
  assert.equal(isValidPanNumber('600123456'), true);
  assert.equal(isValidPanNumber('60012345A'), false);
});

test('validates phone-number tracking values', () => {
  assert.equal(isValidPhoneNumber('9801234567'), true);
  assert.equal(isValidPhoneNumber('+977 9801234567'), true);
  assert.equal(isValidPhoneNumber('1Z-ABC-123'), false);
});
