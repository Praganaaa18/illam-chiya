const express = require('express');
const router = express.Router();
const { 
    getAllProducts, 
    createProduct, 
    getSellerProducts, 
    updateProduct, 
    deleteProduct, 
    toggleProductStatus 
} = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');

// Mounted at '/api/products' in server.js
router.get('/', getAllProducts);
router.post('/', authMiddleware, createProduct);

// Seller Management routes
router.get('/seller/:sellerId', authMiddleware, getSellerProducts);
router.put('/:id', authMiddleware, updateProduct);
router.delete('/:id', authMiddleware, deleteProduct);
router.patch('/:id/status', authMiddleware, toggleProductStatus);

module.exports = router;