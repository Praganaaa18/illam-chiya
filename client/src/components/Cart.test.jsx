import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Cart from './Cart';

jest.mock('./Notificationbell', () => () => null);

const cartItems = [
  { id: 1, name: 'Milk Tea', price: 25, quantity: 2, pack_size: '100 g', stock_quantity: 10 },
  { id: 2, name: 'Oolong Tea', price: 450, quantity: 3, pack_size: '180 g', stock_quantity: 10 },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('token', 'buyer-token');
  localStorage.setItem('userRole', 'buyer');
  localStorage.setItem('cart', JSON.stringify(cartItems));
});

afterEach(() => {
  localStorage.clear();
});

test('allows choosing specific cart items and updates checkout totals', () => {
  render(
    <MemoryRouter>
      <Cart />
    </MemoryRouter>
  );

  expect(screen.getByText('Rs. 1400')).toBeInTheDocument();
  expect(screen.getByText('Rs. 1520')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Select Milk Tea for order' }));

  expect(screen.getAllByText('Rs. 1350')).not.toHaveLength(0);
  expect(screen.getByText('Rs. 1470')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Select Oolong Tea for order' }));
  expect(screen.getAllByText('Rs. 0').length).toBeGreaterThan(0);
  expect(screen.getByRole('button', { name: 'Proceed to Checkout' })).toBeDisabled();
});

test('caps cart quantity at available stock and disables increase at the limit', () => {
  render(
    <MemoryRouter>
      <Cart />
    </MemoryRouter>
  );

  const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity for Milk Tea' });
  fireEvent.change(quantityInput, { target: { value: '12' } });

  expect(quantityInput).toHaveValue(10);
  expect(screen.getByRole('button', { name: 'Increase quantity for Milk Tea' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('Quantity capped at available stock (10).');
  expect(JSON.parse(localStorage.getItem('cart'))[0].quantity).toBe(10);
});
