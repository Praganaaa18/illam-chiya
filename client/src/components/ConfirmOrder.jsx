import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import Navbar from './Navbar';
import Icon from './Icon';
import { isValidPhoneNumber, normalizePhoneNumber } from '../utils/validation';
import {
  getCanonicalDistrict,
  getDistrictFromAddress,
  NEPAL_DISTRICTS,
} from '../utils/nepalDistricts';
import './ConfirmOrder.css';

const DELIVERY_ADDRESS_PATTERN = /^[a-zA-Z0-9\s,.-]*$/;
const DELIVERY_ADDRESS_CHARACTER_ERROR =
  'Special characters (like @, #, $, %) are not allowed in Delivery Address.';

const ConfirmOrder = () => {
  const navigate = useNavigate();

  // Load cart items from localStorage
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [submitError, setSubmitError] = useState('');

  // Form details state
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    landmark: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Auth Check
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Load Cart Items
    let savedCart;
    try {
      savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (error) {
      console.error('Unable to read saved cart:', error);
      localStorage.removeItem('cart');
      setSubmitError('Your saved cart could not be read. Please add your items again.');
      return;
    }
    if (!Array.isArray(savedCart) || savedCart.length === 0) {
      navigate('/cart');
    } else {
      setCartItems(savedCart);
    }

    const fallbackName = localStorage.getItem('userName') || '';
    const fallbackPhone = localStorage.getItem('userPhone') || '';
    const fallbackAddress = localStorage.getItem('userAddress') || '';
    setShippingDetails((current) => ({
      ...current,
      fullName: fallbackName,
      phone: fallbackPhone,
      address: fallbackAddress,
      city: getDistrictFromAddress(fallbackAddress),
    }));

    fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load account details.');
        const profileAddress = data.delivery_address || data.address || '';
        setShippingDetails((current) => ({
          ...current,
          fullName: data.full_name || current.fullName,
          phone: data.phone || current.phone,
          address: profileAddress || current.address,
          city: getDistrictFromAddress(profileAddress) || current.city,
        }));
        localStorage.setItem('userName', data.full_name || '');
        localStorage.setItem('userPhone', data.phone || '');
        localStorage.setItem('userAddress', profileAddress || '');
      })
      .catch((profileError) => {
        console.error('Unable to load checkout profile:', profileError);
      });
  }, [navigate]);

  // Totals Calculation
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryCharge = 120;
  const grandTotal = subtotal + deliveryCharge;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const district = name === 'address' ? getDistrictFromAddress(value) : '';
    setShippingDetails((current) => ({
      ...current,
      [name]: value,
      ...(district ? { city: district } : {}),
    }));
    if (name === 'address') {
      setErrors((current) => ({
        ...current,
        address: value && !DELIVERY_ADDRESS_PATTERN.test(value)
          ? DELIVERY_ADDRESS_CHARACTER_ERROR
          : district
            ? 'Do not include the district in the delivery address. Select it in City / District.'
            : '',
      }));
    } else if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!shippingDetails.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!shippingDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!isValidPhoneNumber(shippingDetails.phone)) {
      newErrors.phone = 'Enter a valid Nepal mobile number (10 digits).';
    }
    if (!shippingDetails.address.trim()) {
      newErrors.address = 'Delivery address is required';
    } else if (!DELIVERY_ADDRESS_PATTERN.test(shippingDetails.address)) {
      newErrors.address = DELIVERY_ADDRESS_CHARACTER_ERROR;
    } else if (getDistrictFromAddress(shippingDetails.address)) {
      newErrors.address = 'Do not include the district in the delivery address. Select it in City / District.';
    }
    if (!shippingDetails.city.trim()) {
      newErrors.city = 'City / District is required';
    } else if (!getCanonicalDistrict(shippingDetails.city)) {
      newErrors.city = 'Select a valid Nepal district from the suggestions.';
    }
    if (!shippingDetails.landmark.trim()) newErrors.landmark = 'Nearby landmark is required.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setSubmitError('');

    const token = localStorage.getItem('token');
    const orderPayload = {
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        pack_size: item.pack_size || '100 g',
      })),
      shipping_address: `${shippingDetails.address.trim()}, ${getCanonicalDistrict(shippingDetails.city)}`,
      landmark: shippingDetails.landmark.trim(),
      phone: normalizePhoneNumber(shippingDetails.phone),
      recipient_name: shippingDetails.fullName,
      payment_method: 'COD',
      total_amount: grandTotal,
      notes: shippingDetails.notes
    };

    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        setSubmitError(data.message || 'Failed to place order. Please try again.');
        return;
      }
      if (!data.order_id) {
        throw new Error('The server did not return an order ID. Please contact support before retrying.');
      }

      localStorage.removeItem('cart');
      setOrderId(data.order_id);
      setOrderPlaced(true);
    } catch (err) {
      console.error('Order Submission Error:', err);
      setSubmitError(err.message || 'Unable to place your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="order-success-page">
        <Link to="/" className="success-back-home" aria-label="Back to home">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5m7 7-7-7 7-7" />
          </svg>
          <span>Back to Home</span>
        </Link>
        <div className="success-card">
          <Icon name="leaf" className="success-icon" size={48} />
          <h2>Order Confirmed!</h2>
          <p className="order-id-text">Order ID: #{orderId}</p>
          <p className="success-description">
            Thank you for supporting authentic Himalayan tea growers! We are preparing your fresh Ilam tea harvest for dispatch.
          </p>
          <div className="success-actions">
            <Link to="/" className="home-btn">Back to Home</Link>
            <Link to="/order-tracking" className="track-order-btn">Track your package</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="confirm-order-container">
      <Navbar cartCount={cartItems.length} showSearch={false} />
      {/* Header */}
      <div className="checkout-header">
        <Link to="/cart" className="back-cart-link" aria-label="Back to cart">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5m7 7-7-7 7-7" />
          </svg>
          <span>Back to Cart</span>
        </Link>
        <h1>Confirm Your Tea Order</h1>
      </div>

      <div className="checkout-grid">
        {/* Shipping & Payment Form */}
        <form onSubmit={handlePlaceOrder} className="checkout-form" noValidate>
          {submitError && <p className="error-text" role="alert">{submitError}</p>}
          {/* Shipping Details */}
          <div className="form-section">
            <h2>1. Shipping Details</h2>
            
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                placeholder="e.g. Jenisha Karki"
                value={shippingDetails.fullName}
                onChange={handleInputChange}
                className={errors.fullName ? 'input-err' : ''}
              />
              {errors.fullName && <span className="error-text">{errors.fullName}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="98XXXXXXXX"
                  value={shippingDetails.phone}
                  onChange={handleInputChange}
                  inputMode="tel"
                  maxLength="16"
                  className={errors.phone ? 'input-err' : ''}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="checkout-city">City / District *</label>
                <input
                  id="checkout-city"
                  type="text"
                  name="city"
                  list="checkout-district-options"
                  value={shippingDetails.city}
                  onChange={handleInputChange}
                  autoComplete="off"
                  className={errors.city ? 'input-err' : ''}
                  placeholder="Type or select a district"
                />
                <datalist id="checkout-district-options">
                  {NEPAL_DISTRICTS.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </datalist>
                {errors.city && <span className="error-text">{errors.city}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Full Delivery Address *</label>
              <input
                type="text"
                name="address"
                placeholder="Street name, house no., landmark"
                value={shippingDetails.address}
                onChange={handleInputChange}
                className={errors.address ? 'input-err' : ''}
              />
              {errors.address && <span className="error-text">{errors.address}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="checkout-landmark">Nearby Landmark *</label>
              <input
                id="checkout-landmark"
                type="text"
                name="landmark"
                placeholder="e.g. Near the community temple"
                value={shippingDetails.landmark}
                onChange={handleInputChange}
                maxLength={150}
                required
                className={errors.landmark ? 'input-err' : ''}
              />
              {errors.landmark && <span className="error-text">{errors.landmark}</span>}
            </div>

            <div className="form-group">
              <label>Special Delivery Instructions (Optional)</label>
              <textarea
                name="notes"
                placeholder="Notes for courier (e.g. deliver during office hours)"
                value={shippingDetails.notes}
                onChange={handleInputChange}
                rows="3"
              />
            </div>
          </div>

          {/* Locked Payment Method */}
          <div className="form-section">
            <h2>2. Payment Method</h2>
            <div className="payment-options">
              <div className="payment-card selected">
                <div className="payment-info">
                  <strong><Icon name="wallet" size={17} />Cash on Delivery (COD)</strong>
                  <span>Pay with cash upon receiving your tea package at your doorstep.</span>
                </div>
              </div>
            </div>
          </div>

          {submitError && <p className="error-text" role="alert">{submitError}</p>}
          <button type="submit" className="place-order-btn" disabled={loading}>
            {loading ? 'Processing Order...' : `Confirm Order • Rs. ${grandTotal}`}
          </button>
        </form>

        {/* Order Summary Sidebar */}
        <div className="order-summary-sidebar">
          <h2>Order Items ({cartItems.length})</h2>
          <div className="summary-items">
            {cartItems.map((item) => (
              <div key={item.id} className="summary-item">
                <img
                  src={item.image_url ? `http://localhost:5000${item.image_url}` : item.image || 'https://via.placeholder.com/60'} 
                  alt={item.name} 
                />
                <div className="summary-item-info">
                  <h4>{item.name}</h4>
                  <span>{item.pack_size || '100 g'} · Qty: {item.quantity}</span>
                </div>
                <span className="summary-item-price">Rs. {item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="summary-totals">
            <div className="total-row">
              <span>Items Subtotal</span>
              <span>Rs. {subtotal}</span>
            </div>
            <div className="total-row">
              <span>Shipping Fee</span>
              <span>Rs. {deliveryCharge}</span>
            </div>
            <div className="divider"></div>
            <div className="total-row grand-total">
              <span>Grand Total</span>
              <span>Rs. {grandTotal}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmOrder;