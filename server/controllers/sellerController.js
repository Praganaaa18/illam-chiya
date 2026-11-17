const db = require("../config/db");

const getSellerInfo = async (req, res) => {
  try {
    console.log(req);
    const [sellerInfo] = await db.execute(`SELECT * FROM users WHERE id = ?`, [req.params.sellerId]);
    res.status(200).json(sellerInfo[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getSellerInfo,
};
