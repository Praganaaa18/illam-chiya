import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ConfirmOrder from './ConfirmOrder';

jest.mock('./Navbar', () => () => null);

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: async () => ({
      full_name: 'Buyer Name',
      phone: '9800000000',
      delivery_address: 'Sanothimi Bhaktapur',
    }),
  }));
  localStorage.setItem('token', 'buyer-token');
  localStorage.setItem('userName', 'Buyer Name');
  localStorage.setItem('userPhone', '9800000000');
  localStorage.setItem('userAddress', 'Sanothimi Bhaktapur');
  localStorage.setItem('cart', JSON.stringify([{ id: 1, price: 100, quantity: 1 }]));
});

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.clear();
});

test('requires a nearby landmark before submitting an order', async () => {
  render(
    <MemoryRouter>
      <ConfirmOrder />
    </MemoryRouter>
  );

  await screen.findByLabelText('Nearby Landmark *');
  fireEvent.click(screen.getByRole('button', { name: /Confirm Order/ }));

  expect(await screen.findByText('Nearby landmark is required.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('selects the valid district found in the buyer registered address', async () => {
  render(
    <MemoryRouter>
      <ConfirmOrder />
    </MemoryRouter>
  );

  expect(await screen.findByLabelText('City / District *')).toHaveValue('Bhaktapur');
});

test('updates the district when the delivery address changes', async () => {
  render(
    <MemoryRouter>
      <ConfirmOrder />
    </MemoryRouter>
  );

  const addressInput = await screen.findByPlaceholderText('Street name, house no., landmark');
  fireEvent.change(addressInput, { target: { value: 'Ward 3, Ilam' } });

  expect(screen.getByLabelText('City / District *')).toHaveValue('Ilam');
});

test('allows editing the district field and rejects an address that repeats a district', async () => {
  render(
    <MemoryRouter>
      <ConfirmOrder />
    </MemoryRouter>
  );

  const districtInput = await screen.findByLabelText('City / District *');
  fireEvent.change(districtInput, { target: { value: 'Baitadi' } });
  expect(districtInput).toHaveValue('Baitadi');

  fireEvent.change(districtInput, { target: { value: 'Not a district' } });
  fireEvent.click(screen.getByRole('button', { name: /Confirm Order/ }));
  expect(await screen.findByText(
    'Do not include the district in the delivery address. Select it in City / District.'
  )).toBeInTheDocument();
  expect(screen.getByText('Select a valid Nepal district from the suggestions.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('rejects special characters in the delivery address', async () => {
  render(
    <MemoryRouter>
      <ConfirmOrder />
    </MemoryRouter>
  );

  const addressInput = await screen.findByPlaceholderText('Street name, house no., landmark');
  fireEvent.change(addressInput, { target: { value: 'Sanothimi @ 3' } });
  fireEvent.click(screen.getByRole('button', { name: /Confirm Order/ }));

  expect(await screen.findByText(
    'Special characters (like @, #, $, %) are not allowed in Delivery Address.'
  )).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
