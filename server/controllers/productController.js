const db = require('../config/db');

// GET ALL PRODUCTS (Public Catalog - Active Only)
const getAllProducts = async (req, res) => {
    try {
        const [products] = await db.execute(`SELECT * FROM products WHERE is_active = TRUE`);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE PRODUCT (Supports 'active' / 'inactive' status from Radio Buttons)
const createProduct = async (req, res) => {
    const { 
        seller_id, 
        category_id, 
        name, 
        description, 
        price, 
        stock_quantity, 
        image_url, 
        elevation, 
        process_type, 
        status 
    } = req.body;

    // Convert 'active'/'inactive' or boolean into 1 or 0 for MySQL TINYINT/BOOLEAN
    const isActive = (status === 'inactive' || status === false || status === 0) ? 0 : 1;

    const query = `
        INSERT INTO products 
        (seller_id, category_id, name, description, price, stock_quantity, image_url, elevation, process_type, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            process_type || 'Orthodox',
            isActive
        ]);
        res.status(201).json({ message: 'Product added successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET ALL PRODUCTS FOR A SPECIFIC SELLER (Includes Active & Inactive)
const getSellerProducts = async (req, res) => {
    const { sellerId } = req.params;
    try {
        const [products] = await db.execute(`SELECT * FROM products WHERE seller_id = ?`, [sellerId]);
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE PRODUCT DETAILS & STATUS
const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock_quantity, image_url, elevation, process_type, status } = req.body;

    const isActive = (status === 'inactive' || status === false || status === 0) ? 0 : 1;

    const query = `
        UPDATE products 
        SET name = ?, description = ?, price = ?, stock_quantity = ?, image_url = ?, elevation = ?, process_type = ?, is_active = ?
        WHERE id = ?
    `;

    try {
        await db.execute(query, [name, description, price, stock_quantity, image_url, elevation, process_type, isActive, id]);
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

// TOGGLE STATUS via Radio Buttons ('active' / 'inactive' or boolean)
const toggleProductStatus = async (req, res) => {
    const { id } = req.params;
    const { status, is_active } = req.body; 

    // Handle string ('active'/'inactive'), boolean (true/false), or traditional body key
    let isActive;
    if (status !== undefined) {
        isActive = (status === 'active' || status === true || status === 1) ? 1 : 0;
    } else {
        isActive = (is_active === true || is_active === 1 || is_active === 'active') ? 1 : 0;
    }

    try {
        await db.execute(`UPDATE products SET is_active = ? WHERE id = ?`, [isActive, id]);
        const statusLabel = isActive === 1 ? 'active' : 'inactive';
        res.json({ message: `Product status updated to ${statusLabel}`, is_active: isActive });
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