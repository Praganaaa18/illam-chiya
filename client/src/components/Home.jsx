// --- Subtitle: Import React, React Router Hooks, and Components ---
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import './Home.css';

const Home = () => {
  // --- Subtitle: State Variables ---
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  // --- Subtitle: Fetch Products & Calculate Cart Count on Load ---
  useEffect(() => {
    // 1. Fetch active tea products from backend API
    fetch('http://localhost:5000/api/products')
      .then((response) => response.json())
      .then((data) => {
        // Filter to display active listings
        setProducts(data.filter((item) => item.is_active !== false));
      })
      .catch((error) => console.error('Error connecting to backend:', error));

    // 2. Load existing cart count from localStorage
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = savedCart.reduce((acc, item) => acc + item.quantity, 0);
    setCartCount(totalItems);
  }, []);

  // --- Subtitle: Navigation Handler for Cart Button ---
  const handleCartNavigation = () => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'buyer') {
      navigate('/login');
    } else {
      navigate('/cart');
    }
  };

  // --- Subtitle: Add to Cart Action Handler ---
  const handleAddToCart = (product) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    // Authentication Guard
    if (!token || userRole !== 'buyer') {
      navigate('/login');
      return;
    }

    // Add item to local storage cart state
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItemIndex = existingCart.findIndex((item) => item.id === product.id);

    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity += 1;
    } else {
      existingCart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(existingCart));

    // Update state badge counter and navigate to Cart
    const updatedCount = existingCart.reduce((acc, item) => acc + item.quantity, 0);
    setCartCount(updatedCount);
    navigate('/cart');
  };

  return (
    <div>
      {/* ==========================================
          HEADER / NAVIGATION BAR
          ========================================== */}
      <header className="navbar">
        <div className="logo-container">
          <span>🍃</span>
          <span>ILAM CHIYA</span>
        </div>

        <nav className="nav-links">
          <Link to="/" className="nav-link">🏠 Home</Link>
          <button className="nav-button">🔍 Search</button>
          
          {/* Protected Cart Navigation Button */}
          <button onClick={handleCartNavigation} className="nav-button">
            🛒 Cart <span className="cart-badge">{cartCount}</span>
          </button>

          <Link to="/login" className="nav-link">👤 Log In</Link>
        </nav>
      </header>

      {/* ==========================================
          HERO BANNER SECTION
          ========================================== */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-subtitle">EASTERN NEPAL · EST. 1946</span>
          <h1 className="hero-title">Illam Chiya — Handcrafted teas grown at 5,000 feet elevation</h1>
          <p className="hero-description">
            Single-origin orthodox teas, hand-picked by skilled workers and shipped directly from our Himalayan garden to your table.
          </p>
          <button className="primary-btn">Discover Our Teas</button>
        </div>

        <div className="hero-badges">
          <div className="badge-card">
            <strong>5,000 ft</strong>
            <span>Elevation</span>
          </div>
          <div className="badge-card">
            <strong>4th Gen</strong>
            <span>Family Estate</span>
          </div>
          <div className="badge-card">
            <strong>Orthodox</strong>
            <span>Process</span>
          </div>
        </div>
      </section>

      {/* ==========================================
          PRODUCTS DISPLAY SECTION
          ========================================== */}
      <section className="products-section">
        <h2 className="section-title">Featured Harvests</h2>
        
        <div className="product-grid">
          {products.length > 0 ? (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))
          ) : (
            <p className="no-products-text">No active teas currently available.</p>
          )}
        </div>

        <div className="center-container">
          <button className="secondary-btn">View All Teas</button>
        </div>
      </section>

      {/* ==========================================
          FOOTER SECTION
          ========================================== */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <h3>🍃 ILLAM CHIYA</h3>
            <p>
              Grown at 5,000 feet in the Himalayan foothills of eastern Nepal. Every cup is a product of patience, precision, and purpose — direct from our garden to your table.
            </p>
            <div className="social-links">
              <span>IG</span> <span>FB</span> <span>X</span> <span>YT</span>
            </div>
          </div>

          <div className="footer-column">
            <h4>Shop</h4>
            <ul>
              <li>All Teas</li>
              <li>White Tea</li>
              <li>Green Tea</li>
              <li>Black Tea</li>
              <li>Oolong</li>
              <li>Gift Sets</li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Support</h4>
            <ul>
              <li>Contact Us</li>
              <li>Shipping & Returns</li>
              <li>FAQ</li>
              <li>Wholesale</li>
              <li>Track Order</li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Learn</h4>
            <ul>
              <li>Our Story</li>
              <li>The Estate</li>
              <li>Tea Grades</li>
              <li>Brewing Guide</li>
              <li>Journal</li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Ilam Chiya. All rights reserved. Grown in Nepal, shipped worldwide.</p>
          <div className="footer-links">
            <span>Privacy Policy</span>
            <span>Terms of Use</span>
            <span>Cookie Settings</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;