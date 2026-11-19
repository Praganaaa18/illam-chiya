// --- Subtitle: Import React, React Router Hooks, and Components ---
import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import './Home.css';

const Home = () => {
  // --- Subtitle: State Variables ---
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const navigate = useNavigate();
  const productsSectionRef = useRef(null);
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  // --- Subtitle: Fetch Products & Calculate Cart Count on Load ---
  useEffect(() => {
    fetch('http://localhost:5000/api/products')
      .then((response) => response.json())
      .then((data) => {
        setProducts(data.filter((item) => item.is_active !== false));
      })
      .catch((error) => console.error('Error connecting to backend:', error));

    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = savedCart.reduce((acc, item) => acc + item.quantity, 0);
    setCartCount(totalItems);
  }, []);

  // --- Subtitle: Search Input Handler ---
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Smoothly scroll to the products section when user starts typing
    if (productsSectionRef.current && e.target.value.length === 1) {
      productsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- Subtitle: Logout Handler ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

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

    if (!token || userRole !== 'buyer') {
      navigate('/login');
      return;
    }

    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItemIndex = existingCart.findIndex((item) => item.id === product.id);

    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity += 1;
    } else {
      existingCart.push({ ...product, quantity: 1 });
    }

    localStorage.setItem('cart', JSON.stringify(existingCart));

    const updatedCount = existingCart.reduce((acc, item) => acc + item.quantity, 0);
    setCartCount(updatedCount);
    navigate('/cart');
  };

  // --- Subtitle: Filter Products by Name, Process Type, or Description ---
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.process_type && product.process_type.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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

          {/* Toggleable Search Input */}
          {showSearch ? (
            <div className="nav-search-box">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Search orthodox, green, oolong..."
                value={searchQuery}
                onChange={handleSearchChange}
                autoFocus
              />
              <button
                type="button"
                className="nav-search-close"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearch(false);
                }}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="nav-button"
              onClick={() => setShowSearch(true)}
            >
              🔍 Search
            </button>
          )}

          {/* Protected Cart Navigation Button */}
          <button onClick={handleCartNavigation} className="nav-button">
            🛒 Cart <span className="cart-badge">{cartCount}</span>
          </button>

          {/* Dynamic Log In / Log Out Button */}
          {isLoggedIn ? (
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          ) : (
            <Link to="/login" className="nav-link">👤 Log In</Link>
          )}
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
          <button
            className="primary-btn"
            onClick={() => productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            Discover Our Teas
          </button>
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
      <section className="products-section" ref={productsSectionRef}>
        <h2 className="section-title">
          {searchQuery ? `Search Results for "${searchQuery}"` : 'Featured Harvests'}
        </h2>

        <div className="product-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))
          ) : (
            <p className="no-products-text">
              {searchQuery
                ? `No teas found matching "${searchQuery}".`
                : 'No active teas currently available.'}
            </p>
          )}
        </div>

        <div className="center-container">
          {searchQuery ? (
            <button className="secondary-btn" onClick={() => setSearchQuery('')}>
              Show All Teas
            </button>
          ) : (
            <button className="secondary-btn">View All Teas</button>
          )}
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