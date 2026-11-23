const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createOrder,
  getBuyerOrders,
  getSellerOrders,
  getOrderTracking,
  updateOrderStatus,
  cancelBuyerOrder,
  updateBuyerDeliveryPreference,
} = require('../controllers/orderController');

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

router.post('/:id/cancel', authMiddleware, requireBuyer, cancelBuyerOrder);
router.patch('/:id/delivery-preference', authMiddleware, requireBuyer, updateBuyerDeliveryPreference);

// GET /api/orders - Fetch seller orders
router.get('/', authMiddleware, getSellerOrders);

// GET /api/orders/:id/tracking - Buyer/seller tracking details and shipment history
router.get('/:id/tracking', authMiddleware, getOrderTracking);

// PATCH /api/orders/:id/status - Update order status
router.patch('/:id/status', authMiddleware, updateOrderStatus);

module.exports = router;