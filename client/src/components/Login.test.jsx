import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

test('remember me keeps the login token after the browser session', async () => {
  localStorage.clear();
  sessionStorage.clear();
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      token: 'remembered-token',
      user: { id: 8, role: 'buyer', email: 'buyer@example.com' },
    }),
  });

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByPlaceholderText('enter your email address'), {
    target: { value: 'buyer@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
    target: { value: 'secret123' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: 'Remember me' }));
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  try {
    await waitFor(() => expect(localStorage.getItem('token')).toBe('remembered-token'));
    expect(localStorage.getItem('rememberedEmail')).toBe('buyer@example.com');
    expect(sessionStorage.getItem('token')).toBeNull();
  } finally {
    global.fetch = originalFetch;
  }
});

test('pre-fills the saved email and checks remember me on the next visit', () => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('rememberedEmail', 'buyer@example.com');

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

  expect(screen.getByPlaceholderText('enter your email address')).toHaveValue('buyer@example.com');
  expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeChecked();
});

test('login without remember me keeps its token only for the current browser session', async () => {
  localStorage.clear();
  sessionStorage.clear();
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      token: 'session-token',
      user: { id: 8, role: 'buyer', email: 'buyer@example.com' },
    }),
  });

  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByPlaceholderText('enter your email address'), {
    target: { value: 'buyer@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
    target: { value: 'secret123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  try {
    await waitFor(() => expect(sessionStorage.getItem('token')).toBe('session-token'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('rememberedEmail')).toBeNull();
  } finally {
    global.fetch = originalFetch;
  }
});
