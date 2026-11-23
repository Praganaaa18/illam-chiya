// ProductCard.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { getAuthToken } from '../utils/authStorage';
import { getRemainingStock } from '../utils/stock';
import Icon from './Icon';
import './ProductCard.css';

const ProductCard = ({ product, onAddToCart }) => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState('1');
  const packSize = product.pack_size || '100 g';
  const stock = Math.max(0, Math.floor(Number(product.stock_quantity) || 0));
  const cartItems = JSON.parse(localStorage.getItem('cart') || '[]');
  const availableToAdd = getRemainingStock(product, cartItems);
  const isLowStock = stock > 0 && stock <= 10;
  const isOutOfStock = stock === 0;
  const parsedQuantity = Number(quantity);
  const isQuantityValid = quantity !== '' &&
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= availableToAdd;
  const imageUrl = product.image_url
    ? /^https?:\/\//i.test(product.image_url)
      ? product.image_url
      : `http://localhost:5000/${product.image_url.replace(/^\/+/, '')}`
    : 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=400';

  useEffect(() => {
    setQuantity((current) => {
      if (availableToAdd === 0) return '0';
      if (current === '') return current;
      return String(Math.min(availableToAdd, Math.max(1, Number(current) || 1)));
    });
  }, [availableToAdd]);

  const handleAddToCartClick = () => {
    const token = getAuthToken();
    const userRole = localStorage.getItem('userRole');

    // 1. Check if user is logged in as a buyer
    if (!token || userRole !== 'buyer') {
      // If not logged in, direct to login page
      navigate('/login');
    } else {
      if (isOutOfStock || !isQuantityValid) return;
      onAddToCart({
        ...product,
        pack_size: packSize,
      }, parsedQuantity);
    }
  };

  const handleQuantityChange = (event) => {
    const value = event.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setQuantity(value === '' ? '' : String(Math.min(Number(value), availableToAdd)));
    }
  };

  const normalizeQuantity = () => {
    if (quantity === '') {
      setQuantity('1');
      return;
    }
    const normalized = availableToAdd === 0
      ? 0
      : Math.min(availableToAdd, Math.max(1, Number.isFinite(parsedQuantity) ? parsedQuantity : 1));
    setQuantity(String(normalized));
  };

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card-link" aria-label={`View ${product.name}`}>
        <div className="product-image-container">
          <img src={imageUrl} alt={product.name} className="product-image" />
          <span className="product-category">{product.category || 'Tea'}</span>
        </div>
      </Link>

      <div className="product-info">
        <Link to={`/products/${product.id}`} className="product-title-link">
          <h3 className="product-title">{product.name}</h3>
        </Link>
        <p className="product-description">
          {product.description || 'Authentic Himalayan orthodox tea, hand-picked and carefully packed.'}
        </p>

        <span className="product-pack-label">Per Pack Size</span>
        <div className="product-pack-options" aria-label="Pack size">
          <span className="product-pack-option active">{packSize}</span>
        </div>
      </div>

      <div className="product-bottom-row">
        <Link to={`/products/${product.id}`} className="product-price-link" aria-label={`View ${product.name} details and price`}>
          <div className="product-price">
            <span className="currency">Rs.</span>
            <span className="amount">{Number(product.price).toFixed(2)}</span>
            <span className="unit">/ {packSize}</span>
          </div>
        </Link>
        <span className={`product-stock ${isLowStock ? 'low' : isOutOfStock ? 'out' : ''}`}>
          <span aria-hidden="true" />
          {isOutOfStock ? 'Out of stock' : isLowStock ? 'Low stock' : 'In stock'}
        </span>
      </div>

      <div className="product-purchase-row">
        <div className="product-quantity" aria-label="Quantity">
          <button
            type="button"
            onClick={() => setQuantity(String(Math.max(1, (parsedQuantity || 1) - 1)))}
            aria-label="Decrease quantity"
            disabled={availableToAdd === 0 || parsedQuantity <= 1}
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max={availableToAdd}
            step="1"
            value={availableToAdd === 0 ? '0' : quantity}
            onChange={handleQuantityChange}
            onBlur={normalizeQuantity}
            aria-label="Product quantity"
            aria-invalid={availableToAdd > 0 && !isQuantityValid}
            disabled={availableToAdd === 0}
          />
          <button
            type="button"
            onClick={() => setQuantity(String(Math.min(availableToAdd, (parsedQuantity || 0) + 1)))}
            aria-label="Increase quantity"
            disabled={availableToAdd === 0 || parsedQuantity >= availableToAdd}
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddToCartClick}
          className="add-to-cart-btn"
          disabled={isOutOfStock || !isQuantityValid}
        >
          <Icon name="cart" size={17} />
          <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
