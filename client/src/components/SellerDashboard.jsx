import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import ProductManagement from './ProductManagement';
import InventoryManagement from './InventoryManagement';
import OrdersAndShipping from './OrdersAndShipping';
import BillingsAndPayouts from './BillingsandPayouts';
import SellerSidebar from './SellerSidebar';
import NotificationBell from './Notificationbell';
import './SellerDashboard.css';
import axios from 'axios';

const SellerDashboard = ({ initialTab = 'overview' }) => {
  // =========================================================================
  // SUBTITLE 1: STATE MANAGEMENT & ROUTING
  // =========================================================================
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => requestedTab || initialTab);

  const [sellerInfo, setSellerInfo] = useState({
    businessName: '',
    email: '',
    isVerified: false,
    sellerId: localStorage.getItem('userId') || null,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const validTabs = ['overview', 'products', 'inventory', 'orders', 'billing'];
    setActiveTab(validTabs.includes(requestedTab) ? requestedTab : initialTab);
  }, [initialTab, requestedTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'overview') nextParams.delete('tab');
    else nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  };

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
        return <OverviewSection sellerName={sellerInfo.businessName} sellerId={sellerInfo.sellerId} />;
      case 'products':
        return <ProductManagement sellerId={sellerInfo.sellerId} />;
      case 'inventory':
        return <InventoryManagement sellerId={sellerInfo.sellerId} />;
      case 'orders':
        return <OrdersAndShipping sellerId={sellerInfo.sellerId} />;
      case 'billing':
        return <BillingsAndPayouts sellerId={sellerInfo.sellerId} />;
      default:
        return <OverviewSection sellerName={sellerInfo.businessName} sellerId={sellerInfo.sellerId} />;
    }
  };

  // =========================================================================
  // SUBTITLE 3: MAIN DASHBOARD LAYOUT
  // =========================================================================
  return (
    <div className="matcha-dashboard-container">
      <SellerSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
      />

      {/* ---------------- RIGHT CONTENT WRAPPER ---------------- */}
      <div className="matcha-main-wrapper">
        {/* TOP HEADER BAR */}
        <header className="matcha-topbar">
          <div className="topbar-left">
            <h3>{{
              overview: 'Dashboard Overview',
              products: 'Product Management',
              inventory: 'Inventory Management',
              orders: 'Orders & Shipping',
              billing: 'Billings & Payouts',
            }[activeTab]}</h3>
          </div>

          <div className="topbar-right">
            <NotificationBell role="seller" />
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
const OverviewSection = ({ sellerName, sellerId }) => {
  const [overview, setOverview] = useState({
    deliveredRevenue: 0,
    activeProducts: 0,
    totalProducts: 0,
    pendingOrders: 0,
    lowStockCount: 0,
    lowStockProducts: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    let isMounted = true;

    const loadOverview = async () => {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [inventoryResponse, productsResponse, ordersResponse] = await Promise.all([
          axios.get(`http://localhost:5000/api/inventory`, { params: { seller_id: sellerId }, headers }),
          axios.get(`http://localhost:5000/api/products/seller/${sellerId}`, { headers }),
          axios.get(`http://localhost:5000/api/orders`, { params: { seller_id: sellerId }, headers }),
        ]);

        const products = Array.isArray(productsResponse.data) ? productsResponse.data : [];
        const orders = Array.isArray(ordersResponse.data) ? ordersResponse.data : [];
        const inventory = inventoryResponse.data || {};
        const lowStockProducts = (Array.isArray(inventory.items) ? inventory.items : [])
          .filter((item) => {
            const stock = Number(item.current_stock);
            return Number.isFinite(stock) && stock <= 10;
          });
        const activeProducts = products.filter((product) =>
          product.is_active === true || product.is_active === 1 || product.is_active === '1',
        ).length;
        const pendingOrders = orders.filter((order) =>
          ['pending', 'processing', 'shipped'].includes(String(order.status).toLowerCase()),
        ).length;

        if (isMounted) {
          setOverview({
            deliveredRevenue: Number(inventory.metrics?.deliveredRevenue) || 0,
            activeProducts,
            totalProducts: products.length,
            pendingOrders,
            lowStockCount: Number(inventory.metrics?.lowStockCount) || 0,
            lowStockProducts,
            recentOrders: orders.slice(0, 5),
          });
        }
      } catch (error) {
        console.error('Unable to load seller dashboard overview:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOverview();
    return () => {
      isMounted = false;
    };
  }, [sellerId]);

  return (
    <div className="view-container">
      <div className="welcome-banner">
        <h2>Welcome back, {sellerName || 'Seller'}!</h2>
        <p>Here is an overview of your tea estate sales and active catalog.</p>
      </div>

      {!loading && overview.lowStockProducts.length > 0 && (
        <div className="low-stock-alert" role="alert">
          <strong>Low Stock Alert</strong>
          <ul>
            {overview.lowStockProducts.map((product) => (
              <li key={product.id}>
                {product.name}: {product.current_stock} {Number(product.current_stock) === 1 ? 'unit' : 'units'} remaining
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="metric-subtext">Loading dashboard overview...</p>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-title">Delivered Revenue</span>
              <h3 className="metric-value">NPR {overview.deliveredRevenue.toLocaleString()}</h3>
              <span className="metric-trend positive">Completed COD sales</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Active Tea Products</span>
              <h3 className="metric-value">{overview.activeProducts} Varieties</h3>
              <span className="metric-subtext">{overview.totalProducts} products in catalog</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Pending Orders</span>
              <h3 className="metric-value">{overview.pendingOrders} Shipments</h3>
              <span className="metric-subtext">Requires fulfillment</span>
            </div>

            <div className="metric-card">
              <span className="metric-title">Low or Empty Stock</span>
              <h3 className="metric-value">{overview.lowStockCount} Products</h3>
              <span className="metric-subtext">Needs inventory review</span>
            </div>
          </div>

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
                {overview.recentOrders.length ? overview.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>#ILLAM-{order.id}</td>
                    <td>{order.buyer_name || 'Unknown buyer'}</td>
                    <td>{order.items_summary || 'Tea order'}</td>
                    <td>NPR {Number(order.total_price || 0).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${String(order.status).toLowerCase() === 'delivered' ? 'completed' : 'pending'}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5">No orders have been placed yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default SellerDashboard;
