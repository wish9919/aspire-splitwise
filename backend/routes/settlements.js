const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  getUserSettlements,
  getGroupSettlements,
  calculateGroupSettlements,
  createSettlement,
  updateSettlementStatus,
  deleteSettlement,
  getSettlementStats,
} = require("../controllers/settlementController");

// All routes are protected
router.use(auth);

// Get user settlements
router.get("/", getUserSettlements);

// Get settlement statistics
router.get("/stats", getSettlementStats);

// Get group settlements
router.get("/group/:groupId", getGroupSettlements);

// Calculate settlements for a group
router.post("/group/:groupId/calculate", calculateGroupSettlements);

// Create manual settlement
router.post("/", createSettlement);

// Update settlement status
router.put("/:settlementId", updateSettlementStatus);

// Delete settlement
router.delete("/:settlementId", deleteSettlement);

module.exports = router;
