const express = require('express');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', (req, res) => {
    upload.single('image')(req, res, (error) => {
        if (error) {
            const statusCode = error.code === 'LIMIT_FILE_SIZE'
                ? 413
                : error.name === 'MulterError' || error.code === 'INVALID_FILE_TYPE'
                  ? 400
                  : 500;
            return res.status(statusCode).json({ error: error.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Select an image to upload.' });
        }

        res.status(201).json({ filePath: `/uploads/${req.file.filename}` });
    });
});

module.exports = router;
