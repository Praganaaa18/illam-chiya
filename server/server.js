const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const financeRoutes = require('./routes/financeRoutes'); // <-- 1. IMPORT FINANCE ROUTES HERE

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// Serve static image uploads (Product images, documents, payment receipts)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/finance', financeRoutes); // <-- 2. MOUNT FINANCE ROUTE HERE

// Health Check Route
app.get('/', (req, res) => {
  res.send('Illam Chiya API is live!');
});

const PORT = process.env.PORT || 5000;

// Test DB Connection and Start Express Server
db.getConnection()
  .then((connection) => {
    console.log('Database connected successfully!');
    connection.release();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });