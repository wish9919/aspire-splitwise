const Group = require("../models/Group");
const User = require("../models/User");
const logger = require("../config/logger");

// Create new group
const createGroup = async (req, res) => {
  try {
    const { name, description, currency = "LKR" } = req.body;

    const group = new Group({
      name,
      description,
      currency,
      members: [
        {
          user: req.user._id,
          role: "admin",
          joinedAt: Date.now(),
        },
      ],
    });

    await group.save();

    // Add group to user's groups
    await User.findByIdAndUpdate(req.user._id, {
      $push: { groups: group._id },
    });

    // Populate group data
    await group.populate("members.user", "username firstName lastName avatar");

    res.status(201).json({
      message: "Group created successfully",
      group,
    });
  } catch (error) {
    logger.error("Create group error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Get all groups for current user
const getUserGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      "members.user": req.user._id,
    })
      .populate("members.user", "username firstName lastName avatar")
      .populate("expenses", "description amount date")
      .sort({ updatedAt: -1 });

    res.json({ groups });
  } catch (error) {
    logger.error("Get user groups error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Get specific group details
const getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate("members.user", "username firstName lastName avatar")
      .populate({
        path: "expenses",
        populate: {
          path: "paidBy",
          select: "username firstName lastName",
        },
      });

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    res.json({ group });
  } catch (error) {
    logger.error("Get group error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Update group
const updateGroup = async (req, res) => {
  try {
    const { name, description, currency } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (currency) updates.currency = currency;

    const group = await Group.findByIdAndUpdate(req.params.groupId, updates, {
      new: true,
      runValidators: true,
    }).populate("members.user", "username firstName lastName avatar");

    res.json({
      message: "Group updated successfully",
      group,
    });
  } catch (error) {
    logger.error("Update group error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Add member to group
const addMember = async (req, res) => {
  try {
    const { email, role = "member" } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if user is already a member
    if (req.group.isMember(user._id)) {
      return res
        .status(400)
        .json({ message: "User is already a member of this group." });
    }

    // Add user to group
    await req.group.addMember(user._id, role);

    // Add group to user's groups
    await User.findByIdAndUpdate(user._id, {
      $push: { groups: req.group._id },
    });

    // Populate updated group
    await req.group.populate(
      "members.user",
      "username firstName lastName avatar"
    );

    res.json({
      message: "Member added successfully",
      group: req.group,
    });
  } catch (error) {
    logger.error("Add member error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Remove member from group
const removeMember = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is trying to remove themselves
    if (userId === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot remove yourself from the group." });
    }

    // Check if user is a member
    if (!req.group.isMember(userId)) {
      return res
        .status(400)
        .json({ message: "User is not a member of this group." });
    }

    // Remove user from group
    await req.group.removeMember(userId);

    // Remove group from user's groups
    await User.findByIdAndUpdate(userId, { $pull: { groups: req.group._id } });

    res.json({ message: "Member removed successfully" });
  } catch (error) {
    logger.error("Remove member error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Change member role
const changeMemberRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    // Find member and update role
    const member = req.group.members.find((m) => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    member.role = role;
    await req.group.save();

    res.json({ message: "Member role updated successfully" });
  } catch (error) {
    logger.error("Change member role error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// Delete group
const deleteGroup = async (req, res) => {
  try {
    // Remove group from all members
    const memberIds = req.group.members.map((m) => m.user);
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { groups: req.group._id } }
    );

    // Delete the group
    await Group.findByIdAndDelete(req.params.groupId);

    res.json({ message: "Group deleted successfully" });
  } catch (error) {
    logger.error("Delete group error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroup,
  updateGroup,
  addMember,
  removeMember,
  changeMemberRole,
  deleteGroup,
};
