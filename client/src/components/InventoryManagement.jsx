import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './InventoryManagement.css';

const InventoryManagement = ({ sellerId }) => {
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({
    totalStockValue: 0,
    lowStockCount: 0,
    reservedOrdersCount: 0,
    deliveredRevenue: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isRestocking, setIsRestocking] = useState(false);

  // Quick Restock Modal State
  const [restockModal, setRestockModal] = useState({ open: false, product: null, amount: 10 });

  const activeSellerId = sellerId || localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const fetchInventory = useCallback(async () => {
    if (!activeSellerId || !token) {
      setError('Please sign in again to view your inventory.');
      setLoading(false);
      return;
    }

    setError('');
    try {
      const res = await axios.get(`http://localhost:5000/api/inventory?seller_id=${activeSellerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!Array.isArray(res.data.items) || !res.data.metrics) {
        throw new Error('The server returned invalid inventory data.');
      }
      setItems(res.data.items);
      setMetrics(res.data.metrics);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err.response?.data?.error || err.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }, [activeSellerId, token]);

  useEffect(() => {
    fetchInventory();
  }, [activeSellerId, fetchInventory]);

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockModal.product) return;
    const addQuantity = Number(restockModal.amount);
    if (!Number.isInteger(addQuantity) || addQuantity <= 0) {
      setNotice('Enter a positive whole-number quantity.');
      return;
    }

    setIsRestocking(true);
    setNotice('');
    try {
      await axios.patch(
        `http://localhost:5000/api/inventory/${restockModal.product.id}/restock`,
        { add_quantity: addQuantity },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setRestockModal({ open: false, product: null, amount: 10 });
      setNotice('Inventory restocked successfully.');
      await fetchInventory();
    } catch (err) {
      console.error('Error restocking inventory:', err);
      setNotice(err.response?.data?.error || err.message || 'Failed to update stock.');
    } finally {
      setIsRestocking(false);
    }
  };

  const categories = ['All', ...new Set(items.map(i => i.category))];

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return `http://localhost:5000${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
  };

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) return <div className="inv-loading" role="status">Loading inventory data...</div>;

  return (
    <div className="inv-container">
      {error && (
        <div className="inv-error" role="alert">
          <span>{error}</span>
          <button type="button" className="inv-retry-btn" onClick={fetchInventory}>Try again</button>
        </div>
      )}
      {notice && <div className="inv-notice" role="status">{notice}</div>}
      {/* 4 KPI SUMMARY CARDS */}
      <div className="inv-kpi-grid">
        <div className="inv-kpi-card">
          <div className="kpi-content">
            <span className="kpi-title">Total Stock Value</span>
            <h3 className="kpi-value">Rs. {metrics.totalStockValue.toLocaleString()}</h3>
          </div>
          <div className="kpi-icon-box green">💵</div>
        </div>

        <div className="inv-kpi-card">
          <div className="kpi-content">
            <span className="kpi-title">Low Stock Alerts</span>
            <h3 className="kpi-value">({metrics.lowStockCount} Items)</h3>
          </div>
          <div className="kpi-icon-box amber">⚠️</div>
        </div>

        <div className="inv-kpi-card">
          <div className="kpi-content">
            <span className="kpi-title">Reserved for Active Orders</span>
            <h3 className="kpi-value">({metrics.reservedOrdersCount} Items)</h3>
          </div>
          <div className="kpi-icon-box gold">📦</div>
        </div>

        <div className="inv-kpi-card">
          <div className="kpi-content">
            <span className="kpi-title">Delivered Stock Revenue</span>
            <h3 className="kpi-value">Rs. {metrics.deliveredRevenue.toLocaleString()}</h3>
          </div>
          <div className="kpi-icon-box forest">🧾</div>
        </div>
      </div>

      {/* MAIN INVENTORY TABLE CARD */}
      <div className="inv-main-card">
        <div className="inv-toolbar">
          <div className="inv-search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="inv-filter-group">
            <select
              className="inv-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">Filter by</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            <select
              className="inv-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Filters' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="inv-table-wrapper">
          <table className="inv-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Current<br />Stock</th>
                <th>Reserved Stock<br />from Orders</th>
                <th>Available<br />Stock</th>
                <th>Unit<br />Price</th>
                <th>Stock<br />Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr><td colSpan="8" className="inv-empty">Inventory could not be loaded.</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="inv-empty">No matching tea inventory found.</td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="inv-product-cell">
                        {getImageUrl(item.image_url) ? (
                          <img
                            src={getImageUrl(item.image_url)}
                            alt={item.name}
                            className="inv-thumb"
                            onError={(event) => { event.currentTarget.hidden = true; }}
                          />
                        ) : <span className="inv-thumb-fallback" aria-hidden="true">🍃</span>}
                        <div>
                          <div className="inv-prod-name">{item.name}</div>
                          <div className="inv-prod-cat">🌿 {item.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="inv-num">{item.current_stock}</td>
                    <td className="inv-num">{item.reserved_stock}</td>
                    <td className="inv-num bold">{item.available_stock}</td>
                    <td className="inv-num">Rs. {item.unit_price.toLocaleString()}</td>
                    <td className="inv-num">Rs. {item.stock_value.toLocaleString()}</td>
                    <td>
                      <span className={`inv-badge ${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="inv-restock-btn"
                        onClick={() => setRestockModal({ open: true, product: item, amount: 10 })}
                      >
                        Quick Restock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK RESTOCK MODAL */}
      {restockModal.open && (
        <div className="inv-modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isRestocking) {
            setRestockModal({ open: false, product: null, amount: 10 });
          }
        }}>
          <div className="inv-modal" role="dialog" aria-modal="true" aria-labelledby="inv-restock-title">
            <h3 id="inv-restock-title">Restock {restockModal.product.name}</h3>
            <p>Current Stock: <strong>{restockModal.product.current_stock}</strong> units</p>
            <form onSubmit={handleRestockSubmit}>
              {notice && <div className="inv-error" role="alert">{notice}</div>}
              <label htmlFor="inv-restock-quantity">Quantity to Add:</label>
              <input
                id="inv-restock-quantity"
                type="number"
                min="1"
                step="1"
                value={restockModal.amount}
                onChange={(e) => setRestockModal({ ...restockModal, amount: e.target.value })}
                required
              />
              <div className="inv-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  disabled={isRestocking}
                  onClick={() => {
                    setNotice('');
                    setRestockModal({ open: false, product: null, amount: 10 });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-confirm" disabled={isRestocking}>
                  {isRestocking ? 'Saving…' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManagement;