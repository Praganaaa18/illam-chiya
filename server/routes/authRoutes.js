const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { unlink } = require('fs/promises');
const {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  getProfile,
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const {
  MAX_UPLOAD_SIZE_BYTES,
  isValidUploadSize,
  UPLOAD_SIZE_ERROR,
} = require('../utils/uploadLimits');

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

const upload = multer({ storage, limits: { fileSize: MAX_UPLOAD_SIZE_BYTES } });
const uploadSellerDocument = (req, res, next) => {
  upload.single('document')(req, res, async (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: UPLOAD_SIZE_ERROR });
      }
      if (error instanceof multer.MulterError) {
        return res.status(400).json({ message: error.message });
      }
      return next(error);
    }

    if (!req.file) {
      if (req.body?.role === 'seller') {
        return res.status(400).json({ message: 'Please upload your business registration or PAN certificate.' });
      }
      return next();
    }

    if (!isValidUploadSize(req.file.size)) {
      try {
        await unlink(req.file.path);
      } catch (cleanupError) {
        return next(cleanupError);
      }
      return res.status(400).json({ message: UPLOAD_SIZE_ERROR });
    }

    return next();
  });
};

// ================= AUTH ROUTES =================
// 'document' matches the key name sent from RegisterSeller.jsx FormData
router.post('/register', uploadSellerDocument, register);
router.post('/login', login);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.get('/me', authMiddleware, getProfile);

module.exports = router;