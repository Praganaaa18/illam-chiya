import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BillingsAndPayouts from './BillingsandPayouts';

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    json: async () => ({ success: true, transactions: [] }),
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('shows the seller eSewa payout number separately from platform fee payment details', async () => {
  render(<BillingsAndPayouts sellerId={17} esewaNumber="9801234567" />);

  expect(await screen.findByText('9801234567')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Settle Dues' }));

  expect(screen.getByText('Platform fee payment account')).toBeInTheDocument();
  expect(screen.getByText('Platform eSewa / Khalti ID:').parentElement).toHaveTextContent('9801234567');
});

test('shows a clear fallback when the seller profile has no phone number', async () => {
  render(<BillingsAndPayouts sellerId={17} />);

  expect(
    await screen.findByText('Add a phone number to your seller profile')
  ).toBeInTheDocument();
});
