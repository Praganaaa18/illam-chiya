// =========================================================================
// SUBTITLE 1: ORDER DATABASE CONTROLLERS
// =========================================================================
const db = require('../config/db');

// Create a new order (Checkout)
exports.createOrder = async (req, res) => {
  console.log('Received order creation request:', req.body);
  const { 
    buyer_id, 
    recipient_name, 
    full_name, 
    phone, 
    shipping_address, 
    delivery_address, 
    address, 
    city, 
    total_amount, 
    grand_total, 
    items, 
    cart 
  } = req.body;

  const orderItems = items || cart || [];
  if (orderItems.length === 0) {
    return res.status(400).json({ message: 'Cart is empty or no items provided.' });
  }

  const rawAddress = shipping_address || delivery_address || address || '';
  const buyerName = recipient_name || full_name || 'Guest Buyer';
  const phoneNum = phone || 'N/A';
  const fullAddress = `Recipient: ${buyerName} | Phone: ${phoneNum} | Address: ${rawAddress}${city ? `, ${city}` : ''}`;

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const validBuyerId = buyer_id || 1; 
    const finalAmount = total_amount || grand_total || 0;

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (buyer_id, total_amount, shipping_address, payment_status, order_status) 
       VALUES (?, ?, ?, 'pending', 'pending')`,
      [validBuyerId, finalAmount, fullAddress]
    );

    const newOrderId = orderResult.insertId;

    for (const item of orderItems) {
      const productId = item.product_id || item.id;
      const qty = item.quantity || item.qty || 1;
      const price = item.price || 0;

      let sellerId = item.seller_id;
      if (!sellerId) {
        const [prod] = await connection.execute('SELECT seller_id FROM products WHERE id = ?', [productId]);
        if (prod.length > 0) {
          sellerId = prod[0].seller_id;
        } else {
          throw new Error(`Product ID ${productId} does not exist in products table.`);
        }
      }

      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price) 
         VALUES (?, ?, ?, ?, ?)`,
        [newOrderId, productId, sellerId, qty, price]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Order placed successfully!',
      order_id: newOrderId
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Order creation error details:', error);
    res.status(500).json({ 
      message: 'Database error processing order.', 
      sqlError: error.sqlMessage || error.message 
    });
  } finally {
    if (connection) connection.release();
  }
};

// Fetch all seller orders with complete joined details
exports.getSellerOrders = async (req, res) => {
  const sellerId = req.query.seller_id;

  try {
    let query = `
      SELECT 
        o.id,
        o.total_amount AS total_price,
        o.shipping_address AS delivery_address,
        o.order_status AS status,
        o.created_at,
        u.full_name AS buyer_name,
        u.phone AS phone,
        GROUP_CONCAT(CONCAT(p.name, ' (x', oi.quantity, ')') SEPARATOR ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
    `;

    const queryParams = [];
    if (sellerId) {
      query += ` WHERE oi.seller_id = ?`;
      queryParams.push(sellerId);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;

    const [orders] = await db.query(query, queryParams);
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error fetching orders.' });
  }
};

// Update order status in orders table ('pending', 'processing', 'shipped', 'delivered', 'cancelled')
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const newStatus = (req.body.status || req.body.order_status || '').toLowerCase();

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({ message: 'Invalid order status value.' });
  }

  try {
    await db.query('UPDATE orders SET order_status = ? WHERE id = ?', [newStatus, id]);
    res.status(200).json({ message: 'Order status updated successfully.' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Failed to update order status.' });
  }
};