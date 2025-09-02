const mongoose = require("mongoose");

const settlementSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: "LKR",
  },
  status: {
    type: String,
    enum: ["pending", "completed", "cancelled"],
    default: "pending",
  },
  method: {
    type: String,
    enum: ["cash", "bank_transfer", "digital_wallet", "other"],
    default: "other",
  },
  notes: {
    type: String,
    trim: true,
  },
  completedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update timestamp on save
settlementSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to mark settlement as completed
settlementSchema.methods.markCompleted = function () {
  this.status = "completed";
  this.completedAt = Date.now();
  return this.save();
};

// Method to cancel settlement
settlementSchema.methods.cancel = function () {
  this.status = "cancelled";
  return this.save();
};

// Static method to calculate settlements for a group
settlementSchema.statics.calculateGroupSettlements = async function (groupId) {
  const Expense = mongoose.model("Expense");

  // Get all expenses for the group
  const expenses = await Expense.find({ group: groupId })
    .populate("paidBy", "username firstName lastName")
    .populate("splits.user", "username firstName lastName");

  // Calculate net amounts for each user
  const userBalances = {};

  expenses.forEach((expense) => {
    // Add amount paid by user
    const paidBy = expense.paidBy._id.toString();
    userBalances[paidBy] = (userBalances[paidBy] || 0) + expense.amount;

    // Subtract amounts owed by user
    expense.splits.forEach((split) => {
      const userId = split.user._id.toString();
      userBalances[userId] = (userBalances[userId] || 0) - split.amount;
    });
  });

  // Generate settlements
  const settlements = [];
  const users = Object.keys(userBalances);

  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const user1 = users[i];
      const user2 = users[j];
      const balance1 = userBalances[user1];
      const balance2 = userBalances[user2];

      if (balance1 > 0 && balance2 < 0) {
        // User1 owes User2
        const amount = Math.min(balance1, Math.abs(balance2));
        settlements.push({
          fromUser: user1,
          toUser: user2,
          group: groupId,
          amount: amount,
          currency: "LKR",
        });
      } else if (balance1 < 0 && balance2 > 0) {
        // User2 owes User1
        const amount = Math.min(Math.abs(balance1), balance2);
        settlements.push({
          fromUser: user2,
          toUser: user1,
          group: groupId,
          amount: amount,
          currency: "LKR",
        });
      }
    }
  }

  return settlements;
};

module.exports = mongoose.model("Settlement", settlementSchema);
