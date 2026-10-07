import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OrdersShipping.css';

const OrdersShipping = () => {
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const activeSellerId = localStorage.getItem('userId') || 1;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/orders?seller_id=${activeSellerId}`);
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.patch(`http://localhost:5000/api/orders/${orderId}/status`, { 
        status: newStatus.toLowerCase() 
      });
      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus.toLowerCase() } : order
      ));
    } catch (err) {
      alert('Could not update status. Please try again.');
    }
  };

  const filteredOrders = activeFilter === 'All'
    ? orders
    : orders.filter(o => o.status && o.status.toLowerCase() === activeFilter.toLowerCase());

  if (loading) return <div className="loading-spinner">Loading orders...</div>;

  return (
    <div className="orders-shipping-container">
      <div className="orders-header">
        <h2>📦 Orders & Dispatch Management</h2>
        <p>Track incoming buyer requests, prepare shipments, and collect Cash on Delivery.</p>
      </div>

      <div className="filter-bar">
        {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(tab => (
          <button
            key={tab}
            className={`filter-btn ${activeFilter === tab ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="table-card">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Buyer Details</th>
              <th>Items Summary</th>
              <th>Total Amount</th>
              <th>Payment Info</th>
              <th>Current Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-state">No {activeFilter.toLowerCase()} orders found.</td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">#ORD-{order.id}</td>
                  <td>
                    <strong>{order.buyer_name || 'Guest Buyer'}</strong><br />
                    <small>{order.phone || 'N/A'}</small><br />
                    <span className="address-text">{order.delivery_address}</span>
                  </td>
                  <td>{order.items_summary}</td>
                  <td className="amount-text">NPR {order.total_price}</td>
                  <td>
                    <span className="cod-badge">💵 Cash on Delivery</span><br />
                    <small className="cod-subtext">
                      {order.status && order.status.toLowerCase() === 'delivered' ? '✅ Cash Collected' : `⏳ Collect NPR ${order.total_price}`}
                    </small>
                  </td>
                  <td>
                    <span className={`status-pill ${order.status ? order.status.toLowerCase() : 'pending'}`}>
                      {order.status ? order.status.toUpperCase() : 'PENDING'}
                    </span>
                  </td>
                  <td>
                    <select
                      value={order.status ? order.status.toLowerCase() : 'pending'}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="status-dropdown"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersShipping;