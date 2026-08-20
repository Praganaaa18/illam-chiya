const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { register, login } = require('../controllers/authController');

// ================= FILE STORAGE CONFIGURATION =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Saves files into server/uploads folder
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

module.exports = router;