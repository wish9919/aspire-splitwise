const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireGroupMember, requireGroupAdmin } = require('../middleware/groupAccess');
const {
  createGroup,
  getUserGroups,
  getGroup,
  updateGroup,
  addMember,
  removeMember,
  changeMemberRole,
  deleteGroup
} = require('../controllers/groupController');

// All routes require authentication
router.use(auth);

// Group management
router.post('/', createGroup);
router.get('/', getUserGroups);
router.get('/:groupId', requireGroupMember, getGroup);
router.put('/:groupId', requireGroupAdmin, updateGroup);
router.delete('/:groupId', requireGroupAdmin, deleteGroup);

// Member management
router.post('/:groupId/members', requireGroupAdmin, addMember);
router.delete('/:groupId/members/:userId', requireGroupAdmin, removeMember);
router.put('/:groupId/members/:userId/role', requireGroupAdmin, changeMemberRole);

module.exports = router;
