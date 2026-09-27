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

// Mounted at '/api/products' in server.js
router.get('/', getAllProducts);
router.post('/', createProduct);

// Seller Management routes
router.get('/seller/:sellerId', getSellerProducts);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/status', toggleProductStatus);

module.exports = router;