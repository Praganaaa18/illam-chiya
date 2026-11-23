import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import './Login.css';

const PasswordRecovery = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!token && !email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (token && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (token && password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/auth/${token ? 'reset-password' : 'forgot-password'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(token ? { token, password } : { email: email.trim().toLowerCase() }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Password recovery failed.');
      setMessage(data.message);
    } catch (requestError) {
      setError(requestError.message || 'Password recovery failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page recovery-page">
      <div className="login-header">
        <div className="brand-logo">
          <h1>Illam Chiya</h1>
        </div>
      </div>
      <section className="login-card recovery-card">
        <h2 className="login-title">{token ? 'Reset your password' : 'Forgot your password?'}</h2>
        <p className="login-subtitle">
          {token
            ? 'Choose a new password for your account.'
            : 'Enter your account email and we will send you a secure reset link.'}
        </p>

        {error && <div className="error-message" role="alert">{error}</div>}
        {message && <div className="recovery-message" role="status">{message}</div>}

        {!message && (
          <form onSubmit={handleSubmit} noValidate>
            {!token ? (
              <div className="form-group">
                <label htmlFor="recovery-email">Email Address</label>
                <div className="input-wrapper">
                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="new-password">New Password</label>
                  <div className="input-wrapper">
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm New Password</label>
                  <div className="input-wrapper">
                    <input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={6}
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Please wait...' : token ? 'Reset Password' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="register-footer">
          <Link to="/login" className="register-link">Back to Log In</Link>
        </p>
      </section>
    </main>
  );
};

export default PasswordRecovery;
