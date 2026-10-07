const express = require('express');
const router = express.Router();
const { createOrder, getSellerOrders, updateOrderStatus } = require('../controllers/orderController');

// POST /api/orders - Create new order
router.post('/', createOrder);

// GET /api/orders - Fetch seller orders
router.get('/', getSellerOrders);

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', updateOrderStatus);

module.exports = router;