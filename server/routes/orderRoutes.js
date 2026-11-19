const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createOrder, getBuyerOrders, getSellerOrders, updateOrderStatus } = require('../controllers/orderController');

const requireBuyer = (req, res, next) => {
  if (req.user.role !== 'buyer') {
    return res.status(403).json({ message: 'Buyer access is required.' });
  }
  next();
};

// POST /api/orders - Create new order
router.post('/', authMiddleware, requireBuyer, createOrder);

// GET /api/orders/mine - Fetch orders belonging to the authenticated buyer
router.get('/mine', authMiddleware, requireBuyer, getBuyerOrders);

// GET /api/orders - Fetch seller orders
router.get('/', getSellerOrders);

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', updateOrderStatus);

module.exports = router;