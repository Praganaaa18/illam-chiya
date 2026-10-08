import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './RegisterSeller.css';

const RegisterSeller = () => {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    address: '',
    panVat: '',
    password: '',
    confirmPassword: '',
  });

  const [documentFile, setDocumentFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Validation rules
  const phoneRegex = /^[0-9]*$/;
  const alphaNumericRegex = /^[a-zA-Z0-9\s,.-]*$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    let err = '';
    if (name === 'phone' && !phoneRegex.test(value)) {
      err = 'Special characters and letters are not allowed in Contact Phone.';
    } else if ((name === 'businessName' || name === 'address') && !alphaNumericRegex.test(value)) {
      err = 'Special characters (like @, #, $, %) are not allowed.';
    } else if (name === 'panVat' && !alphaNumericRegex.test(value)) {
      err = 'Special characters are not allowed in PAN / VAT Number.';
    }

    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleFileChange = (e) => {
    setDocumentFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check if any field has validation errors
    const hasErrors = Object.values(fieldErrors).some((err) => err !== '');
    if (hasErrors) {
      return setError('Please correct the invalid fields before submitting.');
    }

    if (formData.password.trim() !== formData.confirmPassword.trim()) {
      return setError('Passwords do not match.');
    }

    if (!documentFile) {
      return setError('Please upload your business registration or PAN certificate.');
    }

    setLoading(true);

    try {
      const dataPayload = new FormData();
      dataPayload.append('full_name', formData.businessName);
      dataPayload.append('email', formData.email);
      dataPayload.append('phone', formData.phone);
      dataPayload.append('address', formData.address);
      dataPayload.append('pan_vat', formData.panVat);
      dataPayload.append('password', formData.password);
      dataPayload.append('role', 'seller');
      dataPayload.append('document', documentFile);

      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        body: dataPayload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Seller registration failed.');
      }

      navigate('/login');
    } catch (err) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="seller-register-container">
      <div className="seller-register-card">
        <div className="header-section">
          <h2>Join as a Tea Seller</h2>
          <p>Register your farm or business to connect with buyers.</p>
        </div>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: Business Profile */}
          <div className="form-section-header">
            <h3 className="section-title">Business & Contact Info</h3>
            <p className="section-subtitle">Basic details regarding your tea farm or business enterprise.</p>
          </div>

          <div className="form-group">
            <label>Business / Farm Name</label>
            <input
              type="text"
              name="businessName"
              placeholder="e.g. Illam Premium Tea Estate"
              value={formData.businessName}
              onChange={handleChange}
              required
            />
            {fieldErrors.businessName && <span className="field-error-text">{fieldErrors.businessName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="seller@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="tel"
                name="phone"
                placeholder="98XXXXXXXX"
                value={formData.phone}
                onChange={handleChange}
                maxLength="10"
                required
              />
              {fieldErrors.phone && <span className="field-error-text">{fieldErrors.phone}</span>}
            </div>
          </div>

          {/* SECTION 2: Legal Verification */}
          <div className="form-section-header">
            <h3 className="section-title">Legal Verification</h3>
            <p className="section-subtitle">Required for business validation and payout routing.</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Business Address</label>
              <input
                type="text"
                name="address"
                placeholder="e.g. Kanyam, Illam"
                value={formData.address}
                onChange={handleChange}
                required
              />
              {fieldErrors.address && <span className="field-error-text">{fieldErrors.address}</span>}
            </div>

            <div className="form-group">
              <label>PAN / VAT Number</label>
              <input
                type="text"
                name="panVat"
                placeholder="e.g. 600123456"
                value={formData.panVat}
                onChange={handleChange}
                required
              />
              {fieldErrors.panVat && <span className="field-error-text">{fieldErrors.panVat}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Upload PAN / Registration Certificate</label>
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              required
            />
          </div>

          {/* SECTION 3: Account Security */}
          <div className="form-section-header">
            <h3 className="section-title">Account Credentials</h3>
            <p className="section-subtitle">Password to log in to your seller account.</p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Create Password</label>
              <div className="input-with-icon">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  👁
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <div className="input-with-icon">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  👁
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Register as Seller'}
          </button>
        </form>

        <p className="login-link">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterSeller;