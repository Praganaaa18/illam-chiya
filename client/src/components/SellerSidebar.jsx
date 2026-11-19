import React from 'react';

const SellerSidebar = ({ activeTab, onTabChange, onLogout }) => {
  const tabs = [
    ['overview', '📊 Dashboard Overview'],
    ['products', '🍃 Product Management'],
    ['inventory', '📋 Inventory Management'],
    ['orders', '📦 Orders & Shipping'],
    ['billing', '💳 Billings & Payouts'],
    ['settings', '⚙️ Farm Settings'],
  ];

  return (
    <aside className="matcha-sidebar">
      <div className="brand-logo-section">
        <h2>🍵 Illam Chiya</h2>
        <span className="seller-badge">Seller Portal</span>
      </div>

      <nav className="sidebar-nav" aria-label="Seller navigation">
        {tabs.map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            className={`nav-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" onClick={onLogout} className="logout-btn">
          🚪 Logout
        </button>
      </div>
    </aside>
  );
};

export default SellerSidebar;
