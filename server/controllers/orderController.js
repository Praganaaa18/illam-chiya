// =========================================================================
// SUBTITLE 1: ORDER DATABASE CONTROLLERS
// =========================================================================
const db = require('../config/db');
const DEFAULT_DRIVERS = require('../utils/drivers');

const generateTrackingNumber = (orderId) =>
  `IC-ORD-${String(Number(orderId)).padStart(6, '0')}`;
const {
  isValidPhoneNumber,
  normalizePhoneNumber,
} = require('../utils/validation');

// Create a new order (Checkout)
exports.createOrder = async (req, res) => {
  const body = req.body || {};
  const { 
    recipient_name, 
    full_name, 
    phone, 
    shipping_address, 
    delivery_address, 
    address, 
    city, 
    landmark,
    items, 
    cart 
  } = body;

  if (req.user.role !== 'buyer') {
    return res.status(403).json({ message: 'Only buyer accounts can place orders.' });
  }
  const orderItems = Array.isArray(items) ? items : cart;
  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).json({ message: 'Cart is empty or no items provided.' });
  }

  const quantitiesByProduct = new Map();
  for (const item of orderItems) {
    if (!item || typeof item !== 'object') {
      return res.status(400).json({ message: 'Each order item must be an object.' });
    }
    const productId = Number(item.product_id ?? item.id);
    const quantity = Number(item.quantity ?? item.qty);
    if (!Number.isInteger(productId) || productId <= 0 ||
        !Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ message: 'Each order item must have a valid product and positive whole-number quantity.' });
    }
    const totalQuantity = (quantitiesByProduct.get(productId) || 0) + quantity;
    if (totalQuantity > 2147483647) {
      return res.status(400).json({ message: 'Order quantity exceeds the supported limit.' });
    }
    quantitiesByProduct.set(productId, totalQuantity);
  }

  const rawAddress = [shipping_address, delivery_address, address]
    .find((value) => typeof value === 'string' && value.trim())?.trim() || '';
  const buyerName = [recipient_name, full_name]
    .find((value) => typeof value === 'string' && value.trim())?.trim() || '';
  const phoneNum = normalizePhoneNumber(phone);
  const deliveryCity = typeof city === 'string' ? city.trim() : '';
  const nearbyLandmark = typeof landmark === 'string' ? landmark.trim() : '';
  if (!rawAddress || !buyerName || !isValidPhoneNumber(phone) ||
      !nearbyLandmark || nearbyLandmark.length > 150) {
    return res.status(400).json({
      message: 'Recipient name, a valid 10-digit phone number, shipping address, and nearby landmark are required.',
    });
  }
  const fullAddress = `Recipient: ${buyerName} | Phone: ${phoneNum} | Address: ${rawAddress}${deliveryCity ? `, ${deliveryCity}` : ''} | Landmark: ${nearbyLandmark}`;

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const validBuyerId = req.user.id;
    let subtotal = 0;
    const verifiedItems = [];

    for (const [productId, quantity] of [...quantitiesByProduct].sort(([left], [right]) => left - right)) {
      const [products] = await connection.execute(
        `SELECT id, seller_id, price, pack_size, stock_quantity, is_active
         FROM products
         WHERE id = ?
         FOR UPDATE`,
        [productId]
      );
      if (products.length === 0 || Number(products[0].is_active) !== 1) {
        await connection.rollback();
        return res.status(400).json({ message: 'One or more products are no longer available.' });
      }

      const product = products[0];
      const [reservedRows] = await connection.execute(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS reserved_quantity
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE oi.product_id = ?
           AND o.order_status IN ('pending', 'processing', 'shipped')`,
        [productId]
      );
      const availableStock = Number(product.stock_quantity) -
        Number(reservedRows[0].reserved_quantity || 0);
      if (quantity > availableStock) {
        await connection.rollback();
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Only ${Math.max(0, availableStock)} available.`,
        });
      }

      const price = Number(product.price);
      subtotal += price * quantity;
      verifiedItems.push({
        productId,
        quantity,
        sellerId: product.seller_id,
        price,
        packSize: product.pack_size || '100 g',
      });
    }

    const deliveryCharge = 120;
    const finalAmount = Math.round(subtotal * 100) / 100 + deliveryCharge;
    if (!Number.isFinite(finalAmount) || finalAmount > 99999999.99) {
      await connection.rollback();
      return res.status(400).json({ message: 'The order total exceeds the supported limit.' });
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (buyer_id, total_amount, shipping_address, payment_status, order_status) 
       VALUES (?, ?, ?, 'pending', 'pending')`,
      [validBuyerId, finalAmount, fullAddress]
    );

    const newOrderId = orderResult.insertId;
    await connection.execute(
      `INSERT INTO order_tracking_events (order_id, status, description)
       VALUES (?, 'pending', 'Order confirmed')`,
      [newOrderId]
    );

    for (const item of verifiedItems) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, price, pack_size)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newOrderId, item.productId, item.sellerId, item.quantity, item.price, item.packSize]
      );
    }

    const sellerIds = new Set(verifiedItems.map((item) => Number(item.sellerId)));
    for (const sellerId of sellerIds) {
      await connection.execute(
        `INSERT INTO notifications
         (recipient_id, recipient_role, title, message, link)
         VALUES (?, 'seller', ?, ?, ?)`,
        [
          sellerId,
          'New order received',
          `Order #${newOrderId} has been placed and needs processing.`,
          '/seller/dashboard?tab=orders',
        ]
      );
    }
    await connection.execute(
      `INSERT INTO notifications
       (recipient_id, recipient_role, title, message, link)
       VALUES (?, 'buyer', ?, ?, ?)`,
      [
        validBuyerId,
        'Order placed successfully',
        `Your order #${newOrderId} has been received and is awaiting seller confirmation.`,
        `/order-tracking?orderId=${newOrderId}`,
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Order placed successfully!',
      order_id: newOrderId,
      total_amount: finalAmount,
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Order creation error details:', error);
    res.status(500).json({ 
      message: 'Unable to place the order. Please try again.',
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
        o.carrier_name,
        o.tracking_number,
        o.created_at,
        (
          SELECT tracking_event.created_at
          FROM order_tracking_events tracking_event
          WHERE tracking_event.order_id = o.id
            AND tracking_event.status NOT IN ('pending', 'cancelled')
          ORDER BY tracking_event.created_at DESC, tracking_event.id DESC
          LIMIT 1
        ) AS seller_updated_at,
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
          CONCAT(p.name, ' (', oi.pack_size, ' x', oi.quantity, ')')
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
  if (req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Seller access is required.' });
  }

  const sellerId = Number(req.query.seller_id || req.user.id);
  if (sellerId !== Number(req.user.id)) {
    return res.status(403).json({ message: 'You can only view your own orders.' });
  }

  try {
    const query = `
      SELECT 
        o.id,
        SUM(oi.quantity * oi.price) AS total_price,
        o.shipping_address AS delivery_address,
        o.order_status AS status,
        o.created_at,
        u.full_name AS buyer_name,
        u.phone AS phone,
        GROUP_CONCAT(CONCAT(p.name, ' (', oi.pack_size, ' x', oi.quantity, ')') SEPARATOR ', ') AS items_summary
      FROM orders o
      JOIN users u ON o.buyer_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE oi.seller_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;

    const [orders] = await db.query(query, [sellerId]);
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Server error fetching orders.' });
  }
};

// Update order status in orders table ('pending', 'processing', 'shipped', 'delivered', 'cancelled')
exports.updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};
  const hasStatus = body.status !== undefined || body.order_status !== undefined;
  const requestedStatus = body.status !== undefined ? body.status : body.order_status;
  const newStatus = hasStatus ? String(requestedStatus).toLowerCase() : null;
  const hasCarrierName = Object.prototype.hasOwnProperty.call(body, 'carrier_name');

  if (req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Seller access is required.' });
  }

  if (!hasStatus && !hasCarrierName) {
    return res.status(400).json({ message: 'Provide a shipment status or carrier details to update.' });
  }

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (hasStatus && !validStatuses.includes(newStatus)) {
    return res.status(400).json({ message: 'Invalid order status value.' });
  }
  if (hasCarrierName && (typeof body.carrier_name !== 'string' || body.carrier_name.trim().length > 120)) {
    return res.status(400).json({ message: 'Carrier name must be 120 characters or fewer.' });
  }
  const carrierName = hasCarrierName ? body.carrier_name.trim() : null;

  const allowedTransitions = {
    pending: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      `SELECT o.id, o.buyer_id, o.order_status, o.carrier_name, o.tracking_number
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = ? AND oi.seller_id = ?
       LIMIT 1 FOR UPDATE`,
      [id, req.user.id]
    );
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Order not found for this seller.' });
    }

    const previousStatus = orders[0].order_status;
    const statusToSave = hasStatus ? newStatus : previousStatus;
    const statusChanged = previousStatus !== statusToSave;
    const currentCarrierName = orders[0].carrier_name || '';
    const currentTrackingNumber = orders[0].tracking_number || '';
    const nextCarrierName = hasCarrierName ? carrierName : currentCarrierName;
    if (hasCarrierName && nextCarrierName &&
        !DEFAULT_DRIVERS.includes(nextCarrierName) &&
        nextCarrierName !== currentCarrierName) {
      const [drivers] = await connection.execute(
        'SELECT id FROM seller_drivers WHERE seller_id = ? AND driver_name = ?',
        [req.user.id, nextCarrierName]
      );
      if (drivers.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Select an available driver.' });
      }
    }
    let nextTrackingNumber = currentTrackingNumber;
    if (hasCarrierName) {
      if (!nextCarrierName) nextTrackingNumber = '';
      else if (nextCarrierName !== currentCarrierName || !currentTrackingNumber) {
        nextTrackingNumber = generateTrackingNumber(orders[0].id);
      }
    }

    if (!statusChanged && !hasCarrierName) {
      await connection.commit();
      return res.status(200).json({ message: 'Shipment status is unchanged.', status: previousStatus });
    }

    if (Boolean(nextCarrierName) !== Boolean(nextTrackingNumber)) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Enter both a carrier name and tracking number, or leave both blank.',
      });
    }
    if (statusToSave === 'shipped' && (!nextCarrierName || !nextTrackingNumber)) {
      await connection.rollback();
      return res.status(400).json({
        message: 'Carrier name and tracking number are required before marking an order as shipped.',
      });
    }
    if (statusChanged && !allowedTransitions[previousStatus]?.includes(statusToSave)) {
      await connection.rollback();
      return res.status(400).json({
        message: `Shipment cannot move from ${previousStatus} to ${statusToSave}.`,
      });
    }

    const descriptions = {
      pending: 'Order confirmed',
      processing: 'Packed at Illam Estate',
      shipped: 'Dispatched from Ilam',
      delivered: 'Delivered to the buyer',
      cancelled: 'Order cancelled',
    };

    if (statusToSave === 'delivered' && statusChanged) {
      const [orderProducts] = await connection.execute(
        `SELECT product_id, SUM(quantity) AS quantity
         FROM order_items
         WHERE order_id = ?
         GROUP BY product_id`,
        [id]
      );
      for (const item of orderProducts.sort((left, right) => left.product_id - right.product_id)) {
        const [products] = await connection.execute(
          'SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE',
          [item.product_id]
        );
        const quantity = Number(item.quantity);
        if (products.length === 0 || Number(products[0].stock_quantity) < quantity) {
          await connection.rollback();
          return res.status(409).json({
            message: 'Cannot mark this order delivered because product stock is below the reserved quantity.',
          });
        }
        await connection.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [quantity, item.product_id]
        );
      }
    }

    const updates = [];
    const updateValues = [];
    if (statusChanged) {
      updates.push('order_status = ?');
      updateValues.push(statusToSave);
    }
    if (hasCarrierName) {
      updates.push('carrier_name = ?');
      updateValues.push(carrierName || null);
    }
    if (hasCarrierName) {
      updates.push('tracking_number = ?');
      updateValues.push(nextTrackingNumber || null);
    }
    await connection.execute(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      [...updateValues, id]
    );
    if (statusChanged) {
      await connection.execute(
        `INSERT INTO order_tracking_events (order_id, status, description)
         VALUES (?, ?, ?)`,
        [id, statusToSave, descriptions[statusToSave]]
      );
      const notificationTitle = statusToSave === 'shipped'
        ? 'Your order is on the way'
        : statusToSave === 'delivered'
          ? 'Your order was delivered'
          : statusToSave === 'cancelled'
            ? 'Your order was cancelled'
            : 'Your order was updated';
      await connection.execute(
        `INSERT INTO notifications
         (recipient_id, recipient_role, title, message, link)
         VALUES (?, 'buyer', ?, ?, ?)`,
        [
          orders[0].buyer_id,
          notificationTitle,
          `Order #${id} is now ${statusToSave}.`,
          `/order-tracking?orderId=${id}`,
        ]
      );
    }

    await connection.commit();
    return res.status(200).json({
      message: statusChanged ? 'Shipment status updated successfully.' : 'Carrier details updated successfully.',
      status: statusToSave,
      description: descriptions[statusToSave],
      carrier_name: nextCarrierName || null,
      tracking_number: nextTrackingNumber || null,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error updating status:', error);
    return res.status(500).json({ message: 'Failed to update order status.' });
  } finally {
    if (connection) connection.release();
  }
};

exports.getOrderTracking = async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ message: 'Invalid order ID.' });
  }

  try {
    const [orders] = await db.execute(
      `SELECT o.id, o.buyer_id, o.total_amount, o.shipping_address, o.order_status,
              o.carrier_name, o.tracking_number, o.created_at
       FROM orders o
       WHERE o.id = ?`,
      [orderId]
    );
    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const order = orders[0];
    let sellerId = null;
    if (req.user.role === 'buyer' && Number(order.buyer_id) !== Number(req.user.id)) {
      return res.status(404).json({ message: 'Order not found.' });
    }
    if (req.user.role === 'seller') {
      const [sellerOrders] = await db.execute(
        'SELECT 1 FROM order_items WHERE order_id = ? AND seller_id = ? LIMIT 1',
        [orderId, req.user.id]
      );
      if (sellerOrders.length === 0) {
        return res.status(404).json({ message: 'Order not found.' });
      }
      sellerId = req.user.id;
    }
    if (!['buyer', 'seller'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Order tracking is not available for this account.' });
    }

    const itemQuery = `
      SELECT p.name, oi.quantity, oi.pack_size
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?${sellerId ? ' AND oi.seller_id = ?' : ''}
      ORDER BY oi.id
    `;
    const [items] = await db.execute(itemQuery, sellerId ? [orderId, sellerId] : [orderId]);
    const [events] = await db.execute(
      `SELECT status, description, created_at
       FROM order_tracking_events
       WHERE order_id = ?
       ORDER BY created_at ASC, id ASC`,
      [orderId]
    );

    const trackingDescriptions = {
      pending: 'Order confirmed',
      processing: 'Packed at Illam Estate',
      shipped: 'Dispatched from Ilam',
      delivered: 'Delivered to the buyer',
      cancelled: 'Order cancelled',
    };
    const trackingEvents = events.length > 0
      ? events
      : [{
          status: order.order_status,
          description: trackingDescriptions[order.order_status] || 'Order received',
          created_at: order.created_at,
        }];

    return res.json({
      id: order.id,
      status: order.order_status,
      carrier_name: order.carrier_name,
      tracking_number: order.tracking_number,
      total_amount: Number(order.total_amount),
      shipping_address: order.shipping_address,
      created_at: order.created_at,
      items,
      events: trackingEvents,
    });
  } catch (error) {
    console.error('Error fetching order tracking:', error);
    return res.status(500).json({ message: 'Failed to fetch order tracking.' });
  }
};
