import React, { useState } from 'react';
import './FarmSettings.css';

const FarmSettings = ({ sellerId = 1 }) => {
  // Form State
  const [formData, setFormData] = useState({
    businessName: 'Illam Premium Organic Estate',
    teaEstateBio: 'Estate produce from high-altitude organic hills in Illam, Nepal. Producing first-flush and orthodox specialty teas.',
    contactEmail: 'seller@illamchiya.com',
    contactPhone: '+977 9801234567',
    address: 'Ilam Municipality Ward 4, Ilam, Nepal',
    registrationNumber: 'REG-ILLAM-2081-99',
  });

  const certificates = [
    { id: 1, name: 'Organic Organic Farming Cert.pdf', status: 'Verified' },
    { id: 2, name: 'Nepal Tea Board License.pdf', status: 'Verified' }
  ];

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      // API integration endpoint example:
      // await fetch(`http://localhost:5000/api/seller/${sellerId}/settings`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      
      setTimeout(() => {
        setSaving(false);
        setMessage('✨ Farm settings saved successfully!');
      }, 800);
    } catch (err) {
      console.error(err);
      setSaving(false);
      setMessage('❌ Failed to update settings.');
    }
  };

  return (
    <div className="farm-settings-container">
      <div className="settings-header">
        <div className="settings-header-icon" aria-hidden="true">⚙️</div>
        <div>
          <span className="settings-eyebrow">YOUR SELLER PROFILE</span>
          <h2>Farm Settings</h2>
          <p>Manage your tea estate profile, official contact details, and compliance certificates.</p>
        </div>
      </div>

      {message && <div className="settings-alert-banner" role="status">{message}</div>}

      <form onSubmit={handleSaveSettings} className="settings-form">
        <div className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-icon" aria-hidden="true">🏡</span>
            <div>
              <h3>Estate Profile</h3>
              <p>Introduce your farm and the tea you grow.</p>
            </div>
            <span className="settings-step">01</span>
          </div>
          
          <div className="form-group">
            <label htmlFor="farm-business-name">Tea Estate / Business Name</label>
            <input
              id="farm-business-name"
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="farm-estate-bio">Estate Bio & Description</label>
            <textarea
              id="farm-estate-bio"
              name="teaEstateBio"
              rows="4"
              value={formData.teaEstateBio}
              onChange={handleChange}
              placeholder="Describe your tea estate, altitude, and harvesting practices..."
            ></textarea>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-icon" aria-hidden="true">📞</span>
            <div>
              <h3>Contact & Location</h3>
              <p>Keep your official contact information up to date.</p>
            </div>
            <span className="settings-step">02</span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="farm-contact-email">Contact Email</label>
              <input
                id="farm-contact-email"
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="farm-contact-phone">Phone Number</label>
              <input
                id="farm-contact-phone"
                type="text"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="farm-address">Estate Address</label>
            <input
              id="farm-address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-heading">
            <span className="settings-section-icon" aria-hidden="true">📜</span>
            <div>
              <h3>Registration & Verification</h3>
              <p>Manage your business registration and compliance documents.</p>
            </div>
            <span className="settings-step">03</span>
          </div>

          <div className="form-group">
            <label htmlFor="farm-registration-number">Business Registration Number</label>
            <input
              id="farm-registration-number"
              type="text"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <span className="settings-field-label">Uploaded Certificates</span>
            <div className="certificate-list">
              {certificates.map((cert) => (
                <div key={cert.id} className="certificate-item">
                  <span className="cert-file-icon" aria-hidden="true">PDF</span>
                  <span className="cert-name">{cert.name}</span>
                  <span className="cert-badge"><span aria-hidden="true">✓</span> {cert.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="farm-certificate-upload">Upload New Certificate / License</label>
            <input id="farm-certificate-upload" type="file" className="file-input-field" accept=".pdf,.png,.jpg" />
            <small className="help-text">Accepted formats: PDF, JPG, PNG (Max 5MB)</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={saving}>
            <span aria-hidden="true">{saving ? '◌' : '✓'}</span>
            {saving ? 'Saving changes…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FarmSettings;