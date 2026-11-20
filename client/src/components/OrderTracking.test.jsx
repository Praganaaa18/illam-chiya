import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import OrderTracking from './OrderTracking';

const order = {
  id: 12,
  status: 'shipped',
  created_at: '2026-01-10T12:00:00.000Z',
  seller_updated_at: '2026-01-12T12:00:00.000Z',
  carrier_name: 'Ilam Express',
  tracking_number: '001234567',
  subtotal: '25',
  total_price: '145',
  delivery_address: 'Kathmandu',
  items_summary: 'Oolong Tea (x1)',
};

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = jest.fn((url) => Promise.resolve({
    ok: true,
    json: async () => (url.endsWith('/api/orders/mine') ? [order] : { notifications: [], unreadCount: 0 }),
  }));
  localStorage.setItem('token', 'buyer-token');
  localStorage.setItem('userRole', 'buyer');
});

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.clear();
});

test('shows seller-based delivery estimate, original tracking navigation, and back arrow', async () => {
  render(
    <MemoryRouter initialEntries={['/order-tracking']}>
      <Routes>
        <Route path="/order-tracking" element={<OrderTracking />} />
        <Route path="/" element={<p>Home screen</p>} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-12' });

  const earliest = new Date(order.seller_updated_at);
  const latest = new Date(order.seller_updated_at);
  earliest.setDate(earliest.getDate() + 5);
  latest.setDate(latest.getDate() + 10);
  const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const estimate = `${earliest.toLocaleDateString(undefined, dateOptions)} – ${latest.toLocaleDateString(undefined, dateOptions)}`;

  expect(screen.getByText(estimate)).toBeInTheDocument();
  expect(screen.getByText('Ilam Express')).toBeInTheDocument();
  expect(screen.getByText('001234567')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Track Package' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back to home' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Additional Information' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
  expect(screen.getByText('Home screen')).toBeInTheDocument();
});

test('opens the order identified by a notification link', async () => {
  const secondOrder = {
    ...order,
    id: 13,
    status: 'pending',
    carrier_name: null,
    tracking_number: null,
    items_summary: 'Green Tea (x1)',
  };
  global.fetch.mockImplementation((url) => Promise.resolve({
    ok: true,
    json: async () => (url.endsWith('/api/orders/mine')
      ? [order, secondOrder]
      : { notifications: [], unreadCount: 0 }),
  }));

  render(
    <MemoryRouter initialEntries={['/order-tracking?orderId=13']}>
      <Routes>
        <Route path="/order-tracking" element={<OrderTracking />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-13' });
  expect(screen.getAllByText('Green Tea (x1)')).toHaveLength(2);
});
