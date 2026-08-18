// --- Subtitle: Import React and Required Tools ---
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css'; // Importing our external CSS stylesheet

const Home = () => {
  // --- Subtitle: State Variable to Store Products from Backend ---
  const [products, setProducts] = useState([]);

  // --- Subtitle: Fetch Data from Backend API on Page Load ---
  useEffect(() => {
    // Calling our Node.js server endpoint
    fetch('http://localhost:5000/api/products')
      .then((response) => response.json())
      .then((data) => setProducts(data)) // Save database response into state
      .catch((error) => console.error('Error connecting to backend:', error));
  }, []);

  return (
    <div>
      {/* ==========================================
          HEADER / NAVIGATION BAR
          ========================================== */}
      <header className="navbar">
        <div className="logo-container">
          <span>🍃</span>
          <span>ILLAM CHIYA</span>
        </div>

        <nav className="nav-links">
          <Link to="/" className="nav-link">🏠 Home</Link>
          <button className="nav-button">🔍 Search</button>
          <button className="nav-button">🛒 Cart <span className="cart-badge">0</span></button>
          <Link to="/login" className="nav-link">👤 Log In</Link>
        </nav>
      </header>

      {/* ==========================================
          HERO BANNER SECTION
          ========================================== */}
      <section className="hero-section">
        {/* Main Text & Call to Action */}
        <div className="hero-content">
          <span className="hero-subtitle">EASTERN NEPAL · EST. 1946</span>
          <h1 className="hero-title">Illam Chiya — Handcrafted teas grown at 5,000 feet elevation</h1>
          <p className="hero-description">
            Single-origin orthodox teas, hand-picked by skilled workers and shipped directly from our Himalayan garden to your table.
          </p>
          <button className="primary-btn">Discover Our Teas</button>
        </div>

        {/* Feature Highlights Badges */}
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
          {/* Loop over products fetched from database */}
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <img
                src={product.image_url ? `http://localhost:5000${product.image_url}` : 'https://via.placeholder.com/250'}
                alt={product.name}
                className="product-image"
              />
              <h3>{product.name}</h3>
              <p className="product-price">${product.price}</p>
              <button className="add-cart-btn">Add to Cart</button>
            </div>
          ))}
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
          {/* Brand Info */}
          <div className="footer-brand">
            <h3>🍃 ILLAM CHIYA</h3>
            <p>
              Grown at 5,000 feet in the Himalayan foothills of eastern Nepal. Every cup is a product of patience, precision, and purpose — direct from our garden to your table.
            </p>
            <div className="social-links">
              <span>IG</span> <span>FB</span> <span>X</span> <span>YT</span>
            </div>
          </div>

          {/* Column 1: Categories */}
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

          {/* Column 2: Support Links */}
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

          {/* Column 3: Learn Links */}
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

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <p>© 2025 Illam Chiya. All rights reserved. Grown in Nepal, shipped worldwide.</p>
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