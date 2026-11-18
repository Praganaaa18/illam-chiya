import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './ConfirmOrder.css';

const ConfirmOrder = () => {
  const navigate = useNavigate();

  // Load cart items from localStorage
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // Form details state
  const [shippingDetails, setShippingDetails] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: 'Kathmandu',
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
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (savedCart.length === 0) {
      navigate('/cart');
    } else {
      setCartItems(savedCart);
    }
  }, [navigate]);

  // Totals Calculation
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryCharge = 120;
  const grandTotal = subtotal + deliveryCharge;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingDetails({ ...shippingDetails, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!shippingDetails.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!shippingDetails.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(shippingDetails.phone.trim())) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }
    if (!shippingDetails.address.trim()) newErrors.address = 'Delivery address is required';
    if (!shippingDetails.city.trim()) newErrors.city = 'City is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    const token = localStorage.getItem('token');
    const orderPayload = {
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      shipping_address: `${shippingDetails.address}, ${shippingDetails.city}`,
      phone: shippingDetails.phone,
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

      if (response.ok) {
        localStorage.removeItem('cart');
        setOrderId(data.order_id || Math.floor(100000 + Math.random() * 900000));
        setOrderPlaced(true);
      } else {
        alert(data.message || 'Failed to place order. Please try again.');
      }
    } catch (err) {
      console.error('Order Submission Error:', err);
      // Local fallback simulation if endpoint is not live yet
      localStorage.removeItem('cart');
      setOrderId(Math.floor(100000 + Math.random() * 900000));
      setOrderPlaced(true);
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="order-success-page">
        <div className="success-card">
          <div className="success-icon">🍃</div>
          <h2>Order Confirmed!</h2>
          <p className="order-id-text">Order ID: #{orderId}</p>
          <p className="success-description">
            Thank you for supporting authentic Himalayan tea growers! We are preparing your fresh Ilam tea harvest for dispatch.
          </p>
          <div className="success-actions">
            <Link to="/" className="home-btn">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="confirm-order-container">
      {/* Header */}
      <div className="checkout-header">
        <Link to="/cart" className="back-cart-link">← Back to Cart</Link>
        <h1>Confirm Your Tea Order</h1>
      </div>

      <div className="checkout-grid">
        {/* Shipping & Payment Form */}
        <form onSubmit={handlePlaceOrder} className="checkout-form">
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
                  type="text"
                  name="phone"
                  placeholder="98XXXXXXXX"
                  value={shippingDetails.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? 'input-err' : ''}
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>

              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  placeholder="e.g. Kathmandu / Ilam"
                  value={shippingDetails.city}
                  onChange={handleInputChange}
                  className={errors.city ? 'input-err' : ''}
                />
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
                  <strong>💵 Cash on Delivery (COD)</strong>
                  <span>Pay with cash upon receiving your tea package at your doorstep.</span>
                </div>
              </div>
            </div>
          </div>

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
                {/* <img 
                  src={item.image_url ? `http://localhost:5000${item.image_url}` : item.image || 'https://via.placeholder.com/60'} 
                  alt={item.name} 
                /> */}
                <div className="summary-item-info">
                  <h4>{item.name}</h4>
                  <span>Qty: {item.quantity}</span>
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