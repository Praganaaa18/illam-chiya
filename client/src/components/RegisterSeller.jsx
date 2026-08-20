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
    confirmPassword: ''
  });

  const [documentFile, setDocumentFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setDocumentFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.trim() !== formData.confirmPassword.trim()) {
      return setError('Passwords do not match.');
    }

    if (!documentFile) {
      return setError('Please upload your business registration or PAN certificate.');
    }

    setLoading(true);

    try {
      // Send multipart/form-data for file handling
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
        body: dataPayload // Browser sets multipart boundary header automatically
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
                required
              />
            </div>
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

          <div className="form-row">
            <div className="form-group">
              <label>Create Password</label>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
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