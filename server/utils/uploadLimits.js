const MIN_UPLOAD_SIZE_BYTES = 100 * 1024;
const MAX_UPLOAD_SIZE_BYTES = 500 * 1024;
const UPLOAD_SIZE_ERROR = 'File size must be between 100 KB and 500 KB.';

const isValidUploadSize = (fileSize) =>
    Number.isInteger(fileSize) &&
    fileSize >= MIN_UPLOAD_SIZE_BYTES &&
    fileSize <= MAX_UPLOAD_SIZE_BYTES;

module.exports = {
    MIN_UPLOAD_SIZE_BYTES,
    MAX_UPLOAD_SIZE_BYTES,
    UPLOAD_SIZE_ERROR,
    isValidUploadSize,
};
