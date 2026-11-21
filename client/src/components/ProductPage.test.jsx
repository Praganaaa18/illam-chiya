import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import ProductCard from './ProductCard';
import ProductPage from './ProductPage';

const product = {
  id: 42,
  name: 'Ilam First Flush',
  description: 'A floral spring tea.',
  price: '550.00',
  stock_quantity: 4,
  image_url: '/uploads/first-flush.jpg',
  elevation: '5,000 ft',
  process_type: 'Orthodox',
  category_id: 1,
  category: 'Orthodox Tea',
  pack_size: '500 g',
  is_active: 1,
};

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('opening a catalog product displays its details page', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [product],
  });

  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProductCard product={product} onAddToCart={jest.fn()} />} />
        <Route path="/products/:productId" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('link', { name: /view ilam first flush details and price/i }));

  expect(await screen.findByRole('heading', { name: 'Ilam First Flush' })).toBeInTheDocument();
  expect(screen.getByText('A floral spring tea.')).toBeInTheDocument();
  expect(screen.queryByText(/Seller's Business Name/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Origin:/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Type:/)).not.toBeInTheDocument();
  expect(screen.getByText(/Rs\. 550 \/ 500 g/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /back to teas/i })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    'http://localhost:5000/api/products',
    expect.objectContaining({ signal: expect.anything() })
  );
  const descriptionToggle = screen.getByRole('button', { name: /read more/i });
  expect(descriptionToggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(descriptionToggle);
  expect(screen.getByRole('button', { name: /show less/i })).toHaveAttribute('aria-expanded', 'true');

  const imageButton = screen.getByRole('button', { name: 'View larger image of Ilam First Flush' });
  fireEvent.click(imageButton);
  expect(screen.getByRole('dialog', { name: 'Ilam First Flush image viewer' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Ilam First Flush enlarged' })).toBeInTheDocument();

  fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog', { name: 'Ilam First Flush image viewer' })).not.toBeInTheDocument();
  expect(imageButton).toHaveFocus();
});

test('catalog cards show the seller-defined pack size and add it to the cart', () => {
  const onAddToCart = jest.fn();
  localStorage.setItem('token', 'buyer-token');
  localStorage.setItem('userRole', 'buyer');

  render(
    <MemoryRouter>
      <ProductCard product={product} onAddToCart={onAddToCart} />
    </MemoryRouter>
  );

  expect(screen.getByText('500 g')).toBeInTheDocument();
  expect(screen.getByText('Per Pack Size')).toBeInTheDocument();
  expect(screen.getByText('Orthodox Tea')).toBeInTheDocument();
  expect(screen.queryByText('100 g')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
  expect(onAddToCart).toHaveBeenCalledWith(
    expect.objectContaining({ pack_size: '500 g' }),
    1
  );

  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
});
