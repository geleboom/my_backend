const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const edirController = require('../controllers/edirController');
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

// Get available edirs (for joining)
router.get('/edirs/available', edirController.getAvailableEdirs);

// Get equb by ID
router.get('/equbs/:id', groupController.getEqubById);

// Get edir by ID
router.get('/edirs/:id', edirController.getEdirById);

// Create a join request
router.post('/:groupId/join', requestController.createJoinRequest);

// Join edir by code
router.post('/edirs/join-by-code', edirController.joinByCode);

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

