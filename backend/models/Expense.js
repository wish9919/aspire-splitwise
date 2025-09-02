const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true,
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
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  paidByMultiple: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: false, // Make group optional for non-group expenses
  },
  category: {
    type: String,
    enum: ["food", "transport", "entertainment", "shopping", "bills", "other"],
    default: "other",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  splits: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      percentage: {
        type: Number,
        min: 0,
        max: 100,
      },
      isPaid: {
        type: Boolean,
        default: false,
      },
    },
  ],
  splitType: {
    type: String,
    enum: ["equal", "percentage", "custom"],
    default: "equal",
  },
  notes: {
    type: String,
    trim: true,
  },
  receipt: {
    type: String, // URL to receipt image
    default: "",
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
expenseSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate equal splits
expenseSchema.methods.calculateEqualSplits = function (memberIds) {
  const splitAmount = this.amount / memberIds.length;

  this.splits = memberIds.map((userId) => ({
    user: userId,
    amount: splitAmount,
    percentage: 100 / memberIds.length,
    isPaid: false,
  }));

  this.splitType = "equal";
  return this.save();
};

// Method to calculate percentage splits
expenseSchema.methods.calculatePercentageSplits = function (splits) {
  this.splits = splits;
  this.splitType = "percentage";

  // Validate total percentage equals 100
  const totalPercentage = splits.reduce(
    (sum, split) => sum + split.percentage,
    0
  );
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error("Total percentage must equal 100%");
  }

  // Calculate amounts based on percentages
  this.splits.forEach((split) => {
    split.amount = (this.amount * split.percentage) / 100;
  });

  return this.save();
};

// Method to set custom splits
expenseSchema.methods.setCustomSplits = function (splits) {
  this.splits = splits;
  this.splitType = "custom";

  // Validate total amount equals expense amount
  const totalAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  if (Math.abs(totalAmount - this.amount) > 0.01) {
    throw new Error("Total split amount must equal expense amount");
  }

  // Calculate percentages
  this.splits.forEach((split) => {
    split.percentage = (split.amount / this.amount) * 100;
  });

  return this.save();
};

// Method to mark split as paid
expenseSchema.methods.markSplitAsPaid = function (userId) {
  const split = this.splits.find(
    (s) => s.user.toString() === userId.toString()
  );
  if (split) {
    split.isPaid = true;
    return this.save();
  }
  throw new Error("User not found in expense splits");
};

// Method to get total paid amount
expenseSchema.methods.getTotalPaid = function () {
  return this.splits
    .filter((split) => split.isPaid)
    .reduce((sum, split) => sum + split.amount, 0);
};

// Method to get total unpaid amount
expenseSchema.methods.getTotalUnpaid = function () {
  return this.splits
    .filter((split) => !split.isPaid)
    .reduce((sum, split) => sum + split.amount, 0);
};

module.exports = mongoose.model("Expense", expenseSchema);
