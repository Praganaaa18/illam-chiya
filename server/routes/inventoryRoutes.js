const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getInventory, restockProduct } = require('../controllers/inventoryController');

router.use(authMiddleware);
router.get('/', getInventory);
router.patch('/:id/restock', restockProduct);

module.exports = router;
