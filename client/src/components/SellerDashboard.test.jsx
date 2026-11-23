import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import axios from 'axios';
import SellerDashboard from './SellerDashboard';

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() } },
    get: jest.fn(),
    patch: jest.fn(),
  })),
  get: jest.fn(),
}));

jest.mock('./Notificationbell', () => () => null);

beforeEach(() => {
  localStorage.setItem('token', 'seller-token');
  localStorage.setItem('userId', '5');
  axios.get.mockImplementation((url) => {
    if (url.endsWith('/info/5')) {
      return Promise.resolve({ data: { id: 5, business_name: 'Tea Estate', is_verified: 1 } });
    }
    if (url.endsWith('/inventory')) {
      return Promise.resolve({
        data: {
          items: [
            { id: 1, name: 'Low Tea', current_stock: 10 },
            { id: 2, name: 'Out of Stock Tea', current_stock: 0 },
            { id: 3, name: 'Healthy Tea', current_stock: 11 },
            { id: 4, name: 'Reserved Low Tea', current_stock: 20, available_stock: 9 },
            { id: 5, name: 'Reserved Healthy Tea', current_stock: 8, available_stock: 11 },
          ],
          metrics: { lowStockCount: 3 },
        },
      });
    }
    return Promise.resolve({ data: [] });
  });
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

test('shows a seller dashboard alert for products with 10 or fewer units only', async () => {
  render(
    <MemoryRouter>
      <SellerDashboard />
    </MemoryRouter>
  );

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Low Stock Alert');
  expect(alert).toHaveTextContent('Low Tea: 10 units remaining');
  expect(alert).toHaveTextContent('Out of Stock Tea: 0 units remaining');
  expect(alert).toHaveTextContent('Reserved Low Tea: 9 units remaining');
  expect(alert).not.toHaveTextContent('Healthy Tea');
  expect(alert).not.toHaveTextContent('Reserved Healthy Tea');
});
