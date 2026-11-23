import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import Login from './Login';

test('seller login can show and hide the password', () => {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Seller' }));
  const passwordInput = screen.getByPlaceholderText('••••••••••••');
  fireEvent.change(passwordInput, { target: { value: 'secret123' } });

  fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(passwordInput).toHaveAttribute('type', 'text');
  expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
  expect(passwordInput).toHaveAttribute('type', 'password');
});
