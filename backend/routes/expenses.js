const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  getUserExpenses,
  getGroupExpenses,
  createExpense,
  getExpense,
  updateExpense,
  deleteExpense,
  markSplitAsPaid,
  getExpenseSummary,
} = require("../controllers/expenseController");

// All routes are protected
router.use(auth);

// Get user expenses
router.get("/", getUserExpenses);

// Get group expenses
router.get("/group/:groupId", getGroupExpenses);

// Get expense summary for a group
router.get("/group/:groupId/summary", getExpenseSummary);

// Alternative route for group expenses (matching frontend API calls)
router.get("/groups/:groupId/expenses", getGroupExpenses);

// Alternative route for expense summary (matching frontend API calls)
router.get("/groups/:groupId/expenses/summary", getExpenseSummary);

// Create expense
router.post("/", createExpense);

// Get single expense
router.get("/:expenseId", getExpense);

// Update expense
router.put("/:expenseId", updateExpense);

// Delete expense
router.delete("/:expenseId", deleteExpense);

// Mark split as paid
router.put("/:expenseId/splits/:userId/paid", markSplitAsPaid);

module.exports = router;
