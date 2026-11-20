import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useSearchParams } from 'react-router';
import NotificationBell from './Notificationbell';

const notification = {
  id: 8,
  title: 'Your order is on the way',
  message: 'Order #12 is now shipped.',
  link: '/order-tracking?orderId=12',
  is_read: 0,
  created_at: '2026-11-20T08:00:00.000Z',
};

const response = (data) => ({
  ok: true,
  json: async () => data,
});

const TrackingPage = () => {
  const [searchParams] = useSearchParams();
  return <p>Tracking order {searchParams.get('orderId')}</p>;
};

const SellerOrdersPage = () => {
  const [searchParams] = useSearchParams();
  return <p>Seller tab {searchParams.get('tab')}</p>;
};

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  localStorage.setItem('token', 'buyer-token');
  localStorage.setItem('userRole', 'buyer');
  global.fetch = jest.fn((url) => {
    if (url.endsWith('/mine')) {
      return Promise.resolve({ ...response({ notifications: [notification], unreadCount: 1 }) });
    }
    return Promise.resolve(response({ success: true }));
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.clear();
});

test('shows buyer updates and marks an item read before navigating to its order', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<NotificationBell role="buyer" />} />
        <Route path="/order-tracking" element={<TrackingPage />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Notifications (1 unread)' }));
  const update = await screen.findByRole('button', { name: /Your order is on the way/ });
  fireEvent.click(update);

  expect(await screen.findByText('Tracking order 12')).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/notifications/8/read',
    expect.objectContaining({
      method: 'PATCH',
      headers: { Authorization: 'Bearer buyer-token' },
    })
  ));
});

test('opens seller order notifications in the orders dashboard tab', async () => {
  localStorage.setItem('token', 'seller-token');
  localStorage.setItem('userRole', 'seller');
  global.fetch = jest.fn((url) => Promise.resolve(response(url.endsWith('/mine')
    ? {
      notifications: [{
        ...notification,
        id: 9,
        title: 'New order received',
        link: '/seller/dashboard?tab=orders',
      }],
      unreadCount: 1,
    }
    : { success: true })));

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<NotificationBell role="seller" />} />
        <Route path="/seller/dashboard" element={<SellerOrdersPage />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Notifications (1 unread)' }));
  fireEvent.click(await screen.findByRole('button', { name: /New order received/ }));

  expect(await screen.findByText('Seller tab orders')).toBeInTheDocument();
});

test('refreshes notifications when the user returns to the tab', async () => {
  render(
    <MemoryRouter>
      <NotificationBell role="buyer" />
    </MemoryRouter>
  );

  await screen.findByRole('button', { name: 'Notifications (1 unread)' });
  fireEvent.focus(window);

  await waitFor(() => {
    expect(global.fetch.mock.calls.filter(([url]) => url.endsWith('/mine'))).toHaveLength(2);
  });
});
