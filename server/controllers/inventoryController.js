const db = require('../config/db');

const isPositiveInteger = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;

exports.getSellerInventory = async (req, res) => {
  const sellerId = Number(req.query.seller_id);
  if (!isPositiveInteger(sellerId)) {
    return res.status(400).json({ message: 'A valid seller_id is required.' });
  }

  try {
    const [items] = await db.execute(
      `SELECT
        p.id,
        p.name,
        COALESCE(c.name, 'Uncategorized') AS category,
        p.image_url,
        p.price AS unit_price,
        p.stock_quantity AS current_stock,
        COALESCE(reservations.reserved_stock, 0) AS reserved_stock,
        GREATEST(p.stock_quantity - COALESCE(reservations.reserved_stock, 0), 0) AS available_stock,
        p.stock_quantity * p.price AS stock_value,
        CASE
          WHEN GREATEST(p.stock_quantity - COALESCE(reservations.reserved_stock, 0), 0) = 0 THEN 'Out of Stock'
          WHEN GREATEST(p.stock_quantity - COALESCE(reservations.reserved_stock, 0), 0) <= 5 THEN 'Low Stock'
          ELSE 'In Stock'
        END AS status
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT oi.product_id, SUM(oi.quantity) AS reserved_stock
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.order_status IN ('pending', 'processing', 'shipped')
        GROUP BY oi.product_id
      ) reservations ON reservations.product_id = p.id
      WHERE p.seller_id = ?
      ORDER BY p.name`,
      [sellerId]
    );

    const [revenueRows] = await db.execute(
      `SELECT COALESCE(SUM(oi.quantity * oi.price), 0) AS delivered_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE oi.seller_id = ? AND o.order_status = 'delivered'`,
      [sellerId]
    );

    const metrics = items.reduce(
      (totals, item) => {
        totals.totalStockValue += Number(item.stock_value);
        totals.lowStockCount += item.status === 'Low Stock' ? 1 : 0;
        totals.reservedOrdersCount += Number(item.reserved_stock);
        return totals;
      },
      {
        totalStockValue: 0,
        lowStockCount: 0,
        reservedOrdersCount: 0,
        deliveredRevenue: Number(revenueRows[0].delivered_revenue)
      }
    );

    res.json({ items, metrics });
  } catch (error) {
    console.error('Error fetching seller inventory:', error);
    res.status(500).json({ message: 'Failed to fetch inventory.' });
  }
};

exports.restockProduct = async (req, res) => {
  const productId = Number(req.params.id);
  const sellerId = Number(req.body.seller_id);
  const quantity = Number(req.body.add_quantity);

  if (!isPositiveInteger(productId) || !isPositiveInteger(sellerId) || !isPositiveInteger(quantity)) {
    return res.status(400).json({ message: 'Valid product, seller, and positive restock quantity are required.' });
  }

  try {
    const [result] = await db.execute(
      `UPDATE products
       SET stock_quantity = stock_quantity + ?
       WHERE id = ? AND seller_id = ?`,
      [quantity, productId, sellerId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found for this seller.' });
    }

    const [rows] = await db.execute(
      'SELECT stock_quantity FROM products WHERE id = ? AND seller_id = ?',
      [productId, sellerId]
    );
    res.json({ message: 'Inventory restocked successfully.', current_stock: rows[0].stock_quantity });
  } catch (error) {
    console.error('Error restocking product:', error);
    res.status(500).json({ message: 'Failed to restock product.' });
  }
};
