import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Icon from './Icon';
import { clearAuthToken, getAuthToken } from '../utils/authStorage';
import './Navbar.css';
import NotificationBell from './Notificationbell';

const Navbar = ({
  cartCount = 0,
  searchQuery = '',
  onSearchChange,
  onSearchClose,
  searchSuggestions = { categories: [], products: [] },
  onSearchSuggestionSelect,
  showSearch = true,
}) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);

  const token = getAuthToken();
  const userName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'User';
  const userInitial = userName.trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isProfileOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isProfileOpen]);

  useEffect(() => {
    if (!isSearchOpen || !isSuggestionsOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!searchContainerRef.current?.contains(event.target)) setIsSuggestionsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isSearchOpen, isSuggestionsOpen]);

  const handleLogout = () => {
    clearAuthToken();
    ['token', 'userId', 'userRole', 'userName', 'userEmail', 'userPhone', 'userAddress']
      .forEach((key) => localStorage.removeItem(key));
    setIsProfileOpen(false);
    navigate('/login');
  };

  const handleCartNavigation = () => {
    const role = localStorage.getItem('userRole');
    navigate(token && role === 'buyer' ? '/cart' : '/login');
  };

  const closeSearch = () => {
    onSearchClose?.();
    setIsSearchOpen(false);
    setIsSuggestionsOpen(false);
  };

  const selectSearchSuggestion = (suggestion) => {
    onSearchSuggestionSelect?.(suggestion);
    setIsSuggestionsOpen(false);
  };

  return (
    <header className="navbar">
      <button type="button" className="logo-container" onClick={() => navigate('/')}>
        <Icon name="leaf" className="brand-mark" />
        <span>ILLAM CHIYA</span>
      </button>

      <nav className="nav-links">
        <Link to="/" className="nav-link"><Icon name="home" />Home</Link>

        {showSearch && (
          isSearchOpen ? (
            <div className="nav-search-container" ref={searchContainerRef}>
              <div className="nav-search-box">
                <Icon name="search" />
                <input
                  ref={searchInputRef}
                  type="search"
                  aria-label="Search products and categories"
                  placeholder="Search products or categories..."
                  value={searchQuery}
                  onFocus={() => setIsSuggestionsOpen(true)}
                  onChange={(event) => {
                    onSearchChange?.(event);
                    setIsSuggestionsOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setIsSuggestionsOpen(false);
                  }}
                />
                <button type="button" className="nav-search-close" onClick={closeSearch} aria-label="Close search">
                  ✕
                </button>
              </div>
              {isSuggestionsOpen && searchQuery.trim() && (
                <div className="nav-search-suggestions" role="dialog" aria-label="Search suggestions">
                  {searchSuggestions.categories.length > 0 && (
                    <div className="nav-suggestion-section">
                      <p className="nav-suggestion-heading">Categories</p>
                      {searchSuggestions.categories.map((category) => (
                        <div className="nav-suggestion-category" key={category.name}>
                          <button
                            type="button"
                            className="nav-suggestion-category-name"
                            onClick={() => selectSearchSuggestion({ type: 'category', name: category.name })}
                          >
                            <span>{category.name}</span>
                            <small>Category</small>
                          </button>
                          {category.products.map((product) => (
                            <button
                              type="button"
                              className="nav-suggestion-product"
                              key={product.id}
                              onClick={() => selectSearchSuggestion({ type: 'product', name: product.name })}
                            >
                              <span>{product.name}</span>
                              <small>{product.pack_size || '100 g'}</small>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {searchSuggestions.products.length > 0 && (
                    <div className="nav-suggestion-section">
                      <p className="nav-suggestion-heading">Products</p>
                      {searchSuggestions.products.map((product) => (
                        <button
                          type="button"
                          className="nav-suggestion-product"
                          key={product.id}
                          onClick={() => selectSearchSuggestion({ type: 'product', name: product.name })}
                        >
                          <span>{product.name}</span>
                          <small>{product.category || 'Tea'}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchSuggestions.categories.length === 0 && searchSuggestions.products.length === 0 && (
                    <p className="nav-suggestion-empty">No matching products or categories.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button type="button" className="nav-button nav-search-trigger" onClick={() => {
              setIsSearchOpen(true);
              setIsSuggestionsOpen(false);
            }} aria-label="Open search">
              <Icon name="search" />
              <span className="nav-search-label">Search</span>
            </button>
          )
        )}

        <button type="button" onClick={handleCartNavigation} className="nav-button">
          <Icon name="cart" />Cart <span className="cart-badge">{cartCount}</span>
        </button>
        {token && localStorage.getItem('userRole') === 'buyer' && (
          <NotificationBell role="buyer" />
        )}

        <button
          type="button"
          onClick={() => navigate('/order-tracking')}
          className="nav-button"
          title="Track Package"
          aria-label="Track Package"
        >
          <Icon name="package" className="tracking-icon" />
          Track Package
        </button>

        {token ? (
          <div className="profile-menu" ref={profileMenuRef}>
            <button
              type="button"
              className="profile-avatar"
              onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
              aria-label={`Open profile menu for ${userName}`}
              aria-expanded={isProfileOpen}
            >
              {userInitial}
            </button>
            {isProfileOpen && (
              <div className="profile-dropdown">
                <span className="profile-dropdown-name">{userName}</span>
                <button type="button" className="profile-logout" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="nav-link"><Icon name="user" />Log In</Link>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
