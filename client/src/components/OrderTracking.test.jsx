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
  tracking_number: '9801234567',
  payment_status: 'pending',
  delivery_preference: 'hand-to-me',
  seller_contact_numbers: '9812345678',
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
  expect(screen.getByText('9801234567')).toBeInTheDocument();
  expect(screen.getAllByText('Hand it to me')).toHaveLength(2);
  expect(screen.queryByRole('link', { name: '9812345678' })).not.toBeInTheDocument();
  const actionButtons = Array.from(document.querySelector('.ot-action-stack').querySelectorAll('button'));
  expect(actionButtons.map((button) => button.textContent.trim())).toEqual([
    'View Order Invoice',
    'Contact Support',
    'Cancel Order',
  ]);
  expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Contact Support' }));
  expect(screen.getByRole('dialog', { name: 'Contact Support' })).toBeInTheDocument();
  expect(screen.getByText('Call this number:')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '9812345678' })).toHaveAttribute('href', 'tel:9812345678');
  fireEvent.click(screen.getByRole('button', { name: 'Close contact support' }));
  expect(screen.queryByRole('dialog', { name: 'Contact Support' })).not.toBeInTheDocument();
  expect(screen.getByText('Package Received')).toBeInTheDocument();
  expect(screen.getByText('Package Received', { selector: '.ot-step-label' }).parentElement).toHaveTextContent('Upcoming');
  expect(screen.getByRole('button', { name: 'Track Package' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back to home' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Additional Information' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Back to home' }));
  expect(screen.getByText('Home screen')).toBeInTheDocument();
});

test('keeps cash received pending after delivery until payment is recorded', async () => {
  const deliveredOrder = {
    ...order,
    status: 'delivered',
    payment_status: 'pending',
  };
  global.fetch.mockImplementation((url) => Promise.resolve({
    ok: true,
    json: async () => (url.endsWith('/api/orders/mine')
      ? [deliveredOrder]
      : { notifications: [], unreadCount: 0 }),
  }));

  render(
    <MemoryRouter initialEntries={['/order-tracking']}>
      <Routes>
        <Route path="/order-tracking" element={<OrderTracking />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-12' });
  expect(screen.getByText('Delivered', { selector: '.ot-step-label' }).parentElement).toHaveTextContent('In progress');
  expect(screen.getByText('Package Received', { selector: '.ot-step-label' }).parentElement).toHaveTextContent('Upcoming');
});

test('completes the final milestone after cash is recorded', async () => {
  const paidOrder = {
    ...order,
    status: 'cash_received',
    payment_status: 'paid',
  };
  global.fetch.mockImplementation((url) => Promise.resolve({
    ok: true,
    json: async () => (url.endsWith('/api/orders/mine')
      ? [paidOrder]
      : { notifications: [], unreadCount: 0 }),
  }));

  render(
    <MemoryRouter initialEntries={['/order-tracking']}>
      <Routes>
        <Route path="/order-tracking" element={<OrderTracking />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-12' });
  expect(screen.getByText('Package Received', { selector: '.ot-step-label' }).parentElement).toHaveTextContent('Completed');
  expect(screen.getByText('Delivered', { selector: '.ot-step-label' }).parentElement).toHaveTextContent('Completed');
});

test('allows the buyer to update their delivery preference', async () => {
  const receivedOrder = {
    ...order,
    status: 'cash_received',
  };
  global.fetch.mockImplementation((url, options) => {
    if (url.endsWith('/delivery-preference')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          delivery_preference: JSON.parse(options.body).delivery_preference,
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => (url.endsWith('/api/orders/mine') ? [receivedOrder] : { notifications: [], unreadCount: 0 }),
    });
  });

  render(
    <MemoryRouter initialEntries={['/order-tracking']}>
      <Routes>
        <Route path="/order-tracking" element={<OrderTracking />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-12' });
  const preferenceSelect = screen.getByRole('combobox', { name: 'Delivery Preference' });
  expect(preferenceSelect).toBeEnabled();
  fireEvent.change(preferenceSelect, {
    target: { value: 'doorstep' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save preference' }));

  expect(await screen.findByText('Delivery preference updated.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/orders/12/delivery-preference',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ delivery_preference: 'doorstep' }),
    })
  );
});

test('shows cancellation beside support but disables it after delivery', async () => {
  const deliveredOrder = {
    ...order,
    status: 'delivered',
  };
  global.fetch.mockImplementation((url) => Promise.resolve({
    ok: true,
    json: async () => (url.endsWith('/api/orders/mine')
      ? [deliveredOrder]
      : { notifications: [], unreadCount: 0 }),
  }));

  render(
    <MemoryRouter initialEntries={['/order-tracking']}>
      <Routes>
        <Route path="/order-tracking" element={<OrderTracking />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-12' });
  expect(screen.getByRole('button', { name: 'Cancel Order' })).toBeDisabled();
  expect(screen.getByText('Orders can only be cancelled before delivery.')).toBeInTheDocument();
});

test('cancels an active order and shows the one-week ordering suspension', async () => {
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  const suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  global.fetch.mockImplementation((url) => {
    if (url.endsWith('/cancel')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          status: 'cancelled',
          suspended_until: suspendedUntil,
          message: 'Order cancelled. You cannot place another order for one week.',
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => (url.endsWith('/api/orders/mine') ? [order] : { notifications: [], unreadCount: 0 }),
    });
  });

  render(
    <MemoryRouter initialEntries={['/order-tracking']}>
      <Routes>
        <Route path="/order-tracking" element={<OrderTracking />} />
      </Routes>
    </MemoryRouter>
  );

  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-12' });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel Order' }));
  expect(await screen.findByText('Order cancelled. You cannot place another order for one week.')).toBeInTheDocument();
  expect(screen.getByText(/Ordering is temporarily paused until/)).toBeInTheDocument();
  expect(window.confirm).toHaveBeenCalledWith(
    'Cancel this order? You will not be able to place another order for one week.'
  );
  expect(global.fetch).not.toHaveBeenCalledWith(
    expect.stringContaining('/cancellation-fee/proof'),
    expect.anything()
  );
});

test('shows an existing one-week suspension after reloading order tracking', async () => {
  const suspendedOrder = {
    ...order,
    status: 'cancelled',
    buyer_suspended_until: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  };
  global.fetch.mockImplementation((url) => Promise.resolve({
    ok: true,
    json: async () => (url.endsWith('/api/orders/mine')
      ? [suspendedOrder]
      : { notifications: [], unreadCount: 0 }),
  }));

  render(
    <MemoryRouter initialEntries={['/order-tracking']}>
      <Routes>
        <Route path="/order-tracking" element={<OrderTracking />} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-12' });
  await screen.findByRole('heading', { name: 'Order Tracking: #ILLAM-12' });
  expect(screen.getByText(/Ordering is temporarily paused until/)).toBeInTheDocument();
  expect(screen.queryByLabelText('Upload payment proof')).not.toBeInTheDocument();
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
