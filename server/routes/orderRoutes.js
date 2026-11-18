const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createOrder,
  getSellerOrders,
  updateOrderStatus,
  getOrderTracking,
} = require('../controllers/orderController');

// POST /api/orders - Create new order
router.post('/', authMiddleware, createOrder);

// GET /api/orders - Fetch seller orders
router.get('/', authMiddleware, getSellerOrders);

// GET /api/orders/:id/tracking - Buyer/seller tracking details and shipment history
router.get('/:id/tracking', authMiddleware, getOrderTracking);

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', authMiddleware, updateOrderStatus);

module.exports = router;