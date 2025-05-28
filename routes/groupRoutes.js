const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const requestController = require('../controllers/requestController');
const authMiddleware = require('../middleware/authMiddleware');

// Public routes
router.get('/public', groupController.getPublicGroups);

// Protected routes
router.use(authMiddleware);

// Get all available groups (for Group Management page)
router.get('/', groupController.getAvailableGroups);

// Get all equbs
router.get('/equbs', groupController.getAllEqubs);

// Get all edirs
router.get('/edirs', groupController.getAllEdirs);

// Get equb by ID
router.get('/equbs/:id', groupController.getEqubById);

// Get edir by ID
router.get('/edirs/:id', groupController.getEdirById);

// Create a join request
router.post('/:groupId/join', requestController.createJoinRequest);

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Admin routes
router.post('/create', adminOnly, groupController.createGroup);
router.put('/:groupId', adminOnly, groupController.updateGroup);
router.delete('/:groupId', adminOnly, groupController.deleteGroup);

module.exports = router;

