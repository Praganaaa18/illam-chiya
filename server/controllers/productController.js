const db = require('../config/db');
const isSeller = (req) => req.user?.role === 'seller';

// Helper function to normalize and format image URLs for backend responses
const formatImageUrl = (url) => {
    if (typeof url !== 'string' || !url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Windows slashes ko replace karo aur starting slashes remove karo
    const cleanPath = url.replace(/\\/g, '/').replace(/^\/+/, '');
    return `/${cleanPath}`;
};

// GET ALL PRODUCTS (Home Page / Public Catalog - Active Only)
const getAllProducts = async (req, res) => {
    try {
        const [products] = await db.execute(`SELECT * FROM products WHERE is_active = TRUE`);
        
        // Ensure image URLs are correctly formatted for the frontend
        const formattedProducts = products.map((product) => ({
            ...product,
            image_url: formatImageUrl(product.image_url)
        }));

        res.json(formattedProducts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// CREATE PRODUCT
const createProduct = async (req, res) => {
    if (!isSeller(req)) {
        return res.status(403).json({ error: 'Seller access is required.' });
    }

    const { 
        category_id, 
        name, 
        description, 
        price, 
        stock_quantity, 
        image_url, 
        elevation, 
        process_type, 
        status 
    } = req.body || {};

    const isActive = (status === 'inactive' || status === false || status === 0) ? 0 : 1;
    const formattedImageUrl = formatImageUrl(image_url);
    const parsedPrice = Number(price);
    const parsedStock = Number(stock_quantity);
    if (typeof name !== 'string' || !name.trim() || price === '' || price === undefined || price === null ||
        !Number.isFinite(parsedPrice) || parsedPrice < 0 ||
        parsedPrice > 99999999.99 ||
        stock_quantity === '' || stock_quantity === undefined || stock_quantity === null ||
        !Number.isInteger(parsedStock) || parsedStock < 0 || parsedStock > 2147483647) {
        return res.status(400).json({ error: 'A name, non-negative price, and whole-number stock quantity are required.' });
    }

    const query = `
        INSERT INTO products 
        (seller_id, category_id, name, description, price, stock_quantity, image_url, elevation, process_type, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [result] = await db.execute(query, [
            req.user.id,
            category_id || 1, 
            name, 
            description || '', 
            parsedPrice,
            parsedStock,
            formattedImageUrl, 
            elevation || '5,000 ft', 
            process_type || 'Orthodox',
            isActive
        ]);
        res.status(201).json({ message: 'Product added successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// GET ALL PRODUCTS FOR A SPECIFIC SELLER
const getSellerProducts = async (req, res) => {
    const { sellerId } = req.params;
    if (!isSeller(req)) {
        return res.status(403).json({ error: 'Seller access is required.' });
    }
    if (Number(sellerId) !== Number(req.user.id)) {
        return res.status(403).json({ error: 'You can only view your own products.' });
    }
    try {
        const [products] = await db.execute(`SELECT * FROM products WHERE seller_id = ?`, [sellerId]);
        
        const formattedProducts = products.map((product) => ({
            ...product,
            image_url: formatImageUrl(product.image_url)
        }));

        res.json(formattedProducts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// UPDATE PRODUCT
const updateProduct = async (req, res) => {
    if (!isSeller(req)) {
        return res.status(403).json({ error: 'Seller access is required.' });
    }
    const { id } = req.params;
    const { name, description, price, stock_quantity, image_url, elevation, process_type, status } = req.body || {};

    const parsedPrice = Number(price);
    const parsedStock = Number(stock_quantity);
    if (typeof name !== 'string' || !name.trim() || price === '' || price === undefined || price === null ||
        !Number.isFinite(parsedPrice) || parsedPrice < 0 ||
        parsedPrice > 99999999.99 ||
        stock_quantity === '' || stock_quantity === undefined || stock_quantity === null ||
        !Number.isInteger(parsedStock) || parsedStock < 0 || parsedStock > 2147483647) {
        return res.status(400).json({ error: 'A name, non-negative price, and whole-number stock quantity are required.' });
    }

    const isActive = (status === 'inactive' || status === false || status === 0) ? 0 : 1;
    const formattedImageUrl = formatImageUrl(image_url);

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        const [existing] = await connection.execute(
            'SELECT id FROM products WHERE id = ? AND seller_id = ? FOR UPDATE',
            [id, req.user.id]
        );
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }

        const [reservedRows] = await connection.execute(
            `SELECT COALESCE(SUM(oi.quantity), 0) AS reserved_quantity
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.product_id = ?
               AND o.order_status IN ('pending', 'processing', 'shipped')`,
            [id]
        );
        if (parsedStock < Number(reservedRows[0].reserved_quantity || 0)) {
            await connection.rollback();
            return res.status(409).json({
                error: `Stock cannot be lower than the ${Number(reservedRows[0].reserved_quantity)} units reserved for active orders.`,
            });
        }

        await connection.execute(`
            UPDATE products
            SET name = ?, description = ?, price = ?, stock_quantity = ?, image_url = ?, elevation = ?, process_type = ?, is_active = ?
            WHERE id = ? AND seller_id = ?
        `, [
            name, 
            description || '', 
            parsedPrice,
            parsedStock,
            formattedImageUrl, 
            elevation || '5,000 ft', 
            process_type || 'Orthodox', 
            isActive, 
            id,
            req.user.id
        ]);

        await connection.commit();
        return res.json({ message: 'Product updated successfully', id });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Failed to update product:', err);
        return res.status(500).json({ error: 'Failed to update product.' });
    } finally {
        if (connection) connection.release();
    }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
    if (!isSeller(req)) {
        return res.status(403).json({ error: 'Seller access is required.' });
    }
    const { id } = req.params;
    try {
        const [products] = await db.execute(
            'SELECT id FROM products WHERE id = ? AND seller_id = ?',
            [id, req.user.id]
        );
        if (products.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        const [orderReferences] = await db.execute(
            'SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1',
            [id]
        );
        if (orderReferences.length > 0) {
            return res.status(409).json({
                error: 'This product has order history and cannot be deleted. Deactivate it instead.',
            });
        }
        const [result] = await db.execute(
            'DELETE FROM products WHERE id = ? AND seller_id = ?',
            [id, req.user.id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully', id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// TOGGLE STATUS via Radio Buttons
const toggleProductStatus = async (req, res) => {
    if (!isSeller(req)) {
        return res.status(403).json({ error: 'Seller access is required.' });
    }
    const { id } = req.params;
    const { status, is_active } = req.body || {};

    let isActive;
    if (status !== undefined) {
        isActive = (status === 'active' || status === true || status === 1) ? 1 : 0;
    } else {
        isActive = (is_active === true || is_active === 1 || is_active === 'active') ? 1 : 0;
    }

    try {
        const [existing] = await db.execute(
            'SELECT id FROM products WHERE id = ? AND seller_id = ?',
            [id, req.user.id]
        );
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        await db.execute(
            'UPDATE products SET is_active = ? WHERE id = ? AND seller_id = ?',
            [isActive, id, req.user.id]
        );
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