import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PasswordRecovery from './PasswordRecovery';

test('requests an emailed reset link for the entered email address', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      message: 'If an account exists for that email, a password reset link will be sent.',
    }),
  });

  render(
    <MemoryRouter>
      <PasswordRecovery />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText('Email Address'), {
    target: { value: ' BUYER@example.com ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

  try {
    await screen.findByRole('status');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:5000/api/auth/forgot-password',
      expect.objectContaining({
        body: JSON.stringify({ email: 'buyer@example.com' }),
      })
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('requires matching passwords before submitting a reset token', async () => {
  const originalFetch = global.fetch;
  global.fetch = jest.fn();

  render(
    <MemoryRouter initialEntries={['/password-recovery?token=valid-token']}>
      <PasswordRecovery />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText('New Password'), {
    target: { value: 'secret123' },
  });
  fireEvent.change(screen.getByLabelText('Confirm New Password'), {
    target: { value: 'different123' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

  try {
    expect(await screen.findByRole('alert')).toHaveTextContent('Passwords do not match.');
    await waitFor(() => expect(global.fetch).not.toHaveBeenCalled());
  } finally {
    global.fetch = originalFetch;
  }
});
