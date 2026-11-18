const db = require("../config/db");

const getSellerInfo = async (req, res) => {
  if (req.user.role !== 'seller') {
    return res.status(403).json({ error: 'Seller access is required.' });
  }
  if (Number(req.params.sellerId) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You can only view your own seller profile.' });
  }

  try {
    const [sellerInfo] = await db.execute(
      `SELECT id, full_name, email, business_name, status
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
};
