import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import './Notificationbell.css';

const API_ORIGIN = 'http://localhost:5000';
const POLL_INTERVAL = 30000;

const isRead = (notification) =>
  notification.is_read === true || Number(notification.is_read) === 1;

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const NotificationBell = ({ role }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const requestRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || !['buyer', 'seller'].includes(role)) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch(`${API_ORIGIN}/api/notifications/mine`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load notifications.');
      if (!Array.isArray(data.notifications)) {
        throw new Error('The server returned an invalid notifications list.');
      }

      if (!controller.signal.aborted) {
        setNotifications(data.notifications);
        setUnreadCount(Math.max(0, Number(data.unreadCount) || 0));
        setError('');
      }
    } catch (fetchError) {
      if (fetchError.name !== 'AbortError' && !controller.signal.aborted) {
        console.error('Failed to load notifications:', fetchError);
        setError(fetchError.message || 'Unable to load notifications.');
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadNotifications();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') loadNotifications();
    };
    const intervalId = window.setInterval(refreshWhenVisible, POLL_INTERVAL);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      requestRef.current?.abort();
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please sign in again to update notifications.');
      return;
    }
    try {
      const response = await fetch(`${API_ORIGIN}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update notifications.');
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      setError('');
    } catch (requestError) {
      console.error('Failed to mark notifications as read:', requestError);
      setError(requestError.message || 'Unable to update notifications.');
    }
  };

  const openNotification = (notification) => {
    const target = typeof notification.link === 'string' &&
      notification.link.startsWith('/') &&
      !notification.link.startsWith('//') &&
      !notification.link.includes('\\')
      ? notification.link
      : role === 'seller' ? '/seller/dashboard?tab=orders' : '/order-tracking';

    setIsOpen(false);
    if (!isRead(notification)) {
      const token = localStorage.getItem('token');
      setNotifications((current) => current.map((item) =>
        item.id === notification.id ? { ...item, is_read: true } : item
      ));
      setUnreadCount((current) => Math.max(0, current - 1));

      fetch(`${API_ORIGIN}/api/notifications/${notification.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token || ''}` },
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || 'Unable to update notification status.');
        })
        .catch((requestError) => {
          console.error('Failed to mark notification as read:', requestError);
        });
    }
    navigate(target);
  };

  if (!['buyer', 'seller'].includes(role)) return null;

  return (
    <div className={`notification-bell ${role}`} ref={containerRef}>
      <button
        type="button"
        className="notification-bell-trigger"
        aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          const opening = !isOpen;
          setIsOpen(opening);
          if (opening) loadNotifications();
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <section
          className="notification-panel"
          role="dialog"
          aria-label={role === 'buyer' ? 'Your Orders and Updates' : 'Notifications'}
        >
          <header className="notification-panel-header">
            <h2>{role === 'buyer' ? 'Your Orders & Updates' : 'Notifications'}</h2>
            {unreadCount > 0 && (
              <button type="button" className="notification-mark-all" onClick={markAllAsRead}>
                Mark all read
              </button>
            )}
          </header>

          {error ? (
            <div className="notification-state error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={loadNotifications}>Try again</button>
            </div>
          ) : isLoading ? (
            <p className="notification-state" role="status">Loading updates...</p>
          ) : notifications.length === 0 ? (
            <p className="notification-state">No order updates yet.</p>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <button
                  type="button"
                  className={`notification-item ${isRead(notification) ? 'read' : 'unread'}`}
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                >
                  <span className="notification-item-dot" aria-hidden="true" />
                  <span className="notification-item-content">
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <small>{formatDate(notification.created_at)}</small>
                  </span>
                  <span className="notification-view">View</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default NotificationBell;