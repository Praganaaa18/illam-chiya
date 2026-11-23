import { isSellerSessionError } from './sellerSession';

test('recognizes invalid, expired, and non-seller sessions', () => {
  expect(isSellerSessionError({ response: { status: 400, data: { message: 'Invalid or expired token.' } } })).toBe(true);
  expect(isSellerSessionError({ response: { status: 403, data: { error: 'Seller access is required.' } } })).toBe(true);
  expect(isSellerSessionError({ response: { status: 409, data: { error: 'Category is in use.' } } })).toBe(false);
});
