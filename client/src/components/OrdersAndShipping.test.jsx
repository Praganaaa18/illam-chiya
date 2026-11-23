import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import OrdersAndShipping from './OrdersAndShipping';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
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
  axios.get.mockImplementation((url) => {
    if (url.endsWith('/api/orders')) return Promise.resolve({ data: [order] });
    if (url.endsWith('/api/sellers/drivers')) {
      return Promise.resolve({ data: { drivers: ['Ram Shah', 'Ram Shahi', 'Raja Bahadur'] } });
    }
    return Promise.resolve({ data: tracking });
  });
  axios.post.mockResolvedValue({ data: { driver: { id: 8, name: 'New Driver' } } });
  axios.patch.mockResolvedValue({ data: { status: 'processing' } });
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('selecting a driver generates and saves an order-specific tracking number', async () => {
  render(<OrdersAndShipping sellerId="5" />);

  fireEvent.click(await screen.findByRole('button', { name: 'View tracking for order 22' }));
  const carrierName = await screen.findByLabelText('Carrier name');
  await waitFor(() => expect(carrierName).toBeEnabled());

  fireEvent.change(carrierName, { target: { value: 'Ram Shah' } });
  expect(screen.getByLabelText('Tracking number (generated)')).toHaveValue('IC-ORD-000022');
  fireEvent.click(screen.getByRole('button', { name: 'Update Shipment' }));

  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(
    'http://localhost:5000/api/orders/22/status',
    {
      status: 'processing',
      carrier_name: 'Ram Shah',
    },
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  ));
});

test('shows only the available drivers in the carrier dropdown', async () => {
  render(<OrdersAndShipping sellerId="5" />);

  fireEvent.click(await screen.findByRole('button', { name: 'View tracking for order 22' }));
  const carrierName = await screen.findByLabelText('Carrier name');
  await waitFor(() => expect(carrierName).toBeEnabled());

  expect(Array.from(carrierName.options).map((option) => option.value)).toEqual([
    '',
    'Ram Shah',
    'Ram Shahi',
    'Raja Bahadur',
    '__add_new_driver__',
  ]);
});

test('adds a new driver to the roster and selects it for the order', async () => {
  render(<OrdersAndShipping sellerId="5" />);

  fireEvent.click(await screen.findByRole('button', { name: 'View tracking for order 22' }));
  const carrierName = await screen.findByLabelText('Carrier name');
  await waitFor(() => expect(carrierName).toBeEnabled());

  fireEvent.change(carrierName, { target: { value: '__add_new_driver__' } });
  fireEvent.change(await screen.findByLabelText('New driver name'), {
    target: { value: 'New Driver' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Add Driver' }));

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
    'http://localhost:5000/api/sellers/drivers',
    { name: 'New Driver' },
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  ));
  await waitFor(() => expect(carrierName).toHaveValue('New Driver'));
  expect(screen.getByLabelText('Tracking number (generated)')).toHaveValue('IC-ORD-000022');

  fireEvent.click(screen.getByRole('button', { name: 'Update Shipment' }));
  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(
    'http://localhost:5000/api/orders/22/status',
    { status: 'processing', carrier_name: 'New Driver' },
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  ));
});

test('validates new driver names before saving them', async () => {
  render(<OrdersAndShipping sellerId="5" />);

  fireEvent.click(await screen.findByRole('button', { name: 'View tracking for order 22' }));
  const carrierName = await screen.findByLabelText('Carrier name');
  await waitFor(() => expect(carrierName).toBeEnabled());
  fireEvent.change(carrierName, { target: { value: '__add_new_driver__' } });

  fireEvent.change(await screen.findByLabelText('New driver name'), {
    target: { value: 'Driver #1' },
  });

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Use letters, spaces, periods, apostrophes, or hyphens only.'
  );
  expect(screen.getByRole('button', { name: 'Add Driver' })).toBeDisabled();
  expect(axios.post).not.toHaveBeenCalled();
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
