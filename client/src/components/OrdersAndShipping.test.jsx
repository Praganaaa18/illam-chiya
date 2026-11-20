import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import OrdersAndShipping from './OrdersAndShipping';

jest.mock('axios', () => ({
  get: jest.fn(),
  patch: jest.fn(),
}));

const order = {
  id: 22,
  status: 'processing',
  buyer_name: 'Buyer Name',
  phone: '9800000000',
  delivery_address: 'Ilam',
  created_at: '2026-02-01T10:00:00.000Z',
  total_price: 500,
  items_summary: 'Tea (x1)',
};

const tracking = {
  id: 22,
  status: 'processing',
  carrier_name: null,
  tracking_number: null,
  events: [],
};

beforeEach(() => {
  localStorage.setItem('token', 'seller-token');
  localStorage.setItem('userId', '5');
  axios.get.mockImplementation((url) => (
    url.endsWith('/api/orders')
      ? Promise.resolve({ data: [order] })
      : Promise.resolve({ data: tracking })
  ));
  axios.patch.mockResolvedValue({ data: { status: 'processing' } });
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('saves carrier name and tracking number from shipment details', async () => {
  render(<OrdersAndShipping sellerId="5" />);

  fireEvent.click(await screen.findByRole('button', { name: 'View tracking for order 22' }));
  const carrierName = await screen.findByLabelText('Carrier name');
  await waitFor(() => expect(carrierName).toBeEnabled());

  fireEvent.change(carrierName, { target: { value: 'Ilam Express' } });
  fireEvent.change(screen.getByLabelText('Tracking number'), { target: { value: '+977 9801234567' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update Shipment' }));

  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(
    'http://localhost:5000/api/orders/22/status',
    {
      status: 'processing',
      carrier_name: 'Ilam Express',
      tracking_number: '9801234567',
    },
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  ));
});

test('rejects invalid tracking numbers before saving shipment details', async () => {
  render(<OrdersAndShipping sellerId="5" />);

  fireEvent.click(await screen.findByRole('button', { name: 'View tracking for order 22' }));
  const carrierName = await screen.findByLabelText('Carrier name');
  await waitFor(() => expect(carrierName).toBeEnabled());

  fireEvent.change(carrierName, { target: { value: 'Ilam Express' } });
  fireEvent.change(screen.getByLabelText('Tracking number'), { target: { value: '980123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update Shipment' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Enter a valid Nepal mobile number for the tracking number (10 digits).'
  );
  expect(axios.patch).not.toHaveBeenCalled();
});

test('opens shipment details beside the table and closes with Escape or X', async () => {
  render(<OrdersAndShipping sellerId="5" />);

  const detailsButton = await screen.findByRole('button', { name: 'View tracking for order 22' });
  fireEvent.click(detailsButton);
  await screen.findByLabelText('Shipment details for order 22');
  expect(screen.getByRole('region', { name: 'Orders and shipment workspace' })).toHaveClass('has-details');
  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByLabelText('Shipment details for order 22')).not.toBeInTheDocument();

  fireEvent.click(detailsButton);
  await screen.findByLabelText('Shipment details for order 22');
  fireEvent.click(screen.getByRole('button', { name: 'Close shipment details' }));
  expect(screen.queryByLabelText('Shipment details for order 22')).not.toBeInTheDocument();
});
