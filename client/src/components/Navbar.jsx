import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import './Navbar.css';

const Navbar = ({
  cartCount = 0,
  searchQuery = '',
  onSearchChange,
  onSearchClose,
  showSearch = true,
}) => {
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchInputRef = useRef(null);
  const profileMenuRef = useRef(null);

  const token = localStorage.getItem('token');
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

  const handleLogout = () => {
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
  };

  return (
    <header className="navbar">
      <button type="button" className="logo-container" onClick={() => navigate('/')}>
        <span aria-hidden="true">🍃</span>
        <span>ILAM CHIYA</span>
      </button>

      <nav className="nav-links">
        <Link to="/" className="nav-link">🏠 Home</Link>

        {showSearch && (
          isSearchOpen ? (
            <div className="nav-search-box">
              <span aria-hidden="true">🔍</span>
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search orthodox, green, oolong..."
                value={searchQuery}
                onChange={(event) => onSearchChange?.(event)}
              />
              <button type="button" className="nav-search-close" onClick={closeSearch} aria-label="Close search">
                ✕
              </button>
            </div>
          ) : (
            <button type="button" className="nav-button nav-search-trigger" onClick={() => setIsSearchOpen(true)} aria-label="Open search">
              <span aria-hidden="true">🔍</span>
              <span className="nav-search-label">Search</span>
            </button>
          )
        )}

        <button type="button" onClick={handleCartNavigation} className="nav-button">
          🛒 Cart <span className="cart-badge">{cartCount}</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/order-tracking')}
          className="nav-button"
          title="Track Package"
          aria-label="Track Package"
        >
          <svg className="tracking-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
            <path d="m4.3 7.6 7.7 4.3 7.7-4.3M12 12v9M8 5.3l8 4.5" />
          </svg>
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
          <Link to="/login" className="nav-link">👤 Log In</Link>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
