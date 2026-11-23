const express = require('express');
const { unlink } = require('fs/promises');
const upload = require('../middleware/uploadMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const {
    isValidUploadSize,
    UPLOAD_SIZE_ERROR,
} = require('../utils/uploadLimits');

const router = express.Router();

router.post('/', authMiddleware, (req, res) => {
    if (req.user.role !== 'seller') {
        return res.status(403).json({ error: 'Seller access is required.' });
    }
    upload.single('image')(req, res, async (error) => {
        if (error) {
            const statusCode = error.code === 'LIMIT_FILE_SIZE'
                ? 413
                : error.name === 'MulterError' || error.code === 'INVALID_FILE_TYPE'
                  ? 400
                  : 500;
            return res.status(statusCode).json({
                error: error.code === 'LIMIT_FILE_SIZE' ? UPLOAD_SIZE_ERROR : error.message,
            });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Select an image to upload.' });
        }

        if (!isValidUploadSize(req.file.size)) {
            try {
                await unlink(req.file.path);
            } catch (cleanupError) {
                return next(cleanupError);
            }
            return res.status(400).json({ error: UPLOAD_SIZE_ERROR });
        }

        res.status(201).json({ filePath: `/uploads/${req.file.filename}` });
    });
});

module.exports = router;
