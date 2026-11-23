const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../utils/emailService");
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
  const { email, password, role: requestedRole } = body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (!["buyer", "seller"].includes(requestedRole)) {
    return res.status(400).json({ message: "Choose a valid buyer or seller portal." });
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

    if (user.role !== requestedRole) {
      return res.status(403).json({ message: "This account cannot access the selected portal." });
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

exports.requestPasswordReset = async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  if (!emailService.isSmtpConfigured()) {
    return res.status(503).json({
      message: "Password recovery email is not configured. Please contact the site administrator.",
    });
  }

  try {
    const [users] = await db.query(
      "SELECT id, email, full_name FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (users.length === 0) {
      return res.status(200).json({
        message: "If an account exists for that email, a password reset link will be sent.",
      });
    }

    const user = users[0];
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await db.query(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND used_at IS NULL`,
      [user.id]
    );
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))`,
      [user.id, tokenHash]
    );

    const resetUrl = new URL("/password-recovery", process.env.CLIENT_URL || "http://localhost:3000");
    resetUrl.searchParams.set("token", token);
    await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.full_name || "there",
      resetUrl: resetUrl.toString(),
    });

    return res.status(200).json({
      message: "If an account exists for that email, a password reset link will be sent.",
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return res.status(500).json({ message: "Unable to send a password reset email. Please try again later." });
  }
};

exports.resetPassword = async (req, res) => {
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const password = req.body?.password;
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.status(400).json({ message: "This password reset link is invalid or expired." });
  }
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  let connection;
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [resetTokens] = await connection.execute(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1 FOR UPDATE`,
      [tokenHash]
    );
    if (resetTokens.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "This password reset link is invalid or expired." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await connection.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [passwordHash, resetTokens[0].user_id]
    );
    await connection.execute(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND used_at IS NULL`,
      [resetTokens[0].user_id]
    );
    await connection.commit();
    return res.status(200).json({ message: "Your password has been reset. You can now sign in." });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error resetting password:", error);
    return res.status(500).json({ message: "Unable to reset your password. Please try again." });
  } finally {
    if (connection) connection.release();
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
