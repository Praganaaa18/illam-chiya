const db = require('../config/db');

// Helper function to normalize and format image URLs for backend responses
const formatImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Windows slashes ko replace karo aur starting slashes remove karo
    const cleanPath = url.replace(/\\/g, '/').replace(/^\/+/, '');
    return cleanPath;
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

    const isActive = (status === 'inactive' || status === false || status === 0) ? 0 : 1;
    const formattedImageUrl = formatImageUrl(image_url);

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
            description || '', 
            parseFloat(price) || 0.00, 
            parseInt(stock_quantity, 10) || 0, 
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
    const { id } = req.params;
    const { name, description, price, stock_quantity, image_url, elevation, process_type, status } = req.body;

    const isActive = (status === 'inactive' || status === false || status === 0) ? 0 : 1;
    const formattedImageUrl = formatImageUrl(image_url);

    const query = `
        UPDATE products 
        SET name = ?, description = ?, price = ?, stock_quantity = ?, image_url = ?, elevation = ?, process_type = ?, is_active = ?
        WHERE id = ?
    `;

    try {
        const [result] = await db.execute(query, [
            name, 
            description || '', 
            parseFloat(price) || 0.00, 
            parseInt(stock_quantity, 10) || 0, 
            formattedImageUrl, 
            elevation || '5,000 ft', 
            process_type || 'Orthodox', 
            isActive, 
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product updated successfully', id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// DELETE PRODUCT
const deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute(`DELETE FROM products WHERE id = ?`, [id]);
        
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
    const { id } = req.params;
    const { status, is_active } = req.body; 

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