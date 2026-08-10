const express = require('express');
const cors = require('cors');
const path = require('path'); // Added path import
require('dotenv').config();
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());

// Serve static image uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.get('/', (req, res) => {
  res.send('Illam Chiya API is live!');
});

const PORT = process.env.PORT || 5000;

db.getConnection()
  .then((connection) => {
    console.log('Database connected successfully!');
    connection.release();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Database connection error:', err);
  });