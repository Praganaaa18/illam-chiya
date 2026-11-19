import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './OrdersAndShipping.css';

const API_ORIGIN = 'http://localhost:5000';
const STATUS_LABELS = {
  pending: 'Order Confirmed',
  processing: 'Packing',
  shipped: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
const STATUS_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const OrdersAndShipping = ({ sellerId }) => {
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isShipmentDetailsOpen, setIsShipmentDetailsOpen] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [statusDraft, setStatusDraft] = useState('');
  const [carrierNameDraft, setCarrierNameDraft] = useState('');
  const [trackingNumberDraft, setTrackingNumberDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [notice, setNotice] = useState('');
  const trackingRequest = useRef(0);
  const detailsTriggerRef = useRef(null);
  const closeDetailsButtonRef = useRef(null);

  const activeSellerId = sellerId || localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const fetchOrders = useCallback(async () => {
    if (!activeSellerId || !token) {
      setError('Please sign in again to view your orders.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_ORIGIN}/api/orders`, {
        params: { seller_id: activeSellerId },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!Array.isArray(response.data)) {
        throw new Error('The server returned an invalid order list.');
      }
      setOrders(response.data);
      setSelectedOrderId((currentId) => (
        response.data.some((order) => order.id === currentId)
          ? currentId
          : response.data[0]?.id || null
      ));
    } catch (requestError) {
      console.error('Error fetching seller orders:', requestError);
      setError(getErrorMessage(requestError, 'Unable to load orders. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [activeSellerId, token]);

  const fetchTracking = useCallback(async (orderId) => {
    const requestId = trackingRequest.current + 1;
    trackingRequest.current = requestId;
    if (!orderId || !token) {
      setTracking(null);
      setTrackingLoading(false);
      setCarrierNameDraft('');
      setTrackingNumberDraft('');
      return;
    }
    setTracking(null);
    setStatusDraft('');
    setCarrierNameDraft('');
    setTrackingNumberDraft('');
    setTrackingError('');
    setTrackingLoading(true);
    try {
      const response = await axios.get(`${API_ORIGIN}/api/orders/${orderId}/tracking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (requestId === trackingRequest.current) {
        setTracking(response.data);
        setStatusDraft(response.data.status || 'pending');
        setCarrierNameDraft(response.data.carrier_name || '');
        setTrackingNumberDraft(response.data.tracking_number || '');
      }
    } catch (requestError) {
      console.error('Error fetching shipment history:', requestError);
      if (requestId === trackingRequest.current) {
        setTracking(null);
        setTrackingError(getErrorMessage(requestError, 'Unable to load shipment history.'));
      }
    } finally {
      if (requestId === trackingRequest.current) setTrackingLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchTracking(selectedOrderId);
  }, [fetchTracking, selectedOrderId]);

  useEffect(() => {
    if (!isShipmentDetailsOpen) return undefined;

    const detailsTrigger = detailsTriggerRef.current;
    const closeButton = closeDetailsButtonRef.current;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsShipmentDetailsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    if (closeButton) closeButton.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (detailsTrigger) detailsTrigger.focus();
    };
  }, [isShipmentDetailsOpen]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    if (activeFilter === 'pending') {
      return orders.filter((order) => ['pending', 'processing', 'shipped'].includes(order.status));
    }
    return orders.filter((order) => order.status === activeFilter);
  }, [activeFilter, orders]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId);
  const selectedTracking = tracking && String(tracking.id) === String(selectedOrderId)
    ? tracking
    : null;
  const availableStatuses = selectedOrder
    ? [selectedOrder.status, ...(STATUS_TRANSITIONS[selectedOrder.status] || [])]
    : [];
  const carrierDetailsChanged = Boolean(selectedTracking) && (
    carrierNameDraft.trim() !== (selectedTracking.carrier_name || '') ||
    trackingNumberDraft.trim() !== (selectedTracking.tracking_number || '')
  );
  const statusChanged = Boolean(selectedOrder) && statusDraft !== selectedOrder.status;
  const shipmentChanged = statusChanged || carrierDetailsChanged;

  const handleUpdateShipment = async (event) => {
    event.preventDefault();
    if (!selectedOrder || !token || !shipmentChanged) return;

    setBusy(true);
    setNotice('');
    try {
      await axios.patch(
        `${API_ORIGIN}/api/orders/${selectedOrder.id}/status`,
        {
          status: statusDraft,
          carrier_name: carrierNameDraft.trim(),
          tracking_number: trackingNumberDraft.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotice(statusChanged
        ? `Shipment updated to ${STATUS_LABELS[statusDraft] || statusDraft}.`
        : 'Carrier details updated successfully.');
      await fetchOrders();
      await fetchTracking(selectedOrder.id);
    } catch (requestError) {
      console.error('Error updating shipment status:', requestError);
      setNotice(getErrorMessage(requestError, 'Could not update shipment. Please try again.'));
      setStatusDraft(selectedOrder.status || 'pending');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="shipping-page">
      <header className="shipping-heading">
        <div>
          <h2>📦 Orders &amp; Shipping</h2>
          <p>Review incoming purchases, prepare packages, and keep buyers updated as orders move.</p>
        </div>
        <button type="button" className="shipping-refresh" onClick={fetchOrders} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </header>

      <nav className="shipping-filters" aria-label="Filter orders">
        {[
          { id: 'all', label: 'All Orders', count: orders.length },
          { id: 'pending', label: 'In Progress', count: orders.filter((order) => ['pending', 'processing', 'shipped'].includes(order.status)).length },
          { id: 'delivered', label: 'Delivered', count: orders.filter((order) => order.status === 'delivered').length },
        ].map((filter) => (
          <button
            type="button"
            key={filter.id}
            className={`shipping-filter ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
            aria-pressed={activeFilter === filter.id}>
            {filter.label} <span>{filter.count}</span>
          </button>
        ))}
      </nav>

      {notice && <div className="shipping-notice" role="status">{notice}</div>}
      {error && (
        <div className="shipping-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={fetchOrders}>Try again</button>
        </div>
      )}

      <div className={`shipping-workspace ${isShipmentDetailsOpen && selectedOrder ? 'has-details' : ''}`}>
        <div className="shipping-table-card">
          {loading ? (
            <div className="shipping-empty" role="status">Loading orders…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="shipping-empty">
              {orders.length === 0 ? 'No orders have been placed yet.' : 'No orders match this filter.'}
            </div>
          ) : (
            <div className="shipping-table-scroll">
              <table className="shipping-table">
                <thead>
                  <tr>
                    <th scope="col">Order ID</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Tea &amp; Qty</th>
                    <th scope="col">Total</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="shipping-visually-hidden">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={selectedOrderId === order.id ? 'selected' : ''}
                      aria-selected={selectedOrderId === order.id}>
                      <td className="shipping-order-id">#IC-{order.id}</td>
                      <td>
                        <strong>{order.buyer_name || 'Buyer'}</strong>
                        <small>{order.phone || 'Phone not provided'}</small>
                      </td>
                      <td className="shipping-items" title={order.items_summary}>{order.items_summary || 'Order items'}</td>
                      <td className="shipping-total">NPR {Number(order.total_price || 0).toLocaleString()}</td>
                      <td>
                        <span className={`shipping-status ${order.status || 'pending'}`}>
                          {STATUS_LABELS[order.status] || order.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="shipping-details-button"
                          onClick={(event) => {
                            setNotice('');
                            setSelectedOrderId(order.id);
                            detailsTriggerRef.current = event.currentTarget;
                            setIsShipmentDetailsOpen(true);
                          }}
                          aria-label={`View tracking for order ${order.id}`}>
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isShipmentDetailsOpen && selectedOrder && (
          <aside
            className="shipping-detail-card"
            aria-label={`Shipment details for order ${selectedOrder.id}`}
          >
            <div className="shipping-detail-toolbar">
              <span className="shipping-detail-eyebrow">Shipment details</span>
              <button
                ref={closeDetailsButtonRef}
                type="button"
                className="shipping-details-close"
                aria-label="Close shipment details"
                onClick={() => setIsShipmentDetailsOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="shipping-detail-heading">
              <h3>Order #IC-{selectedOrder.id}</h3>
              <span className={`shipping-status ${selectedOrder.status || 'pending'}`}>
                {STATUS_LABELS[selectedOrder.status] || selectedOrder.status || 'Pending'}
              </span>
            </div>

            <div className="shipping-customer">
              <strong>{selectedOrder.buyer_name || 'Buyer'}</strong>
              <span>{selectedOrder.phone || 'Phone not provided'}</span>
              <span>{selectedOrder.delivery_address || 'Delivery address not provided'}</span>
              <span>Placed {formatDate(selectedOrder.created_at)}</span>
            </div>

            <h4 className="shipping-timeline-title">Tracking updates</h4>
            {trackingLoading ? (
              <div className="shipping-empty compact" role="status">Loading shipment history…</div>
            ) : trackingError ? (
              <div className="shipping-error" role="alert">
                <span>{trackingError}</span>
                <button type="button" onClick={() => fetchTracking(selectedOrder.id)}>Retry</button>
              </div>
            ) : (
              <ol className="shipping-timeline">
                {(selectedTracking?.events || []).map((item, index) => (
                  <li className="shipping-timeline-event" key={`${item.created_at}-${index}`}>
                    <span className={`shipping-timeline-marker ${item.status || ''}`} aria-hidden="true">✓</span>
                    <div>
                      <strong>{item.description}</strong>
                      <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
                    </div>
                  </li>
                ))}
                {!trackingLoading && (!selectedTracking?.events || selectedTracking.events.length === 0) && (
                  <li className="shipping-timeline-empty">No shipment updates have been recorded.</li>
                )}
              </ol>
            )}

            <form className="shipping-update-form" onSubmit={handleUpdateShipment}>
              <label htmlFor="shipping-status">Update shipment status</label>
              <div className="shipping-update-controls">
                <select
                  id="shipping-status"
                  value={statusDraft || selectedOrder.status || 'pending'}
                  onChange={(event) => setStatusDraft(event.target.value)}
                  disabled={busy || trackingLoading || selectedOrder.status === 'cancelled'}>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <div className="shipping-carrier-fields">
                <label htmlFor="shipping-carrier-name">Carrier name</label>
                <input
                  id="shipping-carrier-name"
                  type="text"
                  value={carrierNameDraft}
                  onChange={(event) => setCarrierNameDraft(event.target.value)}
                  maxLength={120}
                  autoComplete="organization"
                  disabled={busy || trackingLoading || selectedOrder.status === 'cancelled'}
                  required={statusDraft === 'shipped'}
                />
                <label htmlFor="shipping-tracking-number">Tracking number</label>
                <input
                  id="shipping-tracking-number"
                  type="text"
                  inputMode="numeric"
                  value={trackingNumberDraft}
                  onChange={(event) => setTrackingNumberDraft(event.target.value)}
                  maxLength={100}
                  autoComplete="off"
                  disabled={busy || trackingLoading || selectedOrder.status === 'cancelled'}
                  required={statusDraft === 'shipped'}
                />
              </div>
              <button
                type="submit"
                disabled={busy || trackingLoading || !statusDraft || !shipmentChanged || selectedOrder.status === 'cancelled'}>
                {busy ? 'Saving…' : 'Update Shipment'}
              </button>
            </form>
          </aside>
        )}
      </div>
    </section>
  );
};

export default OrdersAndShipping;
