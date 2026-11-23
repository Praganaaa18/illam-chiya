import React, { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  isValidEmail,
  isValidPanNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from '../utils/validation';
import Icon from './Icon';
import { isValidUploadSize, UPLOAD_SIZE_ERROR } from '../utils/uploadLimits';
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
  const [documentError, setDocumentError] = useState('');
  const documentInputRef = useRef(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Validation rules
  const phoneCharactersRegex = /^[0-9+()\s-]*$/;
  const alphaNumericRegex = /^[a-zA-Z0-9\s,.-]*$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({ ...previous, [name]: value }));

    let err = '';
    if (name === 'email' && value.trim() && !isValidEmail(value)) {
      err = 'Enter a valid email address.';
    } else if (name === 'phone' && !phoneCharactersRegex.test(value)) {
      err = 'Enter a valid phone number.';
    } else if ((name === 'businessName' || name === 'address') && !alphaNumericRegex.test(value)) {
      err = 'Special characters (like @, #, $, %) are not allowed.';
    } else if (name === 'panVat' && !/^[0-9]*$/.test(value)) {
      err = 'PAN / VAT Number must contain digits only.';
    }

    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setError('');
    if (file && !isValidUploadSize(file.size)) {
      setDocumentFile(null);
      setDocumentError(UPLOAD_SIZE_ERROR);
      e.target.value = '';
      return;
    }

    setDocumentFile(file);
    setDocumentError('');
  };

  const discardDocumentFile = () => {
    setDocumentFile(null);
    setDocumentError('');
    if (documentInputRef.current) documentInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nextFieldErrors = {};
    if (!formData.businessName.trim() || !alphaNumericRegex.test(formData.businessName)) {
      nextFieldErrors.businessName = 'Enter a valid business or farm name.';
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
    if (!formData.address.trim() || !alphaNumericRegex.test(formData.address)) {
      nextFieldErrors.address = 'Enter a valid business address.';
    }
    if (!isValidPanNumber(formData.panVat)) {
      nextFieldErrors.panVat = 'Enter a valid 9-digit PAN / VAT number.';
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
    if (formData.password.trim() !== formData.confirmPassword.trim()) {
      return setError('Passwords do not match.');
    }

    if (!documentFile) {
      return setError(documentError || 'Please upload your business registration or PAN certificate.');
    }

    setLoading(true);

    try {
      const dataPayload = new FormData();
      dataPayload.append('full_name', formData.businessName);
      dataPayload.append('email', formData.email.trim().toLowerCase());
      dataPayload.append('phone', normalizePhoneNumber(formData.phone));
      dataPayload.append('address', formData.address);
      dataPayload.append('pan_vat', formData.panVat.trim());
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

        <form onSubmit={handleSubmit} noValidate>
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
              {fieldErrors.email && <span className="field-error-text">{fieldErrors.email}</span>}
            </div>

            <div className="form-group">
              <label>Contact Phone / eSewa Payout Number</label>
              <input
                type="tel"
                name="phone"
                placeholder="98XXXXXXXX"
                value={formData.phone}
                onChange={handleChange}
                inputMode="tel"
                maxLength="16"
                required
              />
              {fieldErrors.phone && <span className="field-error-text">{fieldErrors.phone}</span>}
              <small className="field-help-text">Use the mobile number registered to your eSewa account.</small>
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
                inputMode="numeric"
                maxLength="9"
                required
              />
              {fieldErrors.panVat && <span className="field-error-text">{fieldErrors.panVat}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="seller-certificate">Upload PAN / Registration Certificate</label>
            <div className="certificate-upload-control">
              <input
                ref={documentInputRef}
                id="seller-certificate"
                type="file"
                accept=".pdf,image/*"
                aria-describedby="seller-certificate-size"
                aria-invalid={Boolean(documentError)}
                onChange={handleFileChange}
                required
              />
              <button
                type="button"
                className="certificate-file-remove"
                aria-label={documentFile ? 'Remove selected certificate' : 'No certificate selected to remove'}
                title={documentFile ? 'Remove selected certificate' : 'No certificate selected to remove'}
                disabled={!documentFile}
                onClick={discardDocumentFile}
              >
                ×
              </button>
            </div>
            <small id="seller-certificate-size" className="certificate-upload-hint">
              Accepted file size: 100 KB–500 KB.
            </small>
            {documentError && <span className="field-error-text" role="alert">{documentError}</span>}
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
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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