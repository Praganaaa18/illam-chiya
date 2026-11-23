const express = require("express");
const router = express.Router();
const {
  getSellerInfo,
  getSellerDrivers,
  addSellerDriver,
} = require("../controllers/sellerController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/drivers", authMiddleware, getSellerDrivers);
router.post("/drivers", authMiddleware, addSellerDriver);
router.get("/info/:sellerId", authMiddleware, getSellerInfo);

module.exports = router;
