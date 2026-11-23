import React, { useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { isValidEmail } from '../utils/validation';
import { saveAuthToken } from '../utils/authStorage';
import Icon from './Icon';
import './Login.css';

const Login = () => {
  const location = useLocation();
  const [role, setRole] = useState(() => (location.state?.role === 'seller' ? 'seller' : 'buyer'));
  const [email, setEmail] = useState(() => localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('rememberedEmail')));

  // Field validation errors & general submission errors
  const [validationErrors, setValidationErrors] = useState({});
  const [error, setError] = useState(location.state?.message || '');
  const [loading, setLoading] = useState(false);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const navigate = useNavigate();

  // Validate form inputs before sending to server
  const validateForm = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!isValidEmail(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Trigger validation
    if (!validateForm()) {
      if (!email.trim()) {
        emailInputRef.current?.focus();
      } else if (!isValidEmail(email)) {
        emailInputRef.current?.focus();
      } else if (!password) {
        passwordInputRef.current?.focus();
      } else if (password.length < 6) {
        passwordInputRef.current?.focus();
      }
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (rememberMe) localStorage.setItem('rememberedEmail', normalizedEmail);
    else localStorage.removeItem('rememberedEmail');

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password.');
      }
      const accountRole = data.user?.role;
      if (!['buyer', 'seller'].includes(accountRole)) {
        throw new Error('This account does not have a supported portal.');
      }

      saveAuthToken(data.token, rememberMe);
      localStorage.setItem('userRole', accountRole);
      localStorage.setItem('userId', data.user?.id);
      localStorage.setItem('userName', data.user?.name || data.user?.email || 'User');
      localStorage.setItem('userEmail', data.user?.email || '');
      localStorage.setItem('userPhone', data.user?.phone || '');
      localStorage.setItem('userAddress', data.user?.address || '');

      if (accountRole === 'seller') {
        navigate('/seller/dashboard');
      } else {
        navigate('/'); // Home / Buyer Marketplace
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Aesthetic Top-Right "Back to Home" Arrow Button */}
      <Link to="/" className="back-home-link" aria-label="Back to Home">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Home</span>
      </Link>

      {/* Top Branding & Role Switcher */}
      <div className="login-header">
        <div className="brand-logo">
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2d5a43"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 9 0 5-4 9-10 9z" />
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
          </svg>
          <h1> Ilam Chiya </h1>
        </div>

        <div className="role-selector">
          <span className="role-selector-label">I am a:</span>
          <button
            type="button"
            className={`role-btn ${role === 'buyer' ? 'active' : ''}`}
            aria-pressed={role === 'buyer'}
            onClick={() => {
              setRole('buyer');
              setValidationErrors({});
              setError('');
            }}>
            Buyer
          </button>
          <span className="divider">|</span>
          <button
            type="button"
            className={`role-btn ${role === 'seller' ? 'active' : ''}`}
            aria-pressed={role === 'seller'}
            onClick={() => {
              setRole('seller');
              setValidationErrors({});
              setError('');
            }}>
            Seller
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="login-card">
        <h2 className="login-title">{role === 'buyer' ? 'Buyer Portal' : 'Seller Portal'}</h2>
        <p className="login-subtitle">
          {role === 'buyer'
            ? 'Sign in to explore teas, add items to cart, and place orders'
            : 'Sign in to manage your tea inventory, listings, and sales'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <div className={`input-wrapper ${validationErrors.email ? 'input-error' : ''}`}>
              <input
                id="login-email"
                ref={emailInputRef}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) setValidationErrors({ ...validationErrors, email: '' });
                }}
                placeholder="enter your email address"
              />
              <svg
                className="input-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7a8b7b"
                strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            {validationErrors.email && <span className="field-error-message">{validationErrors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className={`input-wrapper ${validationErrors.password ? 'input-error' : ''}`}>
              <input
                id="login-password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) setValidationErrors({ ...validationErrors, password: '' });
                }}
                placeholder="••••••••••••"
              />
              <button
                type="button"
                className="password-visibility-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
              </button>
            </div>
            {validationErrors.password && <span className="field-error-message">{validationErrors.password}</span>}
          </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => {
                  setRememberMe(event.target.checked);
                  if (!event.target.checked) localStorage.removeItem('rememberedEmail');
                }}
              />
              <span>Remember me</span>
            </label>
            <Link to="/password-recovery" className="forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>

          <p className="register-footer">
            Don't have an account?{' '}
            <Link to={role === 'buyer' ? '/register-buyer' : '/register-seller'} className="register-link">
              Register as {role === 'buyer' ? 'Buyer' : 'Seller'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
