import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Navbar from './Navbar';
import './OrderTracking.css';

const ORDER_STEPS = [
  { status: 'pending', title: 'Order Placed' },
  { status: 'processing', title: 'Confirmed by Seller' },
  { status: 'shipped', title: 'Processed for Shipment' },
  { status: 'delivered', title: 'Out for Delivery' },
];

const formatDate = (date) => (
  date ? new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) : 'Upcoming'
);

const getDeliveryEstimate = (order) => {
  if (order.status === 'cancelled') return 'Cancelled';
  if (order.status === 'delivered') {
    return order.seller_updated_at ? `Delivered ${formatDate(order.seller_updated_at)}` : 'Delivered';
  }
  if (!order.seller_updated_at) return 'Pending seller update';

  const updatedAt = new Date(order.seller_updated_at);
  if (Number.isNaN(updatedAt.getTime())) return 'Estimate unavailable';

  const earliestDate = new Date(updatedAt);
  const latestDate = new Date(updatedAt);
  earliestDate.setDate(earliestDate.getDate() + 5);
  latestDate.setDate(latestDate.getDate() + 10);
  return `${formatDate(earliestDate)} – ${formatDate(latestDate)}`;
};

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deliveryPreference, setDeliveryPreference] = useState('doorstep');
  const [cartCount] = useState(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    return savedCart.reduce((total, item) => total + item.quantity, 0);
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'buyer') {
      navigate('/login');
      return;
    }

    const loadOrders = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/orders/mine', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load your orders.');
        }

        setOrders(data);
        if (data.length > 0) setSelectedOrderId(data[0].id);
      } catch (fetchError) {
        console.error('Order tracking error:', fetchError);
        setError(fetchError.message || 'Unable to load your orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [navigate]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const currentStep = selectedOrder
    ? ORDER_STEPS.findIndex((step) => step.status === selectedOrder.status)
    : -1;
  const orderDate = selectedOrder ? new Date(selectedOrder.created_at) : null;
  const subtotal = Number(selectedOrder?.subtotal || 0);
  const total = Number(selectedOrder?.total_price || 0);
  const shipping = Math.max(total - subtotal, 0);

  const handlePrintInvoice = () => window.print();

  return (
    <div className="ot-page">
      <Navbar cartCount={cartCount} showSearch={false} />

      <main className="ot-container">
        <button
          type="button"
          className="ot-back-button"
          aria-label="Back to home"
          title="Back to home"
          onClick={() => navigate('/')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5m7 7-7-7 7-7" />
          </svg>
        </button>

        {loading ? (
          <p className="ot-message" role="status">Loading your orders...</p>
        ) : error ? (
          <p className="ot-message ot-error" role="alert">{error}</p>
        ) : orders.length === 0 ? (
          <section className="ot-card ot-empty">
            <h1 className="ot-title">Package Tracking</h1>
            <p>No orders to track yet. Your orders and shipping updates will appear here after checkout.</p>
            <button type="button" className="ot-outline-btn" onClick={() => navigate('/')}>
              Browse teas
            </button>
          </section>
        ) : selectedOrder ? (
          <>
            <div className="ot-title-row">
              <h1 className="ot-title">Order Tracking: #ILLAM-{selectedOrder.id}</h1>
              {orders.length > 1 && (
                <label className="ot-order-select-label">
                  <span className="ot-visually-hidden">Choose order</span>
                  <select
                    className="ot-order-select"
                    value={selectedOrderId}
                    onChange={(event) => setSelectedOrderId(Number(event.target.value))}
                  >
                    {orders.map((order) => (
                      <option key={order.id} value={order.id}>Order #ILLAM-{order.id}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="ot-grid">
              <section className="ot-card ot-tracking-card">
                <h2 className="ot-section-heading">Tracking Details</h2>
                {selectedOrder.status === 'cancelled' ? (
                  <p className="ot-cancelled" role="status">This order has been cancelled.</p>
                ) : (
                  <>
                    <div className="ot-stepper">
                      {ORDER_STEPS.map((step, index) => {
                        const isComplete = currentStep >= 0 && index < currentStep;
                        const isCurrent = index === currentStep;
                        return (
                          <div key={step.status} className="ot-step">
                            <div className="ot-step-top">
                              <span className={`ot-step-circle ${isComplete ? 'done' : ''} ${isCurrent ? 'current' : ''}`}>
                                {index + 1}
                              </span>
                              {index < ORDER_STEPS.length - 1 && (
                                <span className={`ot-step-line ${isComplete ? 'done' : ''}`} />
                              )}
                            </div>
                            <div className="ot-step-label">{step.title}</div>
                            <div className="ot-step-date">
                              {index === 0 ? formatDate(selectedOrder.created_at) : isComplete ? 'Updated by seller' : 'Upcoming'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="ot-upcoming-status">
                      <span className="ot-upcoming-dot" />
                      <div>
                        <div className="ot-upcoming-title">Delivered</div>
                        <div className="ot-upcoming-sub">Upcoming</div>
                      </div>
                    </div>
                  </>
                )}

                <div className="ot-meta-list">
                  <div className="ot-meta-row">
                    <span className="ot-meta-label">Current Status:</span>
                    <span className="ot-meta-value ot-status-text">{selectedOrder.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="ot-meta-row">
                    <span className="ot-meta-label">Estimated Delivery:</span>
                    <span className="ot-meta-value">{getDeliveryEstimate(selectedOrder)}</span>
                  </div>
                  <div className="ot-meta-row">
                    <span className="ot-meta-label">Carrier:</span>
                    <span className="ot-meta-value">{selectedOrder.carrier_name || 'Not assigned'}</span>
                  </div>
                  <div className="ot-meta-row">
                    <span className="ot-meta-label">Tracking Number:</span>
                    <span className="ot-meta-value">{selectedOrder.tracking_number || 'Not assigned'}</span>
                  </div>
                  <div className="ot-meta-row">
                    <span className="ot-meta-label">Delivery Address:</span>
                    <span className="ot-meta-value">{selectedOrder.delivery_address}</span>
                  </div>
                </div>

                <div className="ot-transit">
                  <h3 className="ot-transit-heading">Transit History</h3>
                  <ul className="ot-transit-list">
                    <li>{orderDate?.toLocaleString()} — Order placed</li>
                    {currentStep > 0 && (
                      <li>{selectedOrder.status.replace(/_/g, ' ')} — Status updated by seller</li>
                    )}
                  </ul>
                </div>
              </section>

              <aside className="ot-side-column">
                <section className="ot-card">
                  <h2 className="ot-section-heading">Package Contents</h2>
                  <div className="ot-package-item">
                    {selectedOrder.product_image ? (
                      <img
                        className="ot-package-thumb"
                        src={selectedOrder.product_image.startsWith('http')
                          ? selectedOrder.product_image
                          : `http://localhost:5000/${selectedOrder.product_image.replace(/^\/+/, '')}`}
                        alt=""
                      />
                    ) : (
                      <div className="ot-package-thumb ot-package-placeholder" aria-hidden="true">🍃</div>
                    )}
                    <div className="ot-package-name">{selectedOrder.items_summary || 'Order items'}</div>
                  </div>

                  <div className="ot-summary">
                    <div className="ot-summary-row">
                      <strong>Subtotal:</strong>
                      <span>NPR {subtotal.toLocaleString()}</span>
                    </div>
                    <div className="ot-summary-row">
                      <strong>Shipping:</strong>
                      <span>NPR {shipping.toLocaleString()}</span>
                    </div>
                    <div className="ot-summary-row total">
                      <strong>Total:</strong>
                      <strong>NPR {total.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="ot-action-stack">
                    <button type="button" className="ot-outline-btn" onClick={handlePrintInvoice}>
                      View Order Invoice
                    </button>
                    <a className="ot-outline-btn ot-support-btn" href="mailto:support@illamchiya.com">
                      Contact Support
                    </a>
                  </div>

                  <div className="ot-preferences">
                    <h3 className="ot-pref-title">Delivery Preferences</h3>
                    <label className="ot-radio-label">
                      <input
                        type="radio"
                        name="deliveryPreference"
                        value="doorstep"
                        checked={deliveryPreference === 'doorstep'}
                        onChange={() => setDeliveryPreference('doorstep')}
                      />
                      <span>Leave at Doorstep</span>
                    </label>
                    <label className="ot-radio-label">
                      <input
                        type="radio"
                        name="deliveryPreference"
                        value="hand-to-me"
                        checked={deliveryPreference === 'hand-to-me'}
                        onChange={() => setDeliveryPreference('hand-to-me')}
                      />
                      <span>Hand it to me</span>
                    </label>
                  </div>
                </section>
              </aside>
            </div>

            <section className="ot-invoice">
              <div className="ot-invoice-brand">
                <span>🍃</span>
                <div>
                  <strong>ILLAM CHIYA</strong>
                  <span>Order Invoice</span>
                </div>
              </div>
              <div className="ot-invoice-meta">
                <span><strong>Invoice:</strong> #ILLAM-{selectedOrder.id}</span>
                <span><strong>Date:</strong> {formatDate(selectedOrder.created_at)}</span>
              </div>
              <div className="ot-invoice-address">
                <strong>Delivery Address</strong>
                <span>{selectedOrder.delivery_address}</span>
              </div>
              <div className="ot-invoice-items">
                <strong>Item</strong>
                <span>{selectedOrder.items_summary || 'Order items'}</span>
              </div>
              <div className="ot-invoice-totals">
                <div><span>Subtotal</span><strong>NPR {subtotal.toLocaleString()}</strong></div>
                <div><span>Shipping</span><strong>NPR {shipping.toLocaleString()}</strong></div>
                <div className="ot-invoice-total"><span>Total</span><strong>NPR {total.toLocaleString()}</strong></div>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default OrderTracking;
