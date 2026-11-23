import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Home from './Home';

const products = [
  {
    id: 1,
    name: 'First Flush',
    category: 'Orthodox Tea',
    description: 'Light floral tea',
    process_type: 'Orthodox',
    price: '450',
    stock_quantity: 12,
    pack_size: '100 g',
    image_url: '',
    is_active: 1,
  },
  {
    id: 2,
    name: 'Green Sencha',
    category: 'Green Tea',
    description: 'Fresh green tea',
    process_type: 'Green',
    price: '550',
    stock_quantity: 8,
    pack_size: '250 g',
    image_url: '',
    is_active: 1,
  },
];

let originalFetch;
let originalScrollIntoView;

beforeEach(() => {
  originalFetch = global.fetch;
  originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => products,
  });
  localStorage.clear();
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalScrollIntoView) {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  } else {
    delete HTMLElement.prototype.scrollIntoView;
  }
  localStorage.clear();
});

const renderHome = () => render(
  <MemoryRouter>
    <Home />
  </MemoryRouter>
);

test('shows the Products heading and category filter', async () => {
  renderHome();

  expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'First Flush' })).toBeInTheDocument();
  expect(screen.queryByText('Browse by category')).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'Filter products by category' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Product pagination' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Go to page 1' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'View All Teas' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Green Sencha' })).toBeInTheDocument();
});

test('filters products while typing and changing the category filter', async () => {
  renderHome();

  await screen.findByRole('heading', { name: 'First Flush' });
  const categoryFilter = screen.getByRole('combobox', { name: 'Filter products by category' });
  fireEvent.change(categoryFilter, {
    target: { value: 'Green' },
  });

  expect(screen.getByRole('heading', { name: 'Green Sencha' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'First Flush' })).not.toBeInTheDocument();

  fireEvent.change(categoryFilter, {
    target: { value: 'Orthodox Tea' },
  });

  expect(screen.getByRole('heading', { name: 'First Flush' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Green Sencha' })).not.toBeInTheDocument();
});

test('shows products under matching category search suggestions', async () => {
  renderHome();

  await screen.findByRole('heading', { name: 'First Flush' });
  fireEvent.click(screen.getByRole('button', { name: 'Open search' }));
  const searchInput = screen.getByRole('searchbox', { name: 'Search products and categories' });
  fireEvent.change(searchInput, {
    target: { value: 'O' },
  });
  expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  fireEvent.change(searchInput, {
    target: { value: 'Orthodox' },
  });

  expect(await screen.findByRole('dialog', { name: 'Search suggestions' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Orthodox Tea Category' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'First Flush 100 g' }));

  expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'First Flush' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Green Sencha' })).not.toBeInTheDocument();
});

test('paginates product results in groups of five', async () => {
  const manyProducts = Array.from({ length: 10 }, (_, index) => ({
    ...products[1],
    id: index + 1,
    name: `Tea ${index + 1}`,
  }));
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => manyProducts,
  });

  renderHome();

  expect(await screen.findByRole('heading', { name: 'Tea 1' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tea 5' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tea 6' })).not.toBeInTheDocument();
  expect(screen.getByText('Showing 1–5 of 10 products')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));

  expect(await screen.findByRole('heading', { name: 'Tea 6' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Tea 10' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Tea 1' })).not.toBeInTheDocument();
  expect(screen.getByText('Showing 6–10 of 10 products')).toBeInTheDocument();
});
