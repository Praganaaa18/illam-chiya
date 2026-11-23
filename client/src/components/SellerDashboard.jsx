import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import ProductManagement from './ProductManagement';
import InventoryManagement from './InventoryManagement';
import OrdersAndShipping from './OrdersAndShipping';
import BillingsAndPayouts from './BillingsandPayouts';
import SellerSidebar from './SellerSidebar';
import NotificationBell from './Notificationbell';
import TablePagination, { SortHeader, sortRows, useTableSort } from './TableControls';
import './SellerDashboard.css';
import axios from 'axios';
import { isSellerSessionError } from '../utils/sellerSession';

const AUTH_STORAGE_KEYS = [
  'token',
  'userId',
  'userRole',
  'userName',
  'userEmail',
  'userPhone',
  'userAddress',
];

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
    sellerId: localStorage.getItem('userId') || null,
  });

  const navigate = useNavigate();
  const authRedirectStarted = useRef(false);

  const handleSellerSessionError = useCallback(() => {
    if (authRedirectStarted.current) return;
    authRedirectStarted.current = true;
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    navigate('/login', {
      replace: true,
      state: {
        role: 'seller',
        message: 'Your seller session is no longer valid. Sign in again as a seller.',
      },
    });
  }, [navigate]);

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
    AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    navigate('/login');
  };

  const fetchSellerInfo = useCallback(async () => {
    const loggedInUserId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    if (!loggedInUserId || !token || localStorage.getItem('userRole') !== 'seller') {
      handleSellerSessionError();
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
        sellerId: res.data.id || null,
      });
      if (sellerName) localStorage.setItem('userName', sellerName);
      if (res.data.email) localStorage.setItem('userEmail', res.data.email);
    } catch (err) {
      if (isSellerSessionError(err)) {
        handleSellerSessionError();
        return;
      }
      console.error('Error fetching seller information:', err);
    }
  }, [handleSellerSessionError]);

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
        return (
          <ProductManagement
            sellerId={sellerInfo.sellerId}
            onSellerSessionError={handleSellerSessionError}
          />
        );
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
  const [isLowStockAlertDismissed, setIsLowStockAlertDismissed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, handleSort] = useTableSort('id');

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
            const stock = Number(item.available_stock ?? item.current_stock);
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
            recentOrders: orders,
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

  const sortedRecentOrders = useMemo(() => sortRows(overview.recentOrders, sortConfig, (order, key) => {
    const values = {
      id: order.id,
      buyer_name: order.buyer_name,
      items_summary: order.items_summary,
      total_price: order.total_price,
      status: order.status,
    };
    return values[key] ?? '';
  }), [overview.recentOrders, sortConfig]);
  const recentPageCount = Math.max(1, Math.ceil(sortedRecentOrders.length / pageSize));
  const pagedRecentOrders = sortedRecentOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setCurrentPage(1), [pageSize]);
  useEffect(() => {
    if (currentPage > recentPageCount) setCurrentPage(recentPageCount);
  }, [currentPage, recentPageCount]);

  return (
    <div className="view-container">
      <div className="welcome-banner">
        <h2>Welcome back, {sellerName || 'Seller'}!</h2>
        <p>Here is an overview of your tea estate sales and active catalog.</p>
      </div>

      {!loading && !isLowStockAlertDismissed && overview.lowStockProducts.length > 0 && (
        <div className="low-stock-alert" role="alert">
          <div className="low-stock-alert-heading">
            <strong>Low Stock Alert</strong>
            <button
              type="button"
              className="low-stock-alert-dismiss"
              aria-label="Dismiss low stock alert"
              onClick={() => setIsLowStockAlertDismissed(true)}
            >
              ×
            </button>
          </div>
          <ul>
            {overview.lowStockProducts.map((product) => (
              <li key={product.id}>
                {product.name}: {product.available_stock ?? product.current_stock} {Number(product.available_stock ?? product.current_stock) === 1 ? 'unit' : 'units'} remaining
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
                  <SortHeader label="Order ID" column="id" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Buyer Name" column="buyer_name" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Tea Variant" column="items_summary" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Amount" column="total_price" sortConfig={sortConfig} onSort={handleSort} />
                  <SortHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {pagedRecentOrders.length ? pagedRecentOrders.map((order) => (
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
            <TablePagination
              page={currentPage}
              pageCount={recentPageCount}
              total={sortedRecentOrders.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemLabel="orders"
            />
          </div>
        </>
      )}
    </div>
  );
};

export default SellerDashboard;
