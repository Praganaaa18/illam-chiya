import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductManagement from './ProductManagement';
import BillingsAndPayouts from './BillingsandPayouts';
import FarmSettings from './FarmSettings';
import './SellerDashboard.css';

const SellerDashboard = () => {
  // =========================================================================
  // SUBTITLE 1: STATE MANAGEMENT & ROUTING
  // =========================================================================
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dummy seller state (or load from localStorage/Auth Context)
  const [sellerInfo] = useState({
    businessName: "Illam Premium Organic Estate",
    email: "seller@illamchiya.com",
    isVerified: true,
    sellerId: 1
  });

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // =========================================================================
  // SUBTITLE 2: RENDER CONTROLLER (DYNAMIC CONTENT VIEWS)
  // =========================================================================
  const renderMainContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewSection sellerName={sellerInfo.businessName} />;
      case 'products':
        return <ProductManagement sellerId={sellerInfo.sellerId} />;
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

// --- View 3: Orders & Shipping Component ---
const OrdersAndShipping = ({ sellerId = 1 }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSellerOrders();
  }, [sellerId]);

  const fetchSellerOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/orders?seller_id=${sellerId}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Unable to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    } catch (err) {
      console.error('Status update error:', err);
      alert('Could not update status. Please try again.');
    }
  };

  if (loading) return <div className="orders-loading">Loading seller orders...</div>;
  if (error) return <div className="orders-error">{error}</div>;

  return (
    <div className="orders-shipping-container">
      <div className="orders-header">
        <h2>📦 Orders & Shipping</h2>
        <p>Track incoming purchases, review buyer delivery details, and update shipment status.</p>
      </div>

      {orders.length === 0 ? (
        <div className="no-orders">No orders found for your estate yet.</div>
      ) : (
        <div className="table-responsive">
          <table className="seller-orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Buyer Info</th>
                <th>Items Ordered</th>
                <th>Total Price</th>
                <th>Date</th>
                <th>Current Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="order-id">#{order.id}</td>
                  <td>
                    <div className="buyer-name">{order.buyer_name}</div>
                    <div className="buyer-phone">📞 {order.phone}</div>
                    <div className="delivery-address" title={order.delivery_address}>
                      📍 {order.delivery_address}
                    </div>
                  </td>
                  <td className="items-summary">{order.items_summary}</td>
                  <td className="order-price">Rs. {Number(order.total_price).toFixed(2)}</td>
                  <td className="order-date">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`status-pill ${order.status}`}>
                      {order.status ? order.status.toUpperCase() : 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-dropdown"
                      value={order.status || 'pending'}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;