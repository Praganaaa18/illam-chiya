const db = require('../config/db');

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new product
exports.createProduct = async (req, res) => {
  const { name, description, price, stock, image_url } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)',
      [name, description, price, stock, image_url]
    );
    res.status(201).json({ message: 'Product added successfully', productId: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};