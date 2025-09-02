const Group = require('../models/Group');

const requireGroupMember = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.body.groupId;
    
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }
    
    if (!group.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this group.' });
    }
    
    req.group = group;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

const requireGroupAdmin = async (req, res, next) => {
  try {
    const groupId = req.params.groupId || req.body.groupId;
    
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found.' });
    }
    
    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    req.group = group;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { requireGroupMember, requireGroupAdmin };
