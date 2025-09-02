const Expense = require("../models/Expense");
const Group = require("../models/Group");
const User = require("../models/User");
const logger = require("../config/logger");

// Get user expenses
const getUserExpenses = async (req, res) => {
  try {
    const { groupId, category, startDate, endDate } = req.query;
    const query = {};

    // Find groups where user is a member
    const userGroups = await Group.find({
      members: { $elemMatch: { user: req.user._id } },
    }).select("_id");

    const groupIds = userGroups.map((group) => group._id);

    // Find expenses where user is involved (either in groups or as participant in non-group expenses)
    query.$or = [
      { group: { $in: groupIds } }, // Group expenses
      {
        $and: [
          { group: null }, // Non-group expenses
          {
            $or: [
              { paidBy: req.user._id }, // User paid
              { "paidByMultiple.user": req.user._id }, // User is in paidByMultiple
              { "splits.user": req.user._id }, // User is in splits
            ],
          },
        ],
      },
    ];

    if (groupId) {
      // Check if user is member of the specified group
      const group = await Group.findById(groupId);
      if (!group || !group.isMember(req.user._id)) {
        return res.status(403).json({ message: "Access denied." });
      }
      query.$or = [{ group: groupId }];
    }

    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate("paidBy", "username firstName lastName")
      .populate("paidByMultiple.user", "username firstName lastName")
      .populate("group", "name")
      .populate("splits.user", "username firstName lastName")
      .sort({ date: -1 });

    res.json({ expenses });
  } catch (error) {
    logger.error("Get user expenses error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Get group expenses
const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { category, startDate, endDate, page = 1, limit = 10 } = req.query;

    // Check if user is member of the group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied." });
    }

    const query = { group: groupId };

    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const expenses = await Expense.find(query)
      .populate("paidBy", "username firstName lastName")
      .populate("group", "name")
      .populate("splits.user", "username firstName lastName")
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Expense.countDocuments(query);

    res.json({
      data: expenses,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      limit: parseInt(limit),
    });
  } catch (error) {
    logger.error("Get group expenses error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Create expense
const createExpense = async (req, res) => {
  try {
    const {
      description,
      amount,
      groupId,
      category = "other",
      date = new Date(),
      splitType = "equal",
      customSplits = [],
      notes = "",
      paidByMultiple = [],
      participants = [], // For non-group expenses
    } = req.body;

    let group = null;
    let groupMembers = [];

    // Handle group expenses
    if (groupId) {
      group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ message: "Group not found." });
      }

      if (!group.isMember(req.user._id)) {
        return res.status(403).json({ message: "Access denied." });
      }
      groupMembers = group.members.map((member) => member.user);
    }

    // Determine participants for splitting
    let expenseParticipants = [];
    if (groupId && group) {
      expenseParticipants = group.members.map((member) => member.user);
    } else if (participants.length > 0) {
      expenseParticipants = participants;
    } else {
      return res
        .status(400)
        .json({ message: "No participants specified for expense." });
    }

    // Debug: Log the paidByMultiple data
    console.log("paidByMultiple received:", paidByMultiple);

    // Create expense
    const expense = new Expense({
      description,
      amount,
      group: groupId || null,
      paidBy: req.user._id,
      paidByMultiple:
        paidByMultiple && paidByMultiple.length > 0 ? paidByMultiple : [],
      category,
      date: new Date(date),
      splitType,
      notes,
      currency: "LKR",
    });

    // Calculate splits based on split type
    if (splitType === "equal") {
      const memberCount = expenseParticipants.length;
      const splitAmount = amount / memberCount;

      expense.splits = expenseParticipants.map((userId) => ({
        user: userId,
        amount: splitAmount,
        isPaid: false,
      }));
    } else if (splitType === "percentage") {
      // For percentage splits, customSplits should contain percentage values
      const totalPercentage = customSplits.reduce(
        (sum, split) => sum + split.percentage,
        0
      );
      if (Math.abs(totalPercentage - 100) > 0.01) {
        return res
          .status(400)
          .json({ message: "Percentages must add up to 100%." });
      }

      expense.splits = customSplits.map((split) => ({
        user: split.userId,
        amount: (amount * split.percentage) / 100,
        percentage: split.percentage,
        isPaid: false,
      }));
    } else if (splitType === "custom") {
      // For custom splits, customSplits should contain exact amounts
      const totalAmount = customSplits.reduce(
        (sum, split) => sum + split.amount,
        0
      );
      if (Math.abs(totalAmount - amount) > 0.01) {
        return res.status(400).json({
          message:
            "Custom split amounts must add up to the total expense amount.",
        });
      }

      expense.splits = customSplits.map((split) => ({
        user: split.userId,
        amount: split.amount,
        percentage: (split.amount / amount) * 100,
        isPaid: false,
      }));
    }

    await expense.save();

    // Populate expense data
    await expense.populate([
      { path: "paidBy", select: "username firstName lastName" },
      { path: "paidByMultiple.user", select: "username firstName lastName" },
      { path: "group", select: "name" },
      { path: "splits.user", select: "username firstName lastName" },
    ]);

    res.status(201).json({
      message: "Expense created successfully",
      expense,
    });
  } catch (error) {
    logger.error("Create expense error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Get single expense
const getExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId)
      .populate("paidBy", "username firstName lastName")
      .populate("group", "name")
      .populate("splits.user", "username firstName lastName");

    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    // Check if user is member of the group
    const group = await Group.findById(expense.group._id);
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied." });
    }

    res.json({ expense });
  } catch (error) {
    logger.error("Get expense error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    const {
      description,
      amount,
      category,
      date,
      splitType,
      customSplits,
      notes,
    } = req.body;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    // Check if user is member of the group
    const group = await Group.findById(expense.group);
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Update expense fields
    if (description !== undefined) expense.description = description;
    if (amount !== undefined) expense.amount = amount;
    if (category !== undefined) expense.category = category;
    if (date !== undefined) expense.date = new Date(date);
    if (splitType !== undefined) expense.splitType = splitType;
    if (notes !== undefined) expense.notes = notes;

    // Recalculate splits if amount or split type changed
    if (amount !== undefined || splitType !== undefined) {
      if (splitType === "equal") {
        const memberCount = group.members.length;
        const splitAmount = expense.amount / memberCount;

        expense.splits = group.members.map((member) => ({
          user: member.user,
          amount: splitAmount,
          paid: member.user.toString() === req.user._id.toString(),
        }));
      } else if (splitType === "percentage" && customSplits) {
        const totalPercentage = customSplits.reduce(
          (sum, split) => sum + split.percentage,
          0
        );
        if (Math.abs(totalPercentage - 100) > 0.01) {
          return res
            .status(400)
            .json({ message: "Percentages must add up to 100%." });
        }

        expense.splits = customSplits.map((split) => ({
          user: split.userId,
          amount: (expense.amount * split.percentage) / 100,
          paid: split.userId === req.user._id.toString(),
        }));
      } else if (splitType === "custom" && customSplits) {
        const totalAmount = customSplits.reduce(
          (sum, split) => sum + split.amount,
          0
        );
        if (Math.abs(totalAmount - expense.amount) > 0.01) {
          return res.status(400).json({
            message:
              "Custom split amounts must add up to the total expense amount.",
          });
        }

        expense.splits = customSplits.map((split) => ({
          user: split.userId,
          amount: split.amount,
          paid: split.userId === req.user._id.toString(),
        }));
      }
    }

    await expense.save();

    // Populate expense data
    await expense.populate([
      { path: "paidBy", select: "username firstName lastName" },
      { path: "group", select: "name" },
      { path: "splits.user", select: "username firstName lastName" },
    ]);

    res.json({
      message: "Expense updated successfully",
      expense,
    });
  } catch (error) {
    logger.error("Update expense error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    // Check if user is member of the group
    const group = await Group.findById(expense.group);
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied." });
    }

    await Expense.findByIdAndDelete(expenseId);

    res.json({ message: "Expense deleted successfully" });
  } catch (error) {
    logger.error("Delete expense error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Mark split as paid
const markSplitAsPaid = async (req, res) => {
  try {
    const { expenseId, userId } = req.params;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found." });
    }

    // Check if user is member of the group
    const group = await Group.findById(expense.group);
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Find and update the split
    const split = expense.splits.find((s) => s.user.toString() === userId);
    if (!split) {
      return res.status(404).json({ message: "Split not found." });
    }

    split.paid = true;
    await expense.save();

    // Populate expense data
    await expense.populate([
      { path: "paidBy", select: "username firstName lastName" },
      { path: "group", select: "name" },
      { path: "splits.user", select: "username firstName lastName" },
    ]);

    res.json({
      message: "Split marked as paid successfully",
      expense,
    });
  } catch (error) {
    logger.error("Mark split as paid error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Get expense summary
const getExpenseSummary = async (req, res) => {
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

    const expenses = await Expense.find({ group: groupId })
      .populate("paidBy", "username firstName lastName")
      .populate("splits.user", "username firstName lastName");

    // Calculate summary
    const summary = {
      totalExpenses: expenses.length,
      totalSpent: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      totalOwed: 0, // This would need to be calculated based on splits
      categoryBreakdown: {},
      userBreakdown: {},
      recentExpenses: expenses.slice(0, 5),
    };

    // Category breakdown
    expenses.forEach((expense) => {
      summary.categoryBreakdown[expense.category] =
        (summary.categoryBreakdown[expense.category] || 0) + expense.amount;
    });

    // User breakdown (who paid what)
    expenses.forEach((expense) => {
      const paidBy = expense.paidBy._id.toString();
      summary.userBreakdown[paidBy] = {
        name: `${expense.paidBy.firstName} ${expense.paidBy.lastName}`,
        totalPaid:
          (summary.userBreakdown[paidBy]?.totalPaid || 0) + expense.amount,
      };
    });

    res.json({ summary });
  } catch (error) {
    logger.error("Get expense summary error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  getUserExpenses,
  getGroupExpenses,
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  markSplitAsPaid,
  getExpenseSummary,
};
