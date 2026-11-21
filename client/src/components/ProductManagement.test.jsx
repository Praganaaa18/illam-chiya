import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import axios from 'axios';
import ProductManagement from './ProductManagement';

jest.mock('axios', () => ({
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

const product = {
  id: 21,
  name: 'Black Coffee',
  price: '1250.00',
  pack_size: '100 g',
  stock_quantity: 45,
  category_id: 7,
  category: 'Black Tea',
  is_active: 1,
  image_url: '',
};

const categories = [
  { id: 7, name: 'Black Tea' },
  { id: 9, name: 'Green Tea' },
];

beforeEach(() => {
  localStorage.setItem('token', 'seller-token');
  axios.get.mockImplementation((url) => Promise.resolve({
    data: url.endsWith('/categories') ? categories : [product],
  }));
  axios.patch.mockResolvedValue({ data: { is_active: 0 } });
  axios.post.mockResolvedValue({ data: { id: 22 } });
  axios.put.mockResolvedValue({ data: { id: 21 } });
  axios.delete.mockResolvedValue({ data: { message: 'Category deleted successfully.' } });
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  localStorage.clear();
});

test('shows one active/inactive switch and only one stock quantity', async () => {
  render(<ProductManagement sellerId="5" />);

  await screen.findByRole('switch', { name: 'Black Coffee active status' });

  expect(screen.getAllByRole('switch')).toHaveLength(1);
  expect(screen.getByText('45 IN STOCK')).toBeInTheDocument();
  expect(screen.getByText('100 g')).toBeInTheDocument();
  expect(screen.queryByText(/^45$/)).not.toBeInTheDocument();
});

test('the single switch updates the product status', async () => {
  render(<ProductManagement sellerId="5" />);

  const statusSwitch = await screen.findByRole('switch', { name: 'Black Coffee active status' });
  fireEvent.click(statusSwitch);

  await waitFor(() => expect(axios.patch).toHaveBeenCalledWith(
    'http://localhost:5000/api/products/21/status',
    { status: 'inactive' },
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  ));
  expect(await screen.findByText('Inactive')).toBeInTheDocument();
});

test('shows product categories and preserves the selected category when editing', async () => {
  render(<ProductManagement sellerId="5" />);

  expect(await screen.findByText('Black Tea')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: /edit/i }));

  const categoryTrigger = screen.getByRole('button', { name: /Product Category.*Black Tea/ });
  expect(categoryTrigger).toHaveTextContent('Black Tea');
  fireEvent.click(screen.getByRole('button', { name: 'Update Product' }));

  await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
    'http://localhost:5000/api/products/21',
    expect.objectContaining({ category_id: 7, pack_size: '100 g' }),
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  ));
});

test('submitting an edited product more than once sends only one update request', async () => {
  render(<ProductManagement sellerId="5" />);

  fireEvent.click(await screen.findByRole('button', { name: /edit/i }));
  const updateButton = screen.getByRole('button', { name: 'Update Product' });
  fireEvent.click(updateButton);
  fireEvent.click(updateButton);

  await waitFor(() => expect(axios.put).toHaveBeenCalledTimes(1));
  expect(axios.post).not.toHaveBeenCalled();
});

test('rejects a product image smaller than 100 KB', async () => {
  render(<ProductManagement sellerId="5" />);

  fireEvent.click(screen.getByRole('button', { name: /add new product/i }));
  const imageInput = await screen.findByLabelText('Upload product image');
  fireEvent.change(imageInput, {
    target: { files: [new File(['small'], 'small.png', { type: 'image/png' })] },
  });

  expect(screen.getByRole('alert')).toHaveTextContent('File size must be between 100 KB and 500 KB.');
  expect(screen.queryByRole('button', { name: 'Discard selected image' })).not.toBeInTheDocument();
});

test('creates a category from the product form and selects it', async () => {
  axios.post.mockResolvedValueOnce({ data: { id: 12, name: 'Herbal Tea' } });
  render(<ProductManagement sellerId="5" />);

  fireEvent.click(screen.getByRole('button', { name: /add new product/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Product Category.*Black Tea/ }));
  const categoryMenu = screen.getByRole('dialog', { name: 'Product categories' });
  const categoryActions = within(categoryMenu).getAllByRole('button');
  expect(categoryActions[0]).toHaveAccessibleName('+ Add category');
  expect(within(categoryMenu).getByText('Choose a category')).toBeInTheDocument();
  fireEvent.click(within(categoryMenu).getByRole('button', { name: '+ Add category' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'New category name' }), {
    target: { value: 'Herbal Tea' },
  });
  fireEvent.click(screen.getByRole('button', { name: '+ Add' }));

  expect(await screen.findByText('Herbal Tea added and selected.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Product Category.*Herbal Tea/ })).toBeInTheDocument();
  expect(axios.post).toHaveBeenCalledWith(
    'http://localhost:5000/api/products/categories',
    { name: 'Herbal Tea' },
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  );
});

test('returns to seller login when category creation reports missing seller access', async () => {
  const onSellerSessionError = jest.fn();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  axios.post.mockRejectedValueOnce({
    response: { status: 403, data: { error: 'Seller access is required.' } },
  });
  render(<ProductManagement sellerId="5" onSellerSessionError={onSellerSessionError} />);

  fireEvent.click(screen.getByRole('button', { name: /add new product/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Product Category.*Black Tea/ }));
  fireEvent.click(screen.getByRole('button', { name: '+ Add category' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'New category name' }), {
    target: { value: 'Herbal Tea' },
  });
  fireEvent.click(screen.getByRole('button', { name: '+ Add' }));

  await waitFor(() => expect(onSellerSessionError).toHaveBeenCalledTimes(1));
});

test('allows a custom pack size and saves its normalized value', async () => {
  render(<ProductManagement sellerId="5" />);

  fireEvent.click(screen.getByRole('button', { name: /add new product/i }));
  await screen.findByLabelText('Per Pack *');
  fireEvent.change(screen.getByLabelText('Per Pack *'), { target: { value: 'custom' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Custom pack size' }), {
    target: { value: '750g' },
  });
  fireEvent.change(screen.getByLabelText('Product Name *'), { target: { value: 'Custom Pack Tea' } });
  fireEvent.change(screen.getByLabelText('Price (Rs.) *'), { target: { value: '800' } });
  fireEvent.change(screen.getByLabelText('Stock Quantity *'), { target: { value: '10' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Product' }));

  await waitFor(() => expect(axios.post).toHaveBeenCalledWith(
    'http://localhost:5000/api/products',
    expect.objectContaining({ pack_size: '750 g', category_id: 7 }),
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  ));
});

test('surfaces the server error when deleting a category that is still assigned', async () => {
  axios.delete.mockRejectedValueOnce({
    response: { data: { error: 'This category is assigned to products.' } },
  });
  jest.spyOn(window, 'confirm').mockReturnValue(true);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<ProductManagement sellerId="5" />);

  fireEvent.click(screen.getByRole('button', { name: /add new product/i }));
  fireEvent.click(await screen.findByRole('button', { name: /Product Category.*Black Tea/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Delete Black Tea' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'This category is assigned to products.'
  );
  expect(axios.delete).toHaveBeenCalledWith(
    'http://localhost:5000/api/products/categories/7',
    expect.objectContaining({ headers: { Authorization: 'Bearer seller-token' } })
  );
});
