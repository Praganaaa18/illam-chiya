const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  isValidEmail,
  isValidPanNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
} = require("../utils/validation");

// ================= REGISTER CONTROLLER =================
exports.register = async (req, res) => {
  // Destructure text fields from incoming FormData request
  const body = req.body || {};
  const { name, full_name, email, phone, address, delivery_address, pan_vat, password, role } = body;
  const rawName = full_name || name;
  const userFullName = typeof rawName === "string" ? rawName.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPhone = normalizePhoneNumber(phone);
  const accountRole = role || "buyer";

  // Retrieve file path attached by multer
  const documentPath = req.file ? req.file.path : null;

  if (!["buyer", "seller"].includes(accountRole)) {
    return res.status(400).json({ message: "Choose a valid buyer or seller account type." });
  }
  if (!userFullName) {
    return res.status(400).json({ message: "Full name or business name is required." });
  }
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (!isValidPhoneNumber(phone)) {
    return res.status(400).json({ message: "Enter a valid Nepal mobile number (10 digits)." });
  }
  if (accountRole === "seller" && !isValidPanNumber(pan_vat)) {
    return res.status(400).json({ message: "Enter a valid 9-digit PAN / VAT number." });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  try {
    // Check if user already exists
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user with seller details & document path into database
    await db.query(
      "INSERT INTO users (full_name, email, phone, address, delivery_address, pan_vat, document_path, password, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userFullName,
        normalizedEmail,
        normalizedPhone,
        address || null,
        delivery_address || address || null,
        accountRole === "seller" ? pan_vat.trim() : null,
        documentPath,
        hashedPassword,
        accountRole,
      ],
    );

    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// ================= LOGIN CONTROLLER =================
exports.login = async (req, res) => {
  const body = req.body || {};
  const { email, password } = body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  try {
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    const storedPassword = typeof user.password === "string" ? user.password : "";
    const hasBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
    const isMatch = hasBcryptHash
      ? await bcrypt.compare(password, storedPassword)
      : storedPassword === password;
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!hasBcryptHash) {
      const upgradedPasswordHash = await bcrypt.hash(password, 10);
      await db.query("UPDATE users SET password = ? WHERE id = ?", [upgradedPasswordHash, user.id]);
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || "secretkey", {
      expiresIn: "1d",
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.delivery_address || user.address,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const [users] = await db.execute(
      `SELECT id, full_name, email, phone, address, delivery_address
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    return res.status(200).json(users[0]);
  } catch (error) {
    console.error('Error fetching authenticated profile:', error);
    return res.status(500).json({ message: 'Failed to fetch profile.' });
  }
};
