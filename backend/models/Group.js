const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      role: {
        type: String,
        enum: ["admin", "member"],
        default: "member",
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  expenses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
    },
  ],
  currency: {
    type: String,
    default: "LKR",
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
groupSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Method to add member to group
groupSchema.methods.addMember = function (userId, role = "member") {
  const existingMember = this.members.find(
    (member) => member.user.toString() === userId.toString()
  );

  if (!existingMember) {
    this.members.push({
      user: userId,
      role: role,
      joinedAt: Date.now(),
    });
  }

  return this.save();
};

// Method to remove member from group
groupSchema.methods.removeMember = function (userId) {
  this.members = this.members.filter(
    (member) => member.user.toString() !== userId.toString()
  );

  return this.save();
};

// Method to check if user is member
groupSchema.methods.isMember = function (userId) {
  return this.members.some(
    (member) => member.user.toString() === userId.toString()
  );
};

// Method to check if user is admin
groupSchema.methods.isAdmin = function (userId) {
  const member = this.members.find(
    (member) => member.user.toString() === userId.toString()
  );
  return member && member.role === "admin";
};

module.exports = mongoose.model("Group", groupSchema);
