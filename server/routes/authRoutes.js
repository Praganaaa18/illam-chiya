const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { register, login, getProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// ================= FILE STORAGE CONFIGURATION =================
const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generates unique filename using timestamp
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// ================= AUTH ROUTES =================
// 'document' matches the key name sent from RegisterSeller.jsx FormData
router.post('/register', upload.single('document'), register);
router.post('/login', login);
router.get('/me', authMiddleware, getProfile);

module.exports = router;