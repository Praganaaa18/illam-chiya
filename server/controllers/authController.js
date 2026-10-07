const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ================= REGISTER CONTROLLER =================
exports.register = async (req, res) => {
  // Destructure text fields from incoming FormData request
  const { name, full_name, email, phone, address, pan_vat, password, role } = req.body;
  const userFullName = full_name || name;

  // Retrieve file path attached by multer
  const documentPath = req.file ? req.file.path : null;

  try {
    // Check if user already exists
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user with seller details & document path into database
    await db.query(
      'INSERT INTO users (full_name, email, phone, address, pan_vat, document_path, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        userFullName,
        email,
        phone || '',
        address || null,
        pan_vat || null,
        documentPath,
        hashedPassword,
        role || 'buyer'
      ]
    );

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ================= LOGIN CONTROLLER =================
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.full_name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};