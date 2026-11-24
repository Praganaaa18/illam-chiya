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

test('omits the payout destination and shows platform fee payment details', async () => {
  render(<BillingsAndPayouts sellerId={17} />);

  await screen.findByText('Cash Ledger');
  expect(screen.queryByText('Payout destination')).not.toBeInTheDocument();
  expect(screen.queryByText('Your eSewa number')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Settle Dues' }));

  expect(screen.getByText('Platform fee payment account')).toBeInTheDocument();
  expect(screen.getByText('Platform eSewa / Khalti ID:').parentElement).toHaveTextContent('9801234567');
});
