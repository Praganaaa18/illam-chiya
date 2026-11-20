import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import Navbar from './Navbar';
import './ProductPage.css';

const API_ORIGIN = 'http://localhost:5000';
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800';

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return FALLBACK_IMAGE;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${API_ORIGIN}/${imageUrl.replace(/^\/+/, '')}`;
};

const ProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const imageButtonRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [cartCount, setCartCount] = useState(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    return savedCart.reduce((total, item) => total + item.quantity, 0);
  });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetch(`${API_ORIGIN}/api/products`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Unable to load product details.');
        }
        return response.json();
      })
      .then((products) => {
        if (!Array.isArray(products)) {
          throw new Error('The product catalog returned an invalid response.');
        }
        setAllProducts(products);
        const selectedProduct = products.find((item) => String(item.id) === productId);
        if (!selectedProduct) {
          setProduct(null);
          setError('This product is unavailable or no longer listed.');
          return;
        }
        setProduct(selectedProduct);
      })
      .catch((fetchError) => {
        if (fetchError.name !== 'AbortError') {
          setError(fetchError.message || 'Unable to load product details.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [productId]);

  useEffect(() => {
    setQuantity(1);
  }, [productId]);

  useEffect(() => {
    if (!isImageOpen) return undefined;

    const imageButton = imageButtonRef.current;
    const closeButton = closeButtonRef.current;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsImageOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    if (closeButton) closeButton.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (imageButton) imageButton.focus();
    };
  }, [isImageOpen]);

  const relatedProducts = product
    ? allProducts
      .filter((item) => String(item.id) !== String(product.id))
      .sort((a, b) => Number(b.category_id === product.category_id) - Number(a.category_id === product.category_id))
      .slice(0, 2)
    : [];

  const handleAdd = (destination = '/cart') => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (!token || userRole !== 'buyer') {
      navigate('/login');
      return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = cart.find((item) => String(item.id) === String(product.id));
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.pack_size = product.pack_size || '100 g';
    } else {
      cart.push({ ...product, pack_size: product.pack_size || '100 g', quantity });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    setCartCount(cart.reduce((total, item) => total + item.quantity, 0));
    navigate(destination);
  };

  if (loading) {
    return <div className="page-wrapper"><div className="store-container"><main className="main-content" role="status">Loading product details…</main></div></div>;
  }

  if (error || !product) {
    return (
      <div className="page-wrapper">
        <div className="store-container">
          <main className="main-content">
            <button type="button" className="back-to-products" onClick={() => navigate('/')}>← Back to teas</button>
            <p role="alert">{error || 'Product not found.'}</p>
          </main>
        </div>
      </div>
    );
  }

  const imageUrl = getImageUrl(product.image_url);

  return (
    <div className="page-wrapper">
      <div className="store-container">
        <Navbar cartCount={cartCount} showSearch={false} />

        <main className="main-content">
          <button type="button" className="back-to-products" onClick={() => navigate('/')}>
            <span aria-hidden="true">←</span>
            Back to teas
          </button>

          <section className="product-hero">
            <div className="product-gallery">
              <div className="main-image-box">
                <button
                  ref={imageButtonRef}
                  type="button"
                  className="image-preview-trigger"
                  aria-label={`View larger image of ${product.name}`}
                  onClick={() => setIsImageOpen(true)}
                >
                  <img src={imageUrl} alt={product.name} />
                  <span className="image-zoom-label">Click to enlarge</span>
                </button>
              </div>
            </div>

            <div className="product-info">
              <h1 className="product-title">{product.name}</h1>
              <p className="product-price">
                Rs. {Number(product.price).toLocaleString()} / {product.pack_size || '100 g'}
              </p>

              <div className="details-block">
                <h3>Product Details</h3>
                <ul>
                  <li>Origin: {product.elevation || 'Ilam, Nepal'}</li>
                  <li>Type: {product.process_type || 'Orthodox tea'}</li>
                  <li>Category: {product.category || 'Tea'}</li>
                  <li>Per pack: {product.pack_size || '100 g'}</li>
                  <li>Availability: {Number(product.stock_quantity) > 0 ? 'In stock' : 'Out of stock'}</li>
                </ul>
              </div>

              <label className="quantity-label" htmlFor="product-quantity">Quantity</label>
              <div className="quantity-selector">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span id="product-quantity" aria-live="polite">{quantity}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity((q) => Math.min(Number(product.stock_quantity), q + 1))}
                  disabled={quantity >= Number(product.stock_quantity)}
                >
                  +
                </button>
              </div>
            </div>

            <div className="purchase-panel">
              <div className="action-buttons">
                <button type="button" className="btn-primary" onClick={() => handleAdd()} disabled={Number(product.stock_quantity) <= 0}>
                  Add to Cart
                </button>
                <button type="button" className="btn-secondary" onClick={() => handleAdd('/confirm-order')} disabled={Number(product.stock_quantity) <= 0}>
                  Buy Now
                </button>
              </div>

              <div className="trust-badges">
                <span>🔒 Secure Checkout</span>
                <span>🚚 Shipping Information</span>
              </div>

              <div className="shipping-info">
                <h4>Shipping &amp; Returns</h4>
                <p>Shipping options and delivery estimates are provided during checkout.</p>
              </div>
            </div>
          </section>

          <hr className="divider" />

          <section className="product-description">
            <h2>Product Description</h2>
            <p>{product.description || 'Carefully grown and crafted tea from the Ilam hills of Nepal.'}</p>
          </section>

          <section className="recommendations-section">
            <div className="recommendations-left">
              <h2>Your Selection</h2>
              <p>{product.name}</p>
            </div>

            <div className="recommendations-right">
              <h2>You May Also Like</h2>
              <div className="related-grid">
                {relatedProducts.map((item) => (
                  <div
                    key={item.id}
                    className="related-card"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/products/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/products/${item.id}`);
                      }
                    }}
                  >
                    <img src={getImageUrl(item.image_url)} alt={item.name} className="related-img" />
                    <div className="related-details">
                      <h4>{item.name}</h4>
                      <p className="related-sub">{item.process_type || 'Tea'}</p>
                      <p className="related-price">
                        Rs. {Number(item.price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {isImageOpen && (
          <div
            className="image-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${product.name} image viewer`}
            onClick={(event) => {
              if (event.target === event.currentTarget) setIsImageOpen(false);
            }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="image-lightbox-close"
              aria-label="Close image viewer"
              onClick={() => setIsImageOpen(false)}
            >
              ×
            </button>
            <img src={imageUrl} alt={`${product.name} enlarged`} className="image-lightbox-image" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPage;