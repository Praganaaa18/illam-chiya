import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Cart.css';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
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
  }, [navigate]);

  // Update localStorage whenever cart items state changes
  const updateLocalStorage = (updatedItems) => {
    setCartItems(updatedItems);
    localStorage.setItem('cart', JSON.stringify(updatedItems));
  };

  // Quantity handlers
  const handleIncreaseQty = (id) => {
    const updated = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    updateLocalStorage(updated);
  };

  const handleDecreaseQty = (id) => {
    const updated = cartItems
      .map((item) =>
        item.id === id ? { ...item, quantity: item.quantity - 1 } : item
      )
      .filter((item) => item.quantity > 0);
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
      <div className="cart-header">
        <Link to="/" className="back-link">← Continue Shopping</Link>
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
                    item.image_url
                      ? `http://localhost:5000${item.image_url}`
                      : item.image || 'https://via.placeholder.com/100'
                  }
                  alt={item.name}
                  className="cart-item-img"
                />
                <div className="cart-item-details">
                  <h3>{item.name}</h3>
                  <p className="item-price">Rs. {item.price} / pack</p>
                </div>

                <div className="qty-controls">
                  <button onClick={() => handleDecreaseQty(item.id)}>-</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => handleIncreaseQty(item.id)}>+</button>
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