const db = require('../config/db');

// GET ALL PRODUCTS (Public Active Catalog)
const getAllProducts = async (req, res) => {
    try {
        const [products] = await db.execute(`SELECT * FROM products WHERE is_active = TRUE`);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE PRODUCT
const createProduct = async (req, res) => {
    const { seller_id, category_id, name, description, price, stock_quantity, image_url, elevation, process_type } = req.body;
    const query = `
        INSERT INTO products 
        (seller_id, category_id, name, description, price, stock_quantity, image_url, elevation, process_type, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
    `;
    try {
        const [result] = await db.execute(query, [
            seller_id || 1, 
            category_id || 1, 
            name, 
            description, 
            price, 
            stock_quantity || 0, 
            image_url, 
            elevation || '5,000 ft', 
            process_type || 'Orthodox'
        ]);
        res.status(201).json({ message: 'Product added successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET SELLER PRODUCTS
const getSellerProducts = async (req, res) => {
    const { sellerId } = req.params;
    try {
        const [products] = await db.execute(`SELECT * FROM products WHERE seller_id = ?`, [sellerId]);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock_quantity, image_url, elevation, process_type } = req.body;
    const query = `
        UPDATE products 
        SET name = ?, description = ?, price = ?, stock_quantity = ?, image_url = ?, elevation = ?, process_type = ? 
        WHERE id = ?
    `;
    try {
        await db.execute(query, [name, description, price, stock_quantity, image_url, elevation, process_type, id]);
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute(`DELETE FROM products WHERE id = ?`, [id]);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// TOGGLE STATUS (Active / Inactive)
const toggleProductStatus = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body; // Expecting boolean true/false
    try {
        await db.execute(`UPDATE products SET is_active = ? WHERE id = ?`, [is_active, id]);
        res.json({ message: `Product active status set to ${is_active}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    getAllProducts,
    createProduct,
    getSellerProducts,
    updateProduct,
    deleteProduct,
    toggleProductStatus
};