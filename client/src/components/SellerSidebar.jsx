import React from 'react';
import Icon from './Icon';

const SellerSidebar = ({ activeTab, onTabChange, onLogout }) => {
  const tabs = [
    ['overview', 'dashboard', 'Dashboard Overview'],
    ['products', 'leaf', 'Product Management'],
    ['inventory', 'inventory', 'Inventory Management'],
    ['orders', 'package', 'Orders & Shipping'],
    ['billing', 'wallet', 'Billings & Payouts'],
  ];

  return (
    <aside className="matcha-sidebar">
      <div className="brand-logo-section">
        <h2><Icon name="leaf" />Illam Chiya</h2>
        <span className="seller-badge">Seller Portal</span>
      </div>

      <nav className="sidebar-nav" aria-label="Seller navigation">
        {tabs.map(([tab, icon, label]) => (
          <button
            key={tab}
            type="button"
            className={`nav-item ${activeTab === tab ? 'active' : ''}`}
            onClick={() => onTabChange(tab)}
          >
            <Icon name={icon} size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button type="button" onClick={onLogout} className="logout-btn">
          <Icon name="logout" size={17} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default SellerSidebar;
