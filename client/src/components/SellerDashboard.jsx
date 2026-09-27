import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SellerDashboard.css';

const SellerDashboard = () => {
  // =========================================================================
  // SUBTITLE 1: STATE MANAGEMENT & ROUTING
  // =========================================================================
  // Track active tab to render corresponding view (overview, products, orders, etc.)
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dummy seller state (In production, load this from JWT/LocalStorage or backend)
  const [sellerInfo] = useState({
    businessName: "Illam Premium Organic Estate",
    email: "seller@illamchiya.com",
    isVerified: true
  });

  const navigate = useNavigate();

  // Handle seller logout action
  const handleLogout = () => {
    // Clear user tokens/session here if applicable
    localStorage.removeItem('token');
    navigate('/login');
  };

  // =========================================================================
  // SUBTITLE 2: RENDER CONTROLLER (DYNAMIC CONTENT VIEWS)
  // =========================================================================
  // Renders different content sections based on current active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewSection sellerName={sellerInfo.businessName} />;
      case 'products':
        return <ProductManagementPlaceholder />;
      case 'orders':
        return <OrdersPlaceholder />;
      case 'billing':
        return <BillingPlaceholder />;
      case 'settings':
        return <SettingsPlaceholder />;
      default:
        return <OverviewSection sellerName={sellerInfo.businessName} />;
    }
  };

  // =========================================================================
  // SUBTITLE 3: MAIN DASHBOARD LAYOUT
  // =========================================================================
  return (
    <div className="matcha-dashboard-container">
      
      {/* ---------------- SIDEBAR NAVIGATION ---------------- */}
      <aside className="matcha-sidebar">
        <div className="brand-logo-section">
          <h2>🍵 Illam Chiya</h2>
          <span className="seller-badge">Seller Portal</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Dashboard Overview
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            🍃 Product Management
          </button>

          <button 
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📦 Orders & Shipping
          </button>

          <button 
            className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            💳 Billings & Payouts
          </button>

          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Farm Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* ---------------- RIGHT CONTENT WRAPPER ---------------- */}
      <div className="matcha-main-wrapper">
        
        {/* TOP HEADER BAR */}
        <header className="matcha-topbar">
          <div className="topbar-left">
            <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
          </div>

          <div className="topbar-right">
            <span className="verification-pill">
              {sellerInfo.isVerified ? '✅ Verified Seller' : '⏳ Pending Verification'}
            </span>
            <div className="user-profile-chip">
              <div className="avatar-circle">
                {sellerInfo.businessName.charAt(0)}
              </div>
              <span className="profile-name">{sellerInfo.businessName}</span>
            </div>
          </div>
        </header>

        {/* DYNAMIC WORKSPACE CONTENT */}
        <main className="matcha-content-area">
          {renderMainContent()}
        </main>
      </div>

    </div>
  );
};

// =========================================================================
// SUBTITLE 4: MODULAR SUB-COMPONENTS (SUB-VIEWS)
// =========================================================================

// --- View 1: Overview Section ---
const OverviewSection = ({ sellerName }) => (
  <div className="view-container">
    <div className="welcome-banner">
      <h2>Welcome back, {sellerName}!</h2>
      <p>Here is an overview of your tea estate sales and active catalog.</p>
    </div>

    {/* Metric Summary Cards */}
    <div className="metrics-grid">
      <div className="metric-card">
        <span className="metric-title">Total Revenue</span>
        <h3 className="metric-value">NPR 145,200</h3>
        <span className="metric-trend positive">+12.5% this month</span>
      </div>

      <div className="metric-card">
        <span className="metric-title">Active Tea Products</span>
        <h3 className="metric-value">8 Varieties</h3>
        <span className="metric-subtext">2 out of stock</span>
      </div>

      <div className="metric-card">
        <span className="metric-title">Pending Orders</span>
        <h3 className="metric-value">14 Shipments</h3>
        <span className="metric-subtext">Requires dispatch</span>
      </div>

      <div className="metric-card">
        <span className="metric-title">Seller Rating</span>
        <h3 className="metric-value">4.9 / 5.0</h3>
        <span className="metric-subtext">Based on 86 reviews</span>
      </div>
    </div>

    {/* Recent Activity Table Placeholder */}
    <div className="dashboard-card">
      <div className="card-header">
        <h4>Recent Orders</h4>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Buyer Name</th>
            <th>Tea Variant</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>#ILLAM-1092</td>
            <td>Sujan Shrestha</td>
            <td>First Flush Orthodox (500g)</td>
            <td>NPR 2,400</td>
            <td><span className="status-badge pending">Pending Dispatch</span></td>
          </tr>
          <tr>
            <td>#ILLAM-1088</td>
            <td>Anita Rai</td>
            <td>Special White Tea (250g)</td>
            <td>NPR 1,850</td>
            <td><span className="status-badge completed">Delivered</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

// --- View 2: Product Management Placeholder ---
const ProductManagementPlaceholder = () => (
  <div className="dashboard-card placeholder-view">
    <h3>🍃 Product Management</h3>
    <p>Manage your tea inventory, add new harvests, and update prices here.</p>
    <button className="primary-matcha-btn">+ Add New Tea Variety</button>
  </div>
);

// --- View 3: Orders Placeholder ---
const OrdersPlaceholder = () => (
  <div className="dashboard-card placeholder-view">
    <h3>📦 Orders & Shipping</h3>
    <p>Track order fulfillments, print shipping slips, and view history.</p>
  </div>
);

// --- View 4: Billing Placeholder ---
const BillingPlaceholder = () => (
  <div className="dashboard-card placeholder-view">
    <h3>💳 Billings & Payouts</h3>
    <p>View bank accounts, transaction history, and direct deposit payouts.</p>
  </div>
);

// --- View 5: Settings Placeholder ---
const SettingsPlaceholder = () => (
  <div className="dashboard-card placeholder-view">
    <h3>⚙️ Farm Settings</h3>
    <p>Update tea estate bio, contact details, and certificate documents.</p>
  </div>
);

export default SellerDashboard;