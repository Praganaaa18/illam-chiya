import React, { useEffect, useState } from 'react';
import './OrdersAndShipping.css';

const OrdersAndShipping = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Get seller ID from localStorage (or your Auth Context)
  const sellerId = localStorage.getItem('userId') || 1; 

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

      // Update state locally so UI refreshes immediately
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
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <select
                      className="status-dropdown"
                      value={order.status}
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

export default OrdersAndShipping;