const express = require("express");
const router = express.Router();
const { getSellerInfo } = require("../controllers/sellerController");

router.get("/info/:sellerId", getSellerInfo);

module.exports = router;
