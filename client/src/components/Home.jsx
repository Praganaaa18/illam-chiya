// --- Subtitle: Import React, React Router Hooks, and Components ---
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import ProductCard from './ProductCard';
import Navbar from './Navbar';
import Icon from './Icon';
import './Home.css';

const PRODUCTS_PER_PAGE = 5;

const Home = () => {
  // --- Subtitle: State Variables ---
  const [products, setProducts] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const navigate = useNavigate();
  const productsSectionRef = useRef(null);

  const categories = useMemo(
    () => [...new Set(products.map((product) => String(product.category || '').trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
    [products]
  );

  const searchSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return { categories: [], products: [] };

    const matchingCategories = categories
      .filter((category) => category.toLocaleLowerCase().includes(query))
      .slice(0, 5)
      .map((category) => ({
        name: category,
        products: products.filter(
          (product) => String(product.category || '').toLocaleLowerCase() === category.toLocaleLowerCase()
        ).slice(0, 5),
      }));

    const matchingProducts = matchingCategories.length > 0
      ? []
      : products.filter((product) => [
        product.name,
        product.category,
        product.process_type,
        product.description,
      ].some((value) => String(value || '').toLocaleLowerCase().includes(query))).slice(0, 6);

    return { categories: matchingCategories, products: matchingProducts };
  }, [categories, products, searchQuery]);

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
    setSelectedCategory('all');
    setCurrentPage(1);
  };

  const handleSearchSuggestionSelect = (suggestion) => {
    setCurrentPage(1);
    if (suggestion.type === 'category') {
      setSelectedCategory(suggestion.name);
      setSearchQuery(suggestion.name);
    } else {
      setSelectedCategory('all');
      setSearchQuery(suggestion.name);
    }
    productsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // --- Subtitle: Add to Cart Action Handler ---
  const handleAddToCart = (product, requestedQuantity = 1) => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');

    if (!token || userRole !== 'buyer') {
      navigate('/login');
      return;
    }

    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItemIndex = existingCart.findIndex((item) => item.id === product.id);

    if (existingItemIndex > -1) {
      existingCart[existingItemIndex].quantity += requestedQuantity;
    } else {
      existingCart.push({ ...product, quantity: requestedQuantity });
    }

    localStorage.setItem('cart', JSON.stringify(existingCart));

    const updatedCount = existingCart.reduce((acc, item) => acc + item.quantity, 0);
    setCartCount(updatedCount);
    navigate('/cart');
  };

  // --- Subtitle: Filter Products by Name, Process Type, or Description ---
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === 'all' ||
      String(product.category || '').toLocaleLowerCase() === selectedCategory.toLocaleLowerCase();
    const matchesSearch = !normalizedSearch || [
      product.name,
      product.category,
      product.process_type,
      product.description,
    ].some((value) => String(value || '').toLocaleLowerCase().includes(normalizedSearch));
    return matchesCategory && matchesSearch;
  });
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );
  const paginationPages = [...new Set([
    1,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    totalPages,
  ].filter((page) => page >= 1 && page <= totalPages))].sort((left, right) => left - right);

  return (
    <div>
      {/* ==========================================
          HEADER / NAVIGATION BAR
          ========================================== */}
      <Navbar
        cartCount={cartCount}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        searchSuggestions={searchSuggestions}
        onSearchSuggestionSelect={handleSearchSuggestionSelect}
        onSearchClose={() => {
          setSearchQuery('');
          setSelectedCategory('all');
          setCurrentPage(1);
        }}
      />

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
            <h2 className="section-title">Products</h2>

        <div className="product-grid">
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((product) => (
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
                : selectedCategory !== 'all'
                  ? `No active teas in ${selectedCategory} yet.`
                  : 'No active teas currently available.'}
            </p>
          )}
        </div>

        {filteredProducts.length > 0 && (
          <div className="product-pagination">
            <p className="product-pagination-summary">
              Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–
              {Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length)} of {filteredProducts.length} products
            </p>
            <nav className="product-pagination-controls" aria-label="Product pagination">
              <button
                type="button"
                className="pagination-direction"
                aria-label="Previous page"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => page - 1)}
              >
                Previous
              </button>
              <div className="pagination-page-list">
                {paginationPages.map((page, index) => (
                  <React.Fragment key={page}>
                    {index > 0 && page - paginationPages[index - 1] > 1 && (
                      <span className="pagination-ellipsis" aria-hidden="true">…</span>
                    )}
                    <button
                      type="button"
                      className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                      aria-label={`Go to page ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                ))}
              </div>
              <button
                type="button"
                className="pagination-direction"
                aria-label="Next page"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
              >
                Next
              </button>
            </nav>
          </div>
        )}

        {searchQuery && (
          <div className="center-container">
            <button
              className="secondary-btn"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
            >
              Show All Teas
            </button>
          </div>
        )}
      </section>

      {/* ==========================================
          FOOTER SECTION
          ========================================== */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <h3><Icon name="leaf" />ILLAM CHIYA</h3>
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
              <li
                onClick={() => navigate('/order-tracking')}
                style={{ cursor: 'pointer' }}
              >
                Track Order
              </li>
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