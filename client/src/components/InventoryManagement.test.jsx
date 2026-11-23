import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import API from '../services/api';
import InventoryManagement from './InventoryManagement';

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

beforeEach(() => {
  API.get.mockResolvedValue({
    data: {
      items: [
        { id: 1, name: 'Low Tea', category: 'Black Tea', current_stock: 18, available_stock: 10, status: 'Low Stock' },
        { id: 2, name: 'Healthy Tea', category: 'Green Tea', current_stock: 21, available_stock: 11, status: 'In Stock' },
      ],
      metrics: { totalStockValue: 0, lowStockCount: 1, reservedOrdersCount: 0, deliveredRevenue: 0 },
    },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('shows an inventory alert listing products with 10 or fewer available units', async () => {
  render(<InventoryManagement sellerId="5" />);

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Low Stock Alert');
  expect(alert).toHaveTextContent('Low Tea: 10 units available');
  expect(alert).not.toHaveTextContent('Healthy Tea');
});

test('dismisses the low stock alert without removing inventory data', async () => {
  render(<InventoryManagement sellerId="5" />);

  const alert = await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss low stock alert' }));

  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByText('Low Tea')).toBeInTheDocument();
});
