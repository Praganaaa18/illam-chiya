// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/orders - Create a new order
router.post('/', async (req, res) => {
  const { recipient_name, phone, shipping_address, total_amount, notes, items } = req.body;

  if (!recipient_name || !phone || !shipping_address || !items || items.length === 0) {
    return res.status(400).json({ message: 'Please provide all required shipping fields and items.' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 1. Insert Order
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (recipient_name, phone, shipping_address, payment_method, total_amount, notes) 
       VALUES (?, ?, ?, 'COD', ?, ?)`,
      [recipient_name, phone, shipping_address, total_amount, notes || '']
    );

    const newOrderId = orderResult.insertId;

    // 2. Insert Order Items
    for (const item of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
        [newOrderId, item.product_id, item.quantity, item.price]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Order placed successfully!',
      order_id: newOrderId
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Order creation error:', error);
    res.status(500).json({ message: 'Database error processing order.' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;