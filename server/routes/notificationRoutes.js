const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const db = require('../config/db');

const router = express.Router();
const supportedRoles = new Set(['buyer', 'seller']);

router.use(authMiddleware);

router.get('/mine', async (req, res) => {
  if (!supportedRoles.has(req.user.role)) {
    return res.status(403).json({ message: 'Notifications are not available for this account.' });
  }

  try {
    const [notifications] = await db.execute(
      `SELECT id, title, message, link, is_read, created_at
       FROM notifications
       WHERE recipient_id = ? AND recipient_role = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 30`,
      [req.user.id, req.user.role]
    );
    const [unreadRows] = await db.execute(
      `SELECT COUNT(*) AS unread_count
       FROM notifications
       WHERE recipient_id = ? AND recipient_role = ? AND is_read = FALSE`,
      [req.user.id, req.user.role]
    );
    return res.json({
      notifications,
      unreadCount: Number(unreadRows[0].unread_count) || 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Unable to load notifications.' });
  }
});

router.patch('/read-all', async (req, res) => {
  if (!supportedRoles.has(req.user.role)) {
    return res.status(403).json({ message: 'Notifications are not available for this account.' });
  }

  try {
    await db.execute(
      `UPDATE notifications SET is_read = TRUE
       WHERE recipient_id = ? AND recipient_role = ?`,
      [req.user.id, req.user.role]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return res.status(500).json({ message: 'Unable to update notifications.' });
  }
});

router.patch('/:notificationId/read', async (req, res) => {
  const notificationId = Number(req.params.notificationId);
  if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
    return res.status(400).json({ message: 'Invalid notification ID.' });
  }
  if (!supportedRoles.has(req.user.role)) {
    return res.status(403).json({ message: 'Notifications are not available for this account.' });
  }

  try {
    await db.execute(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = ? AND recipient_id = ? AND recipient_role = ?`,
      [notificationId, req.user.id, req.user.role]
    );
    return res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ message: 'Unable to update notification.' });
  }
});

module.exports = router;
