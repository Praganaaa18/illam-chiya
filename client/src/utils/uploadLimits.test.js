import {
  isValidUploadSize,
  MAX_UPLOAD_SIZE_BYTES,
  MIN_UPLOAD_SIZE_BYTES,
} from './uploadLimits';

test('accepts files at the 100 KB and 500 KB boundaries', () => {
  expect(isValidUploadSize(MIN_UPLOAD_SIZE_BYTES)).toBe(true);
  expect(isValidUploadSize(MAX_UPLOAD_SIZE_BYTES)).toBe(true);
});

test('rejects files outside the 100 KB to 500 KB range', () => {
  expect(isValidUploadSize(MIN_UPLOAD_SIZE_BYTES - 1)).toBe(false);
  expect(isValidUploadSize(MAX_UPLOAD_SIZE_BYTES + 1)).toBe(false);
});
