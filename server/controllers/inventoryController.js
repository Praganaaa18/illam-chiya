const db = require('../config/db');

const formatImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `/${url.replace(/\\/g, '/').replace(/^\/+/, '')}`;
};

const getInventory = async (req, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller access is required.' });
  }

  const sellerId = Number(req.query.seller_id || req.user.id);
  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    return res.status(400).json({ error: 'seller_id is required.' });
  }
  if (sellerId !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You can only view your own inventory.' });
  }

  try {
    const [products] = await db.execute(`
      SELECT p.id, p.name, p.price, p.stock_quantity, p.image_url,
             COALESCE(c.name, 'Uncategorized') AS category
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.seller_id = ?
      ORDER BY p.name ASC
    `, [sellerId]);

    const [reservedRows] = await db.execute(`
      SELECT oi.product_id, SUM(oi.quantity) AS reserved_quantity
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.seller_id = ?
        AND o.order_status IN ('order_placed', 'pending', 'processing', 'shipped')
      GROUP BY oi.product_id
    `, [sellerId]);

    const [deliveredRows] = await db.execute(`
      SELECT COALESCE(SUM(oi.quantity * oi.price), 0) AS delivered_revenue
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.seller_id = ? AND o.order_status IN ('delivered', 'cash_received')
    `, [sellerId]);

    const reservedByProduct = new Map(
      reservedRows.map((row) => [Number(row.product_id), Number(row.reserved_quantity) || 0]),
    );

    const items = products.map((product) => {
      const currentStock = Math.max(0, Number(product.stock_quantity) || 0);
      const reservedStock = reservedByProduct.get(Number(product.id)) || 0;
      const availableStock = Math.max(0, currentStock - reservedStock);
      const unitPrice = Number(product.price) || 0;
      const stockValue = currentStock * unitPrice;
      const status =
        availableStock === 0 ? 'Out of Stock'
          : availableStock <= 10 ? 'Low Stock'
            : 'In Stock';

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        image_url: formatImageUrl(product.image_url),
        current_stock: currentStock,
        reserved_stock: reservedStock,
        available_stock: availableStock,
        unit_price: unitPrice,
        stock_value: stockValue,
        status,
      };
    });

    const deliveredRevenue = Number(deliveredRows[0]?.delivered_revenue) || 0;
    const totalStockValue = items.reduce((sum, item) => sum + item.stock_value, 0);
    const lowStockCount = items.filter((item) =>
      item.status === 'Low Stock' || item.status === 'Out of Stock',
    ).length;
    const reservedOrdersCount = reservedRows.reduce(
      (sum, row) => sum + (Number(row.reserved_quantity) || 0),
      0,
    );

    return res.json({
      items,
      metrics: {
        totalStockValue,
        lowStockCount,
        reservedOrdersCount,
        deliveredRevenue,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return res.status(500).json({ error: 'Failed to fetch inventory.' });
  }
};

const restockProduct = async (req, res) => {
  const productId = Number(req.params.id);
  const sellerId = Number(req.user.id);
  const addQuantity = Number(req.body.add_quantity);

  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller access is required.' });
  }
  if ((req.query.seller_id && Number(req.query.seller_id) !== sellerId) ||
      (req.body.seller_id && Number(req.body.seller_id) !== sellerId)) {
    return res.status(403).json({ error: 'You can only update your own inventory.' });
  }
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product ID.' });
  }
  if (!Number.isInteger(sellerId) || sellerId <= 0) {
    return res.status(400).json({ error: 'seller_id is required.' });
  }
  if (!Number.isInteger(addQuantity) || addQuantity <= 0 || addQuantity > 2147483647) {
    return res.status(400).json({ error: 'add_quantity must be a positive whole number.' });
  }

  try {
    const [products] = await db.execute(
      'SELECT stock_quantity FROM products WHERE id = ? AND seller_id = ?',
      [productId, sellerId]
    );
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found for this seller.' });
    }
    if (Number(products[0].stock_quantity) + addQuantity > 2147483647) {
      return res.status(409).json({ error: 'The stock quantity exceeds the supported limit.' });
    }

    const [result] = await db.execute(`
      UPDATE products
      SET stock_quantity = stock_quantity + ?
      WHERE id = ? AND seller_id = ? AND stock_quantity <= 2147483647 - ?
    `, [addQuantity, productId, sellerId, addQuantity]);

    if (result.affectedRows === 0) {
      return res.status(409).json({ error: 'The stock quantity could not be updated; refresh inventory and try again.' });
    }

    const [rows] = await db.execute(
      'SELECT stock_quantity FROM products WHERE id = ?',
      [productId],
    );

    return res.json({
      message: 'Stock updated successfully.',
      stock_quantity: Number(rows[0]?.stock_quantity) || 0,
    });
  } catch (error) {
    console.error('Error restocking product:', error);
    return res.status(500).json({ error: 'Failed to update stock.' });
  }
};

module.exports = { getInventory, restockProduct };
