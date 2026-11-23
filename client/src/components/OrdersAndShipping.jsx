import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Icon from './Icon';
import TablePagination, { SortHeader, sortRows, useTableSort } from './TableControls';
import { formatDeliveryDateRange } from '../utils/delivery';
import './OrdersAndShipping.css';

const API_ORIGIN = 'http://localhost:5000';
const AVAILABLE_DRIVERS = ['Ram Shah', 'Ram Shahi', 'Raja Bahadur'];
const ADD_NEW_DRIVER_VALUE = '__add_new_driver__';
const DRIVER_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const generateTrackingNumber = (orderId) => `IC-ORD-${String(orderId).padStart(6, '0')}`;
const STATUS_LABELS = {
  pending: 'Order Confirmed',
  processing: 'Packing',
  shipped: 'Dispatched',
  delivered: 'Delivered',
  cash_received: 'Cash Received',
  cancelled: 'Cancelled',
};
const STATUS_TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['cash_received'],
  cash_received: [],
  cancelled: [],
};

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const getShipmentDeliveryDate = (order, events) => {
  if (order.status === 'cancelled') return 'Cancelled';
  if (order.status === 'delivered') {
    const deliveryEvent = [...(events || [])].reverse().find((event) => event.status === 'delivered');
    return deliveryEvent ? `Delivered ${formatDate(deliveryEvent.created_at)}` : 'Delivered';
  }
  return formatDeliveryDateRange(order.created_at);
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
  const [availableDrivers, setAvailableDrivers] = useState(AVAILABLE_DRIVERS);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState('');
  const [isAddingNewDriver, setIsAddingNewDriver] = useState(false);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverNameError, setNewDriverNameError] = useState('');
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [shipmentFormError, setShipmentFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, handleSort] = useTableSort('id');
  const trackingRequest = useRef(0);
  const detailsTriggerRef = useRef(null);
  const closeDetailsButtonRef = useRef(null);

  const activeSellerId = sellerId || localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  const fetchDrivers = useCallback(async () => {
    if (!token) {
      setDriversLoading(false);
      setDriversError('Please sign in again to view available drivers.');
      return;
    }

    setDriversLoading(true);
    setDriversError('');
    try {
      const response = await axios.get(`${API_ORIGIN}/api/sellers/drivers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!Array.isArray(response.data.drivers) ||
          response.data.drivers.some((driver) => typeof driver !== 'string')) {
        throw new Error('The server returned an invalid driver list.');
      }
      setAvailableDrivers([...new Set([...AVAILABLE_DRIVERS, ...response.data.drivers])]);
    } catch (requestError) {
      console.error('Error fetching seller drivers:', requestError);
      setDriversError(getErrorMessage(requestError, 'Unable to load available drivers.'));
    } finally {
      setDriversLoading(false);
    }
  }, [token]);

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
    setShipmentFormError('');
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
    fetchDrivers();
  }, [fetchDrivers]);

  useEffect(() => {
    fetchTracking(selectedOrderId);
  }, [fetchTracking, selectedOrderId]);

  const getNewDriverNameError = (value) => {
    const name = value.trim();
    if (!name) return '';
    if (name.length > 120) return 'Driver name must be 120 characters or fewer.';
    if (!DRIVER_NAME_PATTERN.test(name)) {
      return 'Use letters, spaces, periods, apostrophes, or hyphens only.';
    }
    if (availableDrivers.some((driver) => driver.toLowerCase() === name.toLowerCase())) {
      return 'This driver is already available. Select it from the list.';
    }
    return '';
  };

  const handleAddDriver = async () => {
    const name = newDriverName.trim();
    if (!name) {
      setNewDriverNameError('Enter a driver name.');
      return;
    }
    const validationError = getNewDriverNameError(name);
    if (validationError) {
      setNewDriverNameError(validationError);
      return;
    }

    setShipmentFormError('');
    setNewDriverNameError('');
    setIsSavingDriver(true);
    try {
      const response = await axios.post(
        `${API_ORIGIN}/api/sellers/drivers`,
        { name },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const addedDriver = response.data.driver?.name;
      if (typeof addedDriver !== 'string' || !addedDriver.trim()) {
        throw new Error('The server returned an invalid driver record.');
      }

      setAvailableDrivers((current) => [...current, addedDriver]);
      setCarrierNameDraft(addedDriver);
      setTrackingNumberDraft(generateTrackingNumber(selectedOrderId));
      setIsAddingNewDriver(false);
      setNewDriverName('');
      setNewDriverNameError('');
      setNotice('Driver added. Update the shipment to assign this driver to the order.');
    } catch (requestError) {
      console.error('Error adding seller driver:', requestError);
      setNewDriverNameError(getErrorMessage(requestError, 'Unable to add this driver.'));
    } finally {
      setIsSavingDriver(false);
    }
  };

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
      return orders.filter((order) => ['pending', 'processing', 'shipped', 'delivered'].includes(order.status));
    }
    if (activeFilter === 'cash_received') return orders.filter((order) => order.status === 'cash_received');
    return orders.filter((order) => order.status === activeFilter);
  }, [activeFilter, orders]);
  const sortedOrders = useMemo(() => sortRows(filteredOrders, sortConfig, (order, key) => {
    const values = {
      id: order.id,
      buyer_name: order.buyer_name,
      items_summary: order.items_summary,
      total_price: order.total_price,
      status: order.status,
    };
    return values[key] ?? '';
  }), [filteredOrders, sortConfig]);
  const orderPageCount = Math.max(1, Math.ceil(sortedOrders.length / pageSize));
  const pagedOrders = sortedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => setCurrentPage(1), [activeFilter, pageSize]);
  useEffect(() => {
    if (currentPage > orderPageCount) setCurrentPage(orderPageCount);
  }, [currentPage, orderPageCount]);

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
    if (statusDraft === 'shipped' && (!carrierNameDraft.trim() || !trackingNumberDraft.trim())) {
      setShipmentFormError('Carrier name and tracking number are required before marking an order as shipped.');
      return;
    }
    if (Boolean(carrierNameDraft.trim()) !== Boolean(trackingNumberDraft.trim())) {
      setShipmentFormError('Enter both a carrier name and tracking number, or leave both blank.');
      return;
    }

    setShipmentFormError('');
    setBusy(true);
    setNotice('');
    try {
      await axios.patch(
        `${API_ORIGIN}/api/orders/${selectedOrder.id}/status`,
        {
          status: statusDraft,
          carrier_name: carrierNameDraft.trim(),
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
          <h2><Icon name="package" />Orders &amp; Shipping</h2>
          <p>Review incoming purchases, prepare packages, and keep buyers updated as orders move.</p>
        </div>
        <button type="button" className="shipping-refresh" onClick={fetchOrders} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </header>

      <nav className="shipping-filters" aria-label="Filter orders">
        {[
          { id: 'all', label: 'All Orders', count: orders.length },
          { id: 'pending', label: 'In Progress', count: orders.filter((order) => ['pending', 'processing', 'shipped', 'delivered'].includes(order.status)).length },
          { id: 'delivered', label: 'Delivered', count: orders.filter((order) => order.status === 'delivered').length },
          { id: 'cash_received', label: 'Cash Received', count: orders.filter((order) => order.status === 'cash_received').length },
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
      {driversError && (
        <div className="shipping-error" role="alert">
          <span>{driversError}</span>
          <button type="button" onClick={fetchDrivers} disabled={driversLoading}>Try again</button>
        </div>
      )}
      {error && (
        <div className="shipping-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={fetchOrders}>Try again</button>
        </div>
      )}

      <div
        className={`shipping-workspace ${isShipmentDetailsOpen && selectedOrder ? 'has-details' : ''}`}
        role="region"
        aria-label="Orders and shipment workspace"
      >
        <div className="shipping-table-card">
          {loading ? (
            <div className="shipping-empty" role="status">Loading orders…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="shipping-empty">
              {orders.length === 0 ? 'No orders have been placed yet.' : 'No orders match this filter.'}
            </div>
          ) : (
            <>
              <div className="shipping-table-scroll">
                <table className="shipping-table">
                  <thead>
                    <tr>
                      <SortHeader label="Order ID" column="id" sortConfig={sortConfig} onSort={handleSort} />
                      <SortHeader label="Customer" column="buyer_name" sortConfig={sortConfig} onSort={handleSort} />
                      <SortHeader label="Tea & Qty" column="items_summary" sortConfig={sortConfig} onSort={handleSort} />
                      <SortHeader label="Total" column="total_price" sortConfig={sortConfig} onSort={handleSort} />
                      <SortHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} />
                      <th scope="col"><span className="shipping-visually-hidden">Details</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedOrders.map((order) => (
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
              <TablePagination
                page={currentPage}
                pageCount={orderPageCount}
                total={sortedOrders.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                itemLabel="orders"
              />
            </>
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
              <span>
                <strong>Delivery address:</strong>{' '}
                {selectedOrder.delivery_address || 'Delivery address not provided'}
              </span>
              <span>
                <strong>Delivery date range:</strong>{' '}
                {getShipmentDeliveryDate(selectedOrder, selectedTracking?.events)}
              </span>
              <span>Placed {formatDate(selectedOrder.created_at)}</span>
            </div>

            <div className="shipping-delivery-preference">
              <span>Buyer delivery preference</span>
              <strong>
                {selectedOrder.delivery_preference === 'hand-to-me'
                  ? 'Hand it to me'
                  : selectedOrder.delivery_preference === 'doorstep'
                    ? 'Leave at Doorstep'
                    : 'Not specified'}
              </strong>
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

            <form className="shipping-update-form" onSubmit={handleUpdateShipment} noValidate>
              <label htmlFor="shipping-status">Update shipment status</label>
              <div className="shipping-update-controls">
                <select
                  id="shipping-status"
                  value={statusDraft || selectedOrder.status || 'pending'}
                  onChange={(event) => {
                    setStatusDraft(event.target.value);
                    setShipmentFormError('');
                  }}
                  disabled={busy || trackingLoading || selectedOrder.status === 'cancelled'}>
                  {availableStatuses.map((status) => (
                    <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                  ))}
                </select>
              </div>
              <div className="shipping-carrier-fields">
                <label htmlFor="shipping-carrier-name">Carrier name</label>
                <select
                  id="shipping-carrier-name"
                  value={isAddingNewDriver ? ADD_NEW_DRIVER_VALUE : carrierNameDraft}
                  onChange={(event) => {
                    if (event.target.value === ADD_NEW_DRIVER_VALUE) {
                      setIsAddingNewDriver(true);
                      setNewDriverName('');
                      setNewDriverNameError('');
                    } else {
                      setIsAddingNewDriver(false);
                      setCarrierNameDraft(event.target.value);
                      setTrackingNumberDraft(
                        event.target.value ? generateTrackingNumber(selectedOrder.id) : ''
                      );
                    }
                    setShipmentFormError('');
                  }}
                  disabled={busy || trackingLoading || driversLoading || selectedOrder.status === 'cancelled'}
                  required={statusDraft === 'shipped'}
                >
                  <option value="">Select a driver</option>
                  {carrierNameDraft && !availableDrivers.includes(carrierNameDraft) && (
                    <option value={carrierNameDraft}>{carrierNameDraft} (current)</option>
                  )}
                  {availableDrivers.map((driver) => (
                    <option key={driver} value={driver}>{driver}</option>
                  ))}
                  <option value={ADD_NEW_DRIVER_VALUE}>Add New Driver...</option>
                </select>
                {isAddingNewDriver && (
                  <div className="shipping-add-driver">
                    <label htmlFor="shipping-new-driver-name">New driver name</label>
                    <input
                      id="shipping-new-driver-name"
                      type="text"
                      value={newDriverName}
                      onChange={(event) => {
                        setNewDriverName(event.target.value);
                        setNewDriverNameError(getNewDriverNameError(event.target.value));
                        setShipmentFormError('');
                      }}
                      maxLength={120}
                      pattern="[A-Za-z][A-Za-z .'-]*"
                      title="Use letters, spaces, periods, apostrophes, or hyphens only."
                      autoComplete="name"
                      aria-invalid={Boolean(newDriverNameError)}
                      aria-describedby={newDriverNameError ? 'shipping-new-driver-error' : undefined}
                      disabled={isSavingDriver}
                    />
                    {newDriverNameError && (
                      <span id="shipping-new-driver-error" className="shipping-field-error" role="alert">
                        {newDriverNameError}
                      </span>
                    )}
                    <div className="shipping-add-driver-actions">
                      <button
                        type="button"
                        onClick={handleAddDriver}
                        disabled={isSavingDriver || !newDriverName.trim() || Boolean(newDriverNameError)}
                      >
                        {isSavingDriver ? 'Adding...' : 'Add Driver'}
                      </button>
                      <button
                        type="button"
                        className="shipping-add-driver-cancel"
                        onClick={() => {
                          setIsAddingNewDriver(false);
                          setNewDriverName('');
                          setNewDriverNameError('');
                          setShipmentFormError('');
                        }}
                        disabled={isSavingDriver}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <label htmlFor="shipping-tracking-number">Tracking number (generated)</label>
                <input
                  id="shipping-tracking-number"
                  type="text"
                  value={trackingNumberDraft}
                  readOnly
                  disabled={busy || trackingLoading || selectedOrder.status === 'cancelled'}
                  required={statusDraft === 'shipped'}
                />
                {shipmentFormError && <span className="shipping-field-error" role="alert">{shipmentFormError}</span>}
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
