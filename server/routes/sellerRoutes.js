const express = require("express");
const router = express.Router();
const { getSellerInfo } = require("../controllers/sellerController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/info/:sellerId", authMiddleware, getSellerInfo);

module.exports = router;
