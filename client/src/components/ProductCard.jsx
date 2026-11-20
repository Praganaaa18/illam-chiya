// ProductCard.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Icon from './Icon';
import './ProductCard.css';

const ProductCard = ({ product, onAddToCart }) => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const packSize = product.pack_size || '100 g';
  const stock = Math.max(0, Number(product.stock_quantity) || 0);
  const isLowStock = stock > 0 && stock <= 10;
  const isOutOfStock = stock === 0;
  const imageUrl = product.image_url
    ? /^https?:\/\//i.test(product.image_url)
      ? product.image_url
      : `http://localhost:5000/${product.image_url.replace(/^\/+/, '')}`
    : 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=400';

  const handleAddToCartClick = () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // 1. Check if user is logged in as a buyer
    if (!token || userRole !== 'buyer') {
      // If not logged in, direct to login page
      navigate('/login');
    } else {
      if (isOutOfStock) return;
      onAddToCart({
        ...product,
        pack_size: packSize,
      }, quantity);
    }
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
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">−</button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((value) => Math.min(stock || 99, value + 1))} aria-label="Increase quantity">+</button>
        </div>
        <button
          type="button"
          onClick={handleAddToCartClick}
          className="add-to-cart-btn"
          disabled={isOutOfStock}
        >
          <Icon name="cart" size={17} />
          <span>{isOutOfStock ? 'Unavailable' : 'Add to Cart'}</span>
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
