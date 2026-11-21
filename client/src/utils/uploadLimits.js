export const MIN_UPLOAD_SIZE_BYTES = 100 * 1024;
export const MAX_UPLOAD_SIZE_BYTES = 500 * 1024;
export const UPLOAD_SIZE_ERROR = 'File size must be between 100 KB and 500 KB.';

export const isValidUploadSize = (fileSize) =>
  Number.isInteger(fileSize) &&
  fileSize >= MIN_UPLOAD_SIZE_BYTES &&
  fileSize <= MAX_UPLOAD_SIZE_BYTES;
