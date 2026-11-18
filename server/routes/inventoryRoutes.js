const express = require('express');
const { getSellerInventory, restockProduct } = require('../controllers/inventoryController');

const router = express.Router();

router.get('/', getSellerInventory);
router.patch('/:id/restock', restockProduct);

module.exports = router;
