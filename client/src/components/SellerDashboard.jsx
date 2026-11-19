import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import ProductManagement from './ProductManagement';
import InventoryManagement from './InventoryManagement';
import OrdersAndShipping from './OrdersAndShipping';
import BillingsAndPayouts from './BillingsandPayouts';
import FarmSettings from './FarmSettings';
import './SellerDashboard.css';
import axios from 'axios';

const SellerDashboard = ({ initialTab = 'overview' }) => {
  // =========================================================================
  // SUBTITLE 1: STATE MANAGEMENT & ROUTING
  // =========================================================================
  const [activeTab, setActiveTab] = useState(initialTab);

  // Dummy seller state (or load from localStorage/Auth Context)
  // const [sellerInfo] = useState({
  //   businessName: 'Illam Premium Organic Estate',
  //   email: 'seller@illamchiya.com',
  //   isVerified: true,
  //   sellerId: 1,
  // });

  const [sellerInfo, setSellerInfo] = useState({
    businessName: '',
    email: '',
    isVerified: false,
    sellerId: localStorage.getItem('userId') || null,
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userAddress');
    navigate('/login');
  };

  const fetchSellerInfo = useCallback(async () => {
    const loggedInUserId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    if (!loggedInUserId || !token) {
      navigate('/login');
      return;
    }

    try {
      const res = await axios.get(`http://localhost:5000/api/sellers/info/${loggedInUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sellerName = res.data.business_name || res.data.full_name || '';
      setSellerInfo({
        businessName: sellerName,
        email: res.data.email || '',
        isVerified: res.data.is_verified === true || Number(res.data.is_verified) === 1,
        sellerId: res.data.id || null,
      });
      if (sellerName) localStorage.setItem('userName', sellerName);
      if (res.data.email) localStorage.setItem('userEmail', res.data.email);
    } catch (err) {
      console.error('Error fetching seller information:', err);
    }
  }, [navigate]);

  useEffect(() => {
    fetchSellerInfo();
  }, [fetchSellerInfo]);

  // =========================================================================
  // SUBTITLE 2: RENDER CONTROLLER (DYNAMIC CONTENT VIEWS)
  // =========================================================================
  const renderMainContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewSection sellerName={sellerInfo.businessName} />;
      case 'products':
        return <ProductManagement sellerId={sellerInfo.sellerId} />;
      case 'inventory':
        return <InventoryManagement sellerId={sellerInfo.sellerId} />;
      case 'orders':
        return <OrdersAndShipping sellerId={sellerInfo.sellerId} />;
      case 'billing':
        return <BillingsAndPayouts sellerId={sellerInfo.sellerId} />;
      case 'settings':
        return <FarmSettings sellerId={sellerInfo.sellerId} />;
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
            onClick={() => setActiveTab('overview')}>
            📊 Dashboard Overview
          </button>

          <button
            className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}>
            🍃 Product Management
          </button>

          <button
            className={`nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}>
            📋 Inventory Management
          </button>

          <button
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}>
            📦 Orders & Shipping
          </button>

          <button
            className={`nav-item ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}>
            💳 Billings & Payouts
          </button>

          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}>
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
              <div className="avatar-circle">{sellerInfo.businessName.charAt(0)}</div>
              <span className="profile-name">{sellerInfo.businessName}</span>
            </div>
          </div>
        </header>

        {/* DYNAMIC WORKSPACE CONTENT */}
        <main className="matcha-content-area">{renderMainContent()}</main>
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

    {/* Recent Activity Table */}
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
            <td>
              <span className="status-badge pending">Pending Dispatch</span>
            </td>
          </tr>
          <tr>
            <td>#ILLAM-1088</td>
            <td>Anita Rai</td>
            <td>Special White Tea (250g)</td>
            <td>NPR 1,850</td>
            <td>
              <span className="status-badge completed">Delivered</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

export default SellerDashboard;
