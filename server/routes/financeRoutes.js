/* ==========================================================================
   ILAM CHIYA BACKEND - BILLINGS & PAYOUTS ROUTES
   ========================================================================== */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');

// Ensure upload folder exists for receipts
const uploadDir = path.join(__dirname, '../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

/**
 * @route   GET /api/finance/ledger/:sellerId
 * @desc    Fetch cash ledger for a specific seller
 */
router.get('/ledger/:sellerId', async (req, res) => {
  const { sellerId } = req.params;

  try {
    const query = `
      SELECT 
        o.id AS order_id,
        DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date,
        u.full_name AS customer,
        o.shipping_address AS address,
        SUM(oi.quantity * oi.price) AS total_amount,
        0.05 AS fee_rate,
        o.order_status AS status
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN users u ON o.buyer_id = u.id
      WHERE oi.seller_id = ?
      GROUP BY o.id, o.created_at, u.full_name, o.shipping_address, o.order_status
      ORDER BY o.created_at DESC;
    `;

    const [rows] = await db.execute(query, [sellerId]);
    res.status(200).json({ success: true, transactions: rows });
  } catch (error) {
    console.error("Database Query Error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch ledger data." });
  }
});

/**
 * @route   POST /api/finance/settle-dues
 * @desc    Upload fee settlement voucher screenshot
 */
router.post('/settle-dues', upload.single('proof'), async (req, res) => {
  const { sellerId, amountPaid } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, error: "Voucher screenshot is required." });
  }

  const proofPath = `/uploads/receipts/${req.file.filename}`;

  try {
    const query = `
      INSERT INTO fee_settlements (seller_id, amount_paid, proof_image) 
      VALUES (?, ?, ?)
    `;

    await db.execute(query, [sellerId, amountPaid, proofPath]);
    res.status(201).json({ 
      success: true, 
      message: "Proof submitted! The Ilam Chiya team will verify your payment." 
    });
  } catch (error) {
    console.error("Settlement Upload Error:", error);
    res.status(500).json({ success: false, error: "Failed to submit settlement proof." });
  }
});

module.exports = router;