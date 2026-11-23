const db = require("../config/db");
const DEFAULT_DRIVERS = require("../utils/drivers");

const getSellerDrivers = async (req, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller access is required.' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, driver_name FROM seller_drivers WHERE seller_id = ? ORDER BY driver_name ASC',
      [req.user.id]
    );
    const drivers = [...DEFAULT_DRIVERS, ...rows.map((row) => row.driver_name)];
    return res.status(200).json({ drivers });
  } catch (err) {
    console.error('Error fetching seller drivers:', err);
    return res.status(500).json({ error: 'Failed to fetch seller drivers.' });
  }
};

const addSellerDriver = async (req, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller access is required.' });
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name || name.length > 120) {
    return res.status(400).json({ error: 'Driver name must be between 1 and 120 characters.' });
  }
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) {
    return res.status(400).json({
      error: 'Driver name may contain letters, spaces, periods, apostrophes, or hyphens only.',
    });
  }
  if (DEFAULT_DRIVERS.some((driver) => driver.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'This driver is already available.' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO seller_drivers (seller_id, driver_name) VALUES (?, ?)',
      [req.user.id, name]
    );
    return res.status(201).json({
      driver: { id: result.insertId, name },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This driver is already available.' });
    }
    console.error('Error adding seller driver:', err);
    return res.status(500).json({ error: 'Failed to add seller driver.' });
  }
};

const getSellerInfo = async (req, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller access is required.' });
  }
  if (Number(req.params.sellerId) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You can only view your own seller profile.' });
  }

  try {
    const [sellerInfo] = await db.execute(
      `SELECT id, full_name, email, phone, business_name, status
       FROM users
       WHERE id = ? AND role = 'seller'`,
      [req.user.id]
    );
    if (sellerInfo.length === 0) {
      return res.status(404).json({ error: 'Seller profile not found.' });
    }

    return res.status(200).json({
      ...sellerInfo[0],
      is_verified: ['approved', 'active'].includes(sellerInfo[0].status),
    });
  } catch (err) {
    console.error('Error fetching seller profile:', err);
    return res.status(500).json({ error: 'Failed to fetch seller profile.' });
  }
};

module.exports = {
  getSellerInfo,
  getSellerDrivers,
  addSellerDriver,
};
