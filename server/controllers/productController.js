const db = require('../config/db');
const isSeller = (req) => req.user?.role === 'seller';
const parsePackSize = (value) => {
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^([1-9]\d{0,4})\s*(g|kg)$/i);
    if (!match) return null;
    return `${Number(match[1])} ${match[2].toLowerCase()}`;
};

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
        const [products] = await db.execute(`
            SELECT p.*, c.name AS category
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.is_active = TRUE
        `);
        
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
        pack_size,
        stock_quantity, 
        image_url, 
        elevation, 
        process_type, 
        status 
    } = req.body || {};
    const categoryId = Number(category_id);
    const packSize = parsePackSize(pack_size);

    const isActive = (status === 'inactive' || status === false || status === 0) ? 0 : 1;
    const formattedImageUrl = formatImageUrl(image_url);
    const parsedPrice = Number(price);
    const parsedStock = Number(stock_quantity);
    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({ error: 'Select a valid product category.' });
    }
    if (!packSize) {
        return res.status(400).json({ error: 'A pack size such as 100 g or 1 kg is required.' });
    }
    if (typeof name !== 'string' || !name.trim() || price === '' || price === undefined || price === null ||
        !Number.isFinite(parsedPrice) || parsedPrice < 0 ||
        parsedPrice > 99999999.99 ||
        stock_quantity === '' || stock_quantity === undefined || stock_quantity === null ||
        !Number.isInteger(parsedStock) || parsedStock < 0 || parsedStock > 2147483647) {
        return res.status(400).json({ error: 'A name, non-negative price, and whole-number stock quantity are required.' });
    }

    const query = `
        INSERT INTO products 
        (seller_id, category_id, name, description, price, pack_size, stock_quantity, image_url, elevation, process_type, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        const [categories] = await db.execute('SELECT id FROM categories WHERE id = ?', [categoryId]);
        if (categories.length === 0) {
            return res.status(400).json({ error: 'Select a valid product category.' });
        }
        const [result] = await db.execute(query, [
            req.user.id,
            categoryId,
            name, 
            description || '', 
            parsedPrice,
            packSize,
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
        const [products] = await db.execute(`
            SELECT p.*, c.name AS category
            FROM products p
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE p.seller_id = ?
        `, [sellerId]);
        
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
    const { category_id, name, description, price, pack_size, stock_quantity, image_url, elevation, process_type, status } = req.body || {};

    const parsedPrice = Number(price);
    const parsedStock = Number(stock_quantity);
    if (pack_size !== undefined && !parsePackSize(pack_size)) {
        return res.status(400).json({ error: 'A pack size such as 100 g or 1 kg is required.' });
    }
    if (category_id !== undefined &&
        (!Number.isSafeInteger(Number(category_id)) || Number(category_id) <= 0)) {
        return res.status(400).json({ error: 'Select a valid product category.' });
    }
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
            'SELECT id, category_id, pack_size FROM products WHERE id = ? AND seller_id = ? FOR UPDATE',
            [id, req.user.id]
        );
        if (existing.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Product not found' });
        }
        const categoryId = category_id === undefined ? existing[0].category_id : Number(category_id);
        const packSize = pack_size === undefined ? existing[0].pack_size : parsePackSize(pack_size);
        const [categories] = await connection.execute(
            'SELECT id FROM categories WHERE id = ?',
            [categoryId]
        );
        if (categories.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Select a valid product category.' });
        }

        const [reservedRows] = await connection.execute(
            `SELECT COALESCE(SUM(oi.quantity), 0) AS reserved_quantity
             FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.product_id = ?
               AND o.order_status IN ('order_placed', 'pending', 'processing', 'shipped')`,
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
            SET category_id = ?, name = ?, description = ?, price = ?, pack_size = ?, stock_quantity = ?, image_url = ?, elevation = ?, process_type = ?, is_active = ?
            WHERE id = ? AND seller_id = ?
        `, [
            categoryId,
            name, 
            description || '', 
            parsedPrice,
            packSize,
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

const getCategories = async (req, res) => {
    if (!isSeller(req)) {
        return res.status(403).json({ error: 'Seller access is required.' });
    }

    try {
        const [categories] = await db.execute(
            'SELECT id, name FROM categories ORDER BY name ASC'
        );
        return res.json(categories);
    } catch (err) {
        console.error('Failed to load product categories:', err);
        return res.status(500).json({ error: 'Failed to load categories.' });
    }
};

const createCategory = async (req, res) => {
    if (!isSeller(req)) {
        return res.status(403).json({ error: 'Seller access is required.' });
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 50) {
        return res.status(400).json({ error: 'A category name of 1 to 50 characters is required.' });
    }

    try {
        const [existing] = await db.execute(
            'SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1',
            [name]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'A category with this name already exists.' });
        }

        const [result] = await db.execute(
            'INSERT INTO categories (name) VALUES (?)',
            [name]
        );
        return res.status(201).json({ id: result.insertId, name });
    } catch (err) {
        console.error('Failed to create product category:', err);
        return res.status(500).json({ error: 'Failed to create category.' });
    }
};

const deleteCategory = async (req, res) => {
    if (!isSeller(req)) {
        return res.status(403).json({ error: 'Seller access is required.' });
    }

    const categoryId = Number(req.params.categoryId);
    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({ error: 'A valid category ID is required.' });
    }

    try {
        const [products] = await db.execute(
            'SELECT id FROM products WHERE category_id = ? LIMIT 1',
            [categoryId]
        );
        if (products.length > 0) {
            return res.status(409).json({
                error: 'This category is assigned to products. Reassign or delete those products before deleting it.',
            });
        }

        const [result] = await db.execute(
            'DELETE FROM categories WHERE id = ?',
            [categoryId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Category not found.' });
        }

        return res.json({ message: 'Category deleted successfully.', id: categoryId });
    } catch (err) {
        console.error('Failed to delete product category:', err);
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                error: 'This category is assigned to products. Reassign or delete those products before deleting it.',
            });
        }
        return res.status(500).json({ error: 'Failed to delete category.' });
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
    getCategories,
    createCategory,
    deleteCategory,
    createProduct,
    getSellerProducts,
    updateProduct,
    deleteProduct,
    toggleProductStatus
};