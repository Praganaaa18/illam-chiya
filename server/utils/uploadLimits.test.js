const assert = require('node:assert/strict');
const test = require('node:test');
const {
    isValidUploadSize,
    MAX_UPLOAD_SIZE_BYTES,
    MIN_UPLOAD_SIZE_BYTES,
} = require('./uploadLimits');

test('accepts upload sizes at the 100 KB and 500 KB boundaries', () => {
    assert.equal(isValidUploadSize(MIN_UPLOAD_SIZE_BYTES), true);
    assert.equal(isValidUploadSize(MAX_UPLOAD_SIZE_BYTES), true);
});

test('rejects upload sizes outside the 100 KB to 500 KB range', () => {
    assert.equal(isValidUploadSize(MIN_UPLOAD_SIZE_BYTES - 1), false);
    assert.equal(isValidUploadSize(MAX_UPLOAD_SIZE_BYTES + 1), false);
});
