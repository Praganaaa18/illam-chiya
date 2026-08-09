const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());
const authRoutes = require('./routes/authRoutes');

app.use(express.json());

// Auth API route
app.use('/api/auth', authRoutes);
const productRoutes = require('./routes/productRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/uploads', express.static('uploads'));

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
    console.log('DB connection issue:', err.message);
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  });