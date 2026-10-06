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

  const [certificates, setCertificates] = useState([
    { id: 1, name: 'Organic Organic Farming Cert.pdf', status: 'Verified' },
    { id: 2, name: 'Nepal Tea Board License.pdf', status: 'Verified' }
  ]);

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
        <h2>⚙️ Farm Settings</h2>
        <p>Manage your tea estate profile, official contact details, and compliance certificates.</p>
      </div>

      {message && <div className="settings-alert-banner">{message}</div>}

      <form onSubmit={handleSaveSettings} className="settings-form">
        {/* SECTION 1: ESTATE PROFILE */}
        <div className="settings-section">
          <h3>🏡 Estate Profile</h3>
          
          <div className="form-group">
            <label>Tea Estate / Business Name</label>
            <input
              type="text"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Estate Bio & Description</label>
            <textarea
              name="teaEstateBio"
              rows="4"
              value={formData.teaEstateBio}
              onChange={handleChange}
              placeholder="Describe your tea estate, altitude, and harvesting practices..."
            ></textarea>
          </div>
        </div>

        {/* SECTION 2: CONTACT & LOCATION */}
        <div className="settings-section">
          <h3>📞 Contact & Location</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Estate Address</label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* SECTION 3: LEGAL & CERTIFICATES */}
        <div className="settings-section">
          <h3>📜 Registration & Verification Documents</h3>

          <div className="form-group">
            <label>Business Registration Number</label>
            <input
              type="text"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Uploaded Certificates</label>
            <div className="certificate-list">
              {certificates.map((cert) => (
                <div key={cert.id} className="certificate-item">
                  <span className="cert-name">📄 {cert.name}</span>
                  <span className="cert-badge">{cert.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Upload New Certificate / License</label>
            <input type="file" className="file-input-field" accept=".pdf,.png,.jpg" />
            <small className="help-text">Accepted formats: PDF, JPG, PNG (Max 5MB)</small>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="form-actions">
          <button type="submit" className="save-btn" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FarmSettings;