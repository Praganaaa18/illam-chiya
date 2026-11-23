import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Navbar from './Navbar';
import Icon from './Icon';
import { formatDeliveryDateRange } from '../utils/delivery';
import './OrderTracking.css';

const ORDER_STEPS = [
  { status: 'pending', title: 'Order Placed' },
  { status: 'processing', title: 'Confirmed by Seller' },
  { status: 'shipped', title: 'Processed for Shipment' },
  { status: 'out_for_delivery', title: 'Out for Delivery' },
  { status: 'delivered', title: 'Delivered' },
  { status: 'cash_received', title: 'Package Received' },
];
const ORDER_STEP_INDEX = {
  pending: 0,
  processing: 1,
  shipped: 2,
  delivered: 4,
  cash_received: 5,
};

const formatDate = (date) => (
  date ? new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) : 'Upcoming'
);

const getDeliveryEstimate = (order) => {
  if (order.status === 'cancelled') return 'Cancelled';
  if (['delivered', 'cash_received'].includes(order.status)) {
    return order.delivered_at ? `Delivered ${formatDate(order.delivered_at)}` : 'Delivered';
  }
  return formatDeliveryDateRange(order.created_at);
};

const OrderTracking = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
  const [deliveryPreferenceDraft, setDeliveryPreferenceDraft] = useState('doorstep');
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [cartCount] = useState(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    return savedCart.reduce((total, item) => total + item.quantity, 0);
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedOrderId = searchParams.get('orderId');

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

  useEffect(() => {
    if (!requestedOrderId) return;
    const requestedOrder = orders.find((order) => String(order.id) === requestedOrderId);
    if (requestedOrder) setSelectedOrderId(requestedOrder.id);
  }, [orders, requestedOrderId]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const cashReceived = selectedOrder?.status === 'cash_received' ||
    ['paid', 'received'].includes(String(selectedOrder?.payment_status || '').toLowerCase());
  const statusStep = selectedOrder ? ORDER_STEP_INDEX[selectedOrder.status] ?? -1 : -1;
  const currentStep = cashReceived && statusStep >= 0
    ? ORDER_STEPS.length - 1
    : statusStep;
  const orderDate = selectedOrder ? new Date(selectedOrder.created_at) : null;
  const subtotal = Number(selectedOrder?.subtotal || 0);
  const total = Number(selectedOrder?.total_price || 0);
  const shipping = Math.max(total - subtotal, 0);
  const sellerContactNumbers = selectedOrder?.seller_contact_numbers
    ? selectedOrder.seller_contact_numbers.split(',').map((phone) => phone.trim()).filter(Boolean)
    : [];
  const deliveryPreference = selectedOrder?.delivery_preference === 'hand-to-me'
    ? 'Hand it to me'
    : 'Leave at Doorstep';
  const selectedOrderPreference = selectedOrder?.delivery_preference || 'doorstep';
  const canCancelOrder = ['pending', 'processing', 'shipped'].includes(selectedOrder?.status);
  const buyerSuspendedUntil = selectedOrder?.buyer_suspended_until;

  useEffect(() => {
    if (!selectedOrderId) return;
    setDeliveryPreferenceDraft(selectedOrderPreference);
  }, [selectedOrderId, selectedOrderPreference]);

  const handlePrintInvoice = () => window.print();

  const handleUpdateDeliveryPreference = async () => {
    if (!selectedOrder || deliveryPreferenceDraft === selectedOrder.delivery_preference) return;
    setIsUpdatingPreference(true);
    setActionError('');
    setActionNotice('');
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${selectedOrder.id}/delivery-preference`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ delivery_preference: deliveryPreferenceDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update delivery preference.');
      setOrders((current) => current.map((order) => (
        order.id === selectedOrder.id
          ? { ...order, delivery_preference: data.delivery_preference }
          : order
      )));
      setActionNotice('Delivery preference updated.');
    } catch (requestError) {
      console.error('Unable to update delivery preference:', requestError);
      setActionError(requestError.message || 'Unable to update delivery preference.');
    } finally {
      setIsUpdatingPreference(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder || !canCancelOrder) return;
    if (!window.confirm('Cancel this order? You will not be able to place another order for one week.')) return;

    setIsCancellingOrder(true);
    setActionError('');
    setActionNotice('');
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${selectedOrder.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to cancel this order.');
      setOrders((current) => current.map((order) => (
        order.id === selectedOrder.id
          ? {
            ...order,
            status: 'cancelled',
            buyer_suspended_until: data.suspended_until,
          }
          : order
      )));
      setActionNotice(data.message);
    } catch (requestError) {
      console.error('Unable to cancel order:', requestError);
      setActionError(requestError.message || 'Unable to cancel this order.');
    } finally {
      setIsCancellingOrder(false);
    }
  };

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
                        const isComplete = currentStep >= 0 &&
                          (index < currentStep || (index === currentStep && cashReceived));
                        const isCurrent = index === currentStep && !cashReceived;
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
                              {index === 0
                                ? formatDate(selectedOrder.created_at)
                                : isCurrent
                                  ? 'In progress'
                                  : isComplete
                                    ? 'Completed'
                                    : 'Upcoming'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                <div className="ot-meta-list">
                  <div className="ot-meta-row">
                    <span className="ot-meta-label">Current Status:</span>
                    <span className="ot-meta-value ot-status-text">
                      {selectedOrder.status === 'cash_received' ? 'Package Received' : selectedOrder.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="ot-meta-row">
                    <span className="ot-meta-label">Delivery Date Range:</span>
                    <span className="ot-meta-value">
                      {getDeliveryEstimate(selectedOrder)}
                      {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                        <span className="ot-delivery-note">
                          Delivery takes 10 days after shipment confirmation from seller.
                        </span>
                      )}
                    </span>
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
                  <div className="ot-meta-row">
                    <span className="ot-meta-label">Delivery Preference:</span>
                    <span className="ot-meta-value">{deliveryPreference}</span>
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
                      <div className="ot-package-thumb ot-package-placeholder" aria-hidden="true"><Icon name="leaf" /></div>
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
                    <button
                      type="button"
                      className="ot-outline-btn ot-support-btn"
                      onClick={() => setIsSupportDialogOpen(true)}
                    >
                      Contact Support
                    </button>
                    <button
                      type="button"
                      className="ot-cancel-order-btn"
                      onClick={handleCancelOrder}
                      disabled={!canCancelOrder || isCancellingOrder}
                      title={canCancelOrder ? 'Cancel this order' : 'Only orders that have not been delivered can be cancelled.'}
                    >
                      {isCancellingOrder ? 'Cancelling…' : 'Cancel Order'}
                    </button>
                    <small className="ot-cancel-order-hint">
                      {canCancelOrder
                        ? 'Cancelling an order pauses new orders for one week.'
                        : 'Orders can only be cancelled before delivery.'}
                    </small>
                  </div>

                  {buyerSuspendedUntil && new Date(buyerSuspendedUntil).getTime() > Date.now() && (
                    <p className="ot-suspension-notice" role="status">
                      Ordering is temporarily paused until {new Date(buyerSuspendedUntil).toLocaleString()}.
                    </p>
                  )}

                  <div className="ot-preferences">
                    <h3 className="ot-pref-title">Delivery Preference</h3>
                    <div className="ot-preference-controls">
                      <select
                        aria-label="Delivery Preference"
                        value={deliveryPreferenceDraft}
                        onChange={(event) => {
                          setDeliveryPreferenceDraft(event.target.value);
                          setActionError('');
                          setActionNotice('');
                        }}
                        disabled={isUpdatingPreference || selectedOrder.status === 'cancelled'}
                      >
                        <option value="doorstep">Leave at Doorstep</option>
                        <option value="hand-to-me">Hand it to me</option>
                      </select>
                      <button
                        type="button"
                        className="ot-small-action"
                        onClick={handleUpdateDeliveryPreference}
                        disabled={
                          isUpdatingPreference ||
                          deliveryPreferenceDraft === selectedOrder.delivery_preference ||
                          selectedOrder.status === 'cancelled'
                        }
                      >
                        {isUpdatingPreference ? 'Saving…' : 'Save preference'}
                      </button>
                    </div>
                  </div>

                  {actionError && <p className="ot-action-feedback error" role="alert">{actionError}</p>}
                  {actionNotice && <p className="ot-action-feedback success" role="status">{actionNotice}</p>}
                </section>
              </aside>
            </div>

            {isSupportDialogOpen && (
              <div className="ot-dialog-backdrop" onClick={() => setIsSupportDialogOpen(false)}>
                <section
                  className="ot-support-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="ot-support-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="ot-support-close"
                    aria-label="Close contact support"
                    onClick={() => setIsSupportDialogOpen(false)}
                  >
                    ×
                  </button>
                  <h2 id="ot-support-title">Contact Support</h2>
                  <p>Call this number:</p>
                  {sellerContactNumbers.length > 0 ? (
                    <div className="ot-support-numbers">
                      {sellerContactNumbers.map((phone) => (
                        <a key={phone} href={`tel:${phone}`}>{phone}</a>
                      ))}
                    </div>
                  ) : (
                    <p role="status">Seller contact number is unavailable.</p>
                  )}
                </section>
              </div>
            )}

            <section className="ot-invoice">
              <div className="ot-invoice-brand">
                <Icon name="leaf" />
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
