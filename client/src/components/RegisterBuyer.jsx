import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { isValidEmail, isValidPhoneNumber, normalizePhoneNumber } from '../utils/validation';
import Icon from './Icon';
import './RegisterBuyer.css';

const RegisterBuyer = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    deliveryAddress: '',
    addressType: 'Home',
    gender: 'Male',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Validation rules
  const nameRegex = /^[a-zA-Z\s]*$/;
  const phoneCharactersRegex = /^[0-9+()\s-]*$/;
  const addressRegex = /^[a-zA-Z0-9\s,.-]*$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({ ...previous, [name]: value }));

    let err = '';
    if (name === 'fullName' && !nameRegex.test(value)) {
      err = 'Special characters and numbers are not allowed in Full Name.';
    } else if (name === 'email' && value.trim() && !isValidEmail(value)) {
      err = 'Enter a valid email address.';
    } else if (name === 'phone' && !phoneCharactersRegex.test(value)) {
      err = 'Enter a valid phone number.';
    } else if (name === 'deliveryAddress' && !addressRegex.test(value)) {
      err = 'Special characters (like @, #, $, %) are not allowed in Delivery Address.';
    }

    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nextFieldErrors = {};
    if (!formData.fullName.trim() || !nameRegex.test(formData.fullName)) {
      nextFieldErrors.fullName = 'Enter a valid full name.';
    }
    if (!formData.email.trim()) {
      nextFieldErrors.email = 'Email address is required.';
    } else if (!isValidEmail(formData.email)) {
      nextFieldErrors.email = 'Enter a valid email address.';
    }
    if (!formData.phone.trim()) {
      nextFieldErrors.phone = 'Phone number is required.';
    } else if (!isValidPhoneNumber(formData.phone)) {
      nextFieldErrors.phone = 'Enter a valid Nepal mobile number (10 digits).';
    }
    if (!formData.deliveryAddress.trim() || !addressRegex.test(formData.deliveryAddress)) {
      nextFieldErrors.deliveryAddress = 'Enter a valid delivery address.';
    }
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return setError('Please correct the invalid fields before submitting.');
    }

    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    if (!formData.confirmPassword) {
      return setError('Please confirm your password.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          email: formData.email.trim().toLowerCase(),
          phone: normalizePhoneNumber(formData.phone),
          delivery_address: formData.deliveryAddress,
          address_type: formData.addressType,
          gender: formData.gender,
          password: formData.password,
          role: 'buyer',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buyer-page">
      <div className="buyer-card">
        {/* Tea Leaf Header Logo */}
        <div className="card-logo">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#2d5a43" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.4 19 2c1 2 2 4.1 2 9 0 5-4 9-10 9z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        </div>

        <h2 className="card-title">Join the Tea Community</h2>
        <p className="card-subtitle">Sign up to discover and order your favorite brews.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          {/* SECTION 1: Personal & Delivery Information */}
          <div className="form-section-header">
            <h3 className="section-title">Personal & Delivery Details</h3>
            <p className="section-subtitle">Provide your contact info and primary delivery destination.</p>
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Jane Cooper"
              required
            />
            {fieldErrors.fullName && <span className="field-error-text">{fieldErrors.fullName}</span>}
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="jane.cooper@email.com"
              required
            />
            {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              inputMode="tel"
              maxLength="16"
              placeholder="e.g. 9845612375"
              required
            />
            {fieldErrors.phone && <span className="field-error-text">{fieldErrors.phone}</span>}
          </div>

          <div className="form-group">
            <label>Delivery Address</label>
            <input
              type="text"
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={handleChange}
              placeholder="e.g. Sanothimi, Bhaktapur"
              required
            />
            {fieldErrors.deliveryAddress && <span className="field-error-text">{fieldErrors.deliveryAddress}</span>}
          </div>

          {/* Row 1: Address Type & Gender */}
          <div className="form-row">
            <div className="form-group">
              <label>Address Type</label>
              <select name="addressType" value={formData.addressType} onChange={handleChange}>
                <option value="Home">Home</option>
                <option value="Office">Office</option>
              </select>
            </div>

            <div className="form-group">
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* SECTION 2: Account Security */}
          <div className="form-section-header">
            <h3 className="section-title">Account Security</h3>
            <p className="section-subtitle">Set up a strong password to safeguard your account.</p>
          </div>

          {/* Row 2: Create Password & Confirm Password */}
          <div className="form-row">
            <div className="form-group">
              <label>Create Password</label>
              <div className="input-with-icon">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-with-icon">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Icon name={showConfirmPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create my Account'}
          </button>

          <p className="card-footer">
            Already have an account? <Link to="/login" className="login-link">Log In</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterBuyer;