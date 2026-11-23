import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import Navbar from './Navbar';
import './Cart.css';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [quantityErrors, setQuantityErrors] = useState({});
  const navigate = useNavigate();

  // 1. Auth & Load Cart Guard
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'buyer') {
      navigate('/login');
      return;
    }

    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCartItems(savedCart);
    setQuantityDrafts(Object.fromEntries(
      savedCart.map((item) => [item.id, String(item.quantity)])
    ));
  }, [navigate]);

  // Update localStorage whenever cart items state changes
  const updateLocalStorage = (updatedItems) => {
    setCartItems(updatedItems);
    localStorage.setItem('cart', JSON.stringify(updatedItems));
  };

  const getStock = (item) => {
    const stock = Number(item.stock_quantity);
    return Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 99;
  };

  // Quantity handlers
  const handleIncreaseQty = (id) => {
    const updated = cartItems.map((item) => {
      if (item.id !== id) return item;
      const quantity = Math.min(getStock(item), (Number(item.quantity) || 0) + 1);
      setQuantityDrafts((drafts) => ({ ...drafts, [id]: String(quantity) }));
      setQuantityErrors((errors) => ({ ...errors, [id]: '' }));
      return { ...item, quantity };
    });
    updateLocalStorage(updated);
  };

  const handleDecreaseQty = (id) => {
    const updated = cartItems
      .map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, (Number(item.quantity) || 1) - 1) } : item
      )
      .filter((item) => item.quantity > 0);
    updated.forEach((item) => {
      if (item.id === id) {
        setQuantityDrafts((drafts) => ({ ...drafts, [id]: String(item.quantity) }));
        setQuantityErrors((errors) => ({ ...errors, [id]: '' }));
      }
    });
    updateLocalStorage(updated);
  };

  const handleQuantityChange = (id, value) => {
    if (value !== '' && !/^\d+$/.test(value)) return;

    setQuantityDrafts((drafts) => ({ ...drafts, [id]: value }));
    const item = cartItems.find((cartItem) => cartItem.id === id);
    if (!item) return;

    const stock = getStock(item);
    if (value === '') {
      setQuantityErrors((errors) => ({ ...errors, [id]: 'Quantity is required.' }));
      return;
    }

    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setQuantityErrors((errors) => ({ ...errors, [id]: 'Enter a whole number of 1 or more.' }));
      return;
    }
    if (quantity > stock) {
      setQuantityErrors((errors) => ({ ...errors, [id]: `Maximum available stock is ${stock}.` }));
      return;
    }

    setQuantityErrors((errors) => ({ ...errors, [id]: '' }));
    const updated = cartItems.map((cartItem) =>
      cartItem.id === id ? { ...cartItem, quantity } : cartItem
    );
    updateLocalStorage(updated);
  };

  const handleQuantityBlur = (id) => {
    const item = cartItems.find((cartItem) => cartItem.id === id);
    if (!item) return;

    const rawValue = quantityDrafts[id];
    const parsed = Number(rawValue);
    const stock = getStock(item);
    let normalized = 1;

    if (rawValue !== '' && Number.isInteger(parsed) && parsed > 0) {
      normalized = Math.min(parsed, stock);
    }

    setQuantityDrafts((drafts) => ({ ...drafts, [id]: String(normalized) }));
    setQuantityErrors((errors) => ({
      ...errors,
      [id]: parsed > stock ? `Quantity adjusted to available stock (${stock}).` : '',
    }));
    const updated = cartItems.map((cartItem) =>
      cartItem.id === id ? { ...cartItem, quantity: normalized } : cartItem
    );
    updateLocalStorage(updated);
  };

  const handleRemoveItem = (id) => {
    const updated = cartItems.filter((item) => item.id !== id);
    updateLocalStorage(updated);
  };

  // Totals
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const deliveryCharge = cartItems.length > 0 ? 120 : 0;
  const grandTotal = subtotal + deliveryCharge;

  return (
    <div className="cart-container">
      <Navbar cartCount={cartItems.length} showSearch={false} />
      <div className="cart-header">
        <Link to="/" className="back-link" aria-label="Back to home">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5m7 7-7-7 7-7" />
          </svg>
          <span>Back to Home</span>
        </Link>
        <h1>Your Tea Cart</h1>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <p>Your cart is empty.</p>
          <Link to="/" className="shop-btn">Browse Teas</Link>
        </div>
      ) : (
        <div className="cart-grid">
          <div className="cart-items-list">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item-card">
                <img
                  src={
                    item.image_url && /^https?:\/\//i.test(item.image_url)
                      ? item.image_url
                      : item.image_url
                        ? `http://localhost:5000/${item.image_url.replace(/^\/+/, '')}`
                        : item.image || 'https://via.placeholder.com/100'
                  }
                  alt={item.name}
                  className="cart-item-img"
                />
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  <p className="item-price">Rs. {item.price} / {item.pack_size || '100 g'}</p>
                </div>

                <div className="qty-control-wrap">
                  <div className={`qty-controls${quantityErrors[item.id] ? ' invalid' : ''}`}>
                    <button
                      type="button"
                      aria-label={`Decrease quantity for ${item.name}`}
                      onClick={() => handleDecreaseQty(item.id)}
                      disabled={Number(item.quantity) <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={getStock(item)}
                      step="1"
                      value={quantityDrafts[item.id] ?? String(item.quantity)}
                      onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                      onBlur={() => handleQuantityBlur(item.id)}
                      aria-label={`Quantity for ${item.name}`}
                      aria-invalid={Boolean(quantityErrors[item.id])}
                    />
                    <button
                      type="button"
                      aria-label={`Increase quantity for ${item.name}`}
                      onClick={() => handleIncreaseQty(item.id)}
                      disabled={Number(item.quantity) >= getStock(item)}
                    >
                      +
                    </button>
                  </div>
                  {quantityErrors[item.id] && (
                    <span className="qty-error" role="alert">{quantityErrors[item.id]}</span>
                  )}
                </div>

                <div className="cart-item-total">
                  Rs. {item.price * item.quantity}
                </div>

                <button
                  className="remove-btn"
                  onClick={() => handleRemoveItem(item.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary-card">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <span>Rs. {subtotal}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Charge</span>
              <span>Rs. {deliveryCharge}</span>
            </div>
            <hr />
            <div className="summary-row grand-total">
              <span>Grand Total</span>
              <span>Rs. {grandTotal}</span>
            </div>

            <button
              onClick={() => navigate('/confirm-order')}
              className="checkout-btn"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;