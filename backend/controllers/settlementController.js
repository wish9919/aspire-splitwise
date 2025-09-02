const Settlement = require("../models/Settlement");
const Group = require("../models/Group");
const User = require("../models/User");
const logger = require("../config/logger");

// Get user settlements
const getUserSettlements = async (req, res) => {
  try {
    const { status, groupId } = req.query;
    const query = {
      $or: [{ fromUser: req.user._id }, { toUser: req.user._id }],
    };

    if (status) query.status = status;
    if (groupId) query.group = groupId;

    const settlements = await Settlement.find(query)
      .populate("fromUser", "username firstName lastName")
      .populate("toUser", "username firstName lastName")
      .populate("group", "name")
      .sort({ createdAt: -1 });

    res.json({ settlements });
  } catch (error) {
    logger.error("Get user settlements error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Get group settlements
const getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { status } = req.query;

    const query = { group: groupId };
    if (status) query.status = status;

    const settlements = await Settlement.find(query)
      .populate("fromUser", "username firstName lastName")
      .populate("toUser", "username firstName lastName")
      .sort({ createdAt: -1 });

    res.json({ settlements });
  } catch (error) {
    logger.error("Get group settlements error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Calculate settlements for a group
const calculateGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Calculate settlements
    const settlements = await Settlement.calculateGroupSettlements(groupId);

    // Save settlements to database
    const savedSettlements = await Settlement.insertMany(settlements);

    // Populate the saved settlements
    await Settlement.populate(savedSettlements, [
      { path: "fromUser", select: "username firstName lastName" },
      { path: "toUser", select: "username firstName lastName" },
    ]);

    res.json({
      message: "Settlements calculated successfully",
      settlements: savedSettlements,
    });
  } catch (error) {
    logger.error("Calculate settlements error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Create manual settlement
const createSettlement = async (req, res) => {
  try {
    const { toUserId, groupId, amount, method = "other", notes } = req.body;

    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (!group.isMember(req.user._id) || !group.isMember(toUserId)) {
      return res.status(403).json({ message: "Access denied." });
    }

    const settlement = new Settlement({
      fromUser: req.user._id,
      toUser: toUserId,
      group: groupId,
      amount,
      method,
      notes,
    });

    await settlement.save();

    // Populate settlement data
    await settlement.populate([
      { path: "fromUser", select: "username firstName lastName" },
      { path: "toUser", select: "username firstName lastName" },
      { path: "group", select: "name" },
    ]);

    res.status(201).json({
      message: "Settlement created successfully",
      settlement,
    });
  } catch (error) {
    logger.error("Create settlement error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Update settlement status
const updateSettlementStatus = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { status, method, notes } = req.body;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found." });
    }

    // Check if user is involved in the settlement
    if (
      settlement.fromUser.toString() !== req.user._id.toString() &&
      settlement.toUser.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Update settlement
    if (status) settlement.status = status;
    if (method) settlement.method = method;
    if (notes !== undefined) settlement.notes = notes;

    if (status === "completed") {
      settlement.markCompleted();
    } else if (status === "cancelled") {
      settlement.cancel();
    }

    await settlement.save();

    // Populate settlement data
    await settlement.populate([
      { path: "fromUser", select: "username firstName lastName" },
      { path: "toUser", select: "username firstName lastName" },
      { path: "group", select: "name" },
    ]);

    res.json({
      message: "Settlement updated successfully",
      settlement,
    });
  } catch (error) {
    logger.error("Update settlement error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Delete settlement
const deleteSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;

    const settlement = await Settlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ message: "Settlement not found." });
    }

    // Check if user is involved in the settlement
    if (
      settlement.fromUser.toString() !== req.user._id.toString() &&
      settlement.toUser.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied." });
    }

    await Settlement.findByIdAndDelete(settlementId);

    res.json({ message: "Settlement deleted successfully" });
  } catch (error) {
    logger.error("Delete settlement error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Get settlement statistics
const getSettlementStats = async (req, res) => {
  try {
    const { groupId } = req.query;
    const query = {
      $or: [{ fromUser: req.user._id }, { toUser: req.user._id }],
    };

    if (groupId) query.group = groupId;

    const settlements = await Settlement.find(query);

    const stats = {
      total: settlements.length,
      pending: settlements.filter((s) => s.status === "pending").length,
      completed: settlements.filter((s) => s.status === "completed").length,
      cancelled: settlements.filter((s) => s.status === "cancelled").length,
      totalAmount: settlements.reduce((sum, s) => sum + s.amount, 0),
      pendingAmount: settlements
        .filter((s) => s.status === "pending")
        .reduce((sum, s) => sum + s.amount, 0),
      completedAmount: settlements
        .filter((s) => s.status === "completed")
        .reduce((sum, s) => sum + s.amount, 0),
    };

    res.json({ stats });
  } catch (error) {
    logger.error("Get settlement stats error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  getUserSettlements,
  getGroupSettlements,
  calculateGroupSettlements,
  createSettlement,
  updateSettlementStatus,
  deleteSettlement,
  getSettlementStats,
};
