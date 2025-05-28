const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply authentication middleware
router.use(authMiddleware);

// Get user's requests
router.get('/user', requestController.getUserRequests);

// Admin routes
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Get all requests (admin only)
router.get('/', adminOnly, requestController.getAllRequests);

// Get pending requests (admin only)
router.get('/pending', adminOnly, requestController.getPendingRequests);

// Process a request (admin only)
router.put('/:requestId', adminOnly, requestController.processRequest);

module.exports = router; 
