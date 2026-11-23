import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RegisterBuyer from './RegisterBuyer';
import RegisterSeller from './RegisterSeller';

let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;
  global.fetch = jest.fn();
});

afterEach(() => {
  global.fetch = originalFetch;
});

test('blocks buyer registration with an invalid email address', async () => {
  render(
    <MemoryRouter>
      <RegisterBuyer />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByPlaceholderText('jane.cooper@email.com'), { target: { value: 'bad-email' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create my Account' }));

  expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test('blocks seller registration with a non-nine-digit PAN', async () => {
  render(
    <MemoryRouter>
      <RegisterSeller />
    </MemoryRouter>
  );

  fireEvent.change(screen.getByPlaceholderText('e.g. 600123456'), { target: { value: '12345' } });
  fireEvent.click(screen.getByRole('button', { name: 'Register as Seller' }));

  expect(await screen.findByText('Enter a valid 9-digit PAN / VAT number.')).toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each([
  ['buyer', RegisterBuyer, 'Show password', 'Hide password'],
  ['seller', RegisterSeller, 'Show password', 'Hide password'],
])('%s registration toggles password visibility', (role, RegistrationPage, showLabel, hideLabel) => {
  render(
    <MemoryRouter>
      <RegistrationPage />
    </MemoryRouter>
  );

  const passwordInput = screen.getAllByPlaceholderText(
    role === 'buyer' ? '••••••••••••' : '••••••••'
  )[0];
  fireEvent.change(passwordInput, { target: { value: 'secret123' } });

  fireEvent.click(screen.getByRole('button', { name: showLabel }));
  expect(passwordInput).toHaveAttribute('type', 'text');
  expect(screen.getByRole('button', { name: hideLabel })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: hideLabel }));
  expect(passwordInput).toHaveAttribute('type', 'password');
});
