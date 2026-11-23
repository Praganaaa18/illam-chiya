import { render, screen } from '@testing-library/react';
import App from './App';

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{
      id: 1,
      name: 'Test Tea',
      category: 'Test',
      description: 'Test product',
      price: 100,
      stock_quantity: 1,
      pack_size: '100 g',
      image_url: '',
      is_active: 1,
    }],
  });
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('renders the Illam Chiya storefront', async () => {
  render(<App />);
  expect(screen.getByText('Products')).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Test Tea' })).toBeInTheDocument();
});
