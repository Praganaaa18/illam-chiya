// ProductCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ProductCard.css';

const ProductCard = ({ product, onAddToCart }) => {
  const navigate = useNavigate();

  const handleAddToCartClick = () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // 1. Check if user is logged in as a buyer
    if (!token || userRole !== 'buyer') {
      // If not logged in, direct to login page
      navigate('/login');
    } else {
      // 2. If logged in, add to cart and go to cart page
      onAddToCart(product);
      navigate('/cart');
    }
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        {/* Fallback image if product image path is missing */}
        <img 
          src={product.image || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=400'} 
          alt={product.name} 
          className="product-image" 
        />
        <span className="product-category">{product.category || 'Tea'}</span>
      </div>

      <div className="product-info">
        <span className="product-vendor">
          By {product.vendor_name || product.vendor || 'Local Estate'}
        </span>
        <h3 className="product-title">{product.name}</h3>
        <p className="product-description">{product.description}</p>

        <div className="product-bottom-row">
          <div className="product-price">
            <span className="currency">Rs.</span>
            <span className="amount">{product.price}</span>
            <span className="unit">/ pack</span>
          </div>

          <button onClick={handleAddToCartClick} className="add-to-cart-btn">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;