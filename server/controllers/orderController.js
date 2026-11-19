// =========================================================================
// SUBTITLE 1: ORDER DATABASE CONTROLLERS
// =========================================================================
const db = require('../config/db');

// Create a new order (Checkout)
exports.createOrder = async (req, res) => {
  console.log('Received order creation request:', req.body);
  const { 
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
  if (!Array.isArray(orderItems) || orderItems.length === 0 || orderItems.some((item) => !item || typeof item !== 'object')) {
    return res.status(400).json({ message: 'Cart is empty or no items provided.' });
  }

  const normalizedItems = orderItems.map((item) => ({
    productId: Number(item.product_id !== undefined ? item.product_id : item.id),
    quantity: Number(
      item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1)
    )
  }));
  if (normalizedItems.some((item) =>
    !Number.isSafeInteger(item.productId) || item.productId <= 0 ||
    !Number.isSafeInteger(item.quantity) || item.quantity <= 0
  )) {
    return res.status(400).json({ message: 'Each order item must have a valid product and positive integer quantity.' });
  }

  const rawAddress = shipping_address || delivery_address || address || '';
  const buyerName = recipient_name || full_name || 'Guest Buyer';
  const phoneNum = phone || 'N/A';
  const fullAddress = `Recipient: ${buyerName} | Phone: ${phoneNum} | Address: ${rawAddress}${city ? `, ${city}` : ''}`;

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const validBuyerId = req.user.id;
    const finalAmount = total_amount || grand_total || 0;

    const quantitiesByProduct = normalizedItems.reduce((quantities, item) => {
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
      return quantities;
    }, new Map());
    const productIds = [...quantitiesByProduct.keys()];
    const [products] = await connection.query(
      'SELECT id, seller_id, price, stock_quantity FROM products WHERE id IN (?) FOR UPDATE',
      [productIds]
    );

    if (products.length !== productIds.length) {
      throw new Error('One or more products in the order do not exist.');
    }

    const [reservations] = await connection.query(
      `SELECT oi.product_id, SUM(oi.quantity) AS reserved_quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.product_id IN (?) AND o.order_status IN ('pending', 'processing', 'shipped')
       GROUP BY oi.product_id`,
      [productIds]
    );
    const reservedByProduct = new Map(
      reservations.map((reservation) => [Number(reservation.product_id), Number(reservation.reserved_quantity)])
    );

    for (const product of products) {
      const requestedQuantity = quantitiesByProduct.get(Number(product.id));
      const reservedQuantity = reservedByProduct.get(Number(product.id)) || 0;
      if (Number(product.stock_quantity) - reservedQuantity < requestedQuantity) {
        await connection.rollback();
        return res.status(409).json({
          message: `Insufficient available stock for product ${product.id}.`
        });
      }
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (buyer_id, total_amount, shipping_address, payment_status, order_status) 
       VALUES (?, ?, ?, 'pending', 'pending')`,
      [validBuyerId, finalAmount, fullAddress]
    );

    const newOrderId = orderResult.insertId;

    const productsById = new Map(products.map((product) => [Number(product.id), product]));
    for (const item of normalizedItems) {
      const product = productsById.get(item.productId);
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price) 
         VALUES (?, ?, ?, ?, ?)`,
        [newOrderId, item.productId, product.seller_id, item.quantity, product.price]
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

// Fetch the authenticated buyer's orders and their package contents
exports.getBuyerOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT
        o.id,
        o.total_amount AS total_price,
        o.shipping_address AS delivery_address,
        o.order_status AS status,
        o.created_at,
        COALESCE(SUM(oi.price * oi.quantity), 0) AS subtotal,
        (
          SELECT p.image_url
          FROM order_items image_item
          JOIN products p ON image_item.product_id = p.id
          WHERE image_item.order_id = o.id
          ORDER BY image_item.id
          LIMIT 1
        ) AS product_image,
        GROUP_CONCAT(
          CONCAT(p.name, ' (x', oi.quantity, ')')
          ORDER BY p.name
          SEPARATOR ', '
        ) AS items_summary
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.buyer_id = ?
      GROUP BY o.id, o.total_amount, o.shipping_address, o.order_status, o.created_at
      ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    res.status(500).json({ message: 'Server error fetching your orders.' });
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

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      'SELECT order_status FROM orders WHERE id = ? FOR UPDATE',
      [id]
    );
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found.' });
    }

    const currentStatus = orders[0].order_status;
    if (currentStatus === 'delivered' && newStatus !== 'delivered') {
      await connection.rollback();
      return res.status(409).json({ message: 'Delivered orders cannot be moved to another status.' });
    }

    if (currentStatus !== 'delivered' && newStatus === 'delivered') {
      const [items] = await connection.execute(
        `SELECT
          oi.product_id,
          SUM(oi.quantity) AS quantity,
          p.stock_quantity,
          COALESCE((
            SELECT SUM(other_items.quantity)
            FROM order_items other_items
            JOIN orders other_orders ON other_orders.id = other_items.order_id
            WHERE other_items.product_id = oi.product_id
              AND other_orders.order_status IN ('pending', 'processing', 'shipped')
              AND other_orders.id <> ?
          ), 0) AS reserved_elsewhere
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?
         GROUP BY oi.product_id, p.stock_quantity`,
        [id, id]
      );

      for (const item of items) {
        if (Number(item.stock_quantity) - Number(item.reserved_elsewhere) < Number(item.quantity)) {
          await connection.rollback();
          return res.status(409).json({
            message: `Insufficient available stock to deliver product ${item.product_id}.`
          });
        }

        const [result] = await connection.execute(
          `UPDATE products
           SET stock_quantity = stock_quantity - ?
           WHERE id = ? AND stock_quantity >= ?`,
          [item.quantity, item.product_id, item.quantity]
        );
        if (result.affectedRows === 0) {
          await connection.rollback();
          return res.status(409).json({
            message: `Insufficient stock to mark product ${item.product_id} as delivered.`
          });
        }
      }
    }

    await connection.execute('UPDATE orders SET order_status = ? WHERE id = ?', [newStatus, id]);
    await connection.commit();
    res.status(200).json({ message: 'Order status updated successfully.' });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Failed to update order status.' });
  } finally {
    if (connection) connection.release();
  }
};