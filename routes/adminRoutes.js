// routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Public admin routes (no auth required)
router.post('/auth/login', adminController.loginAdmin);
router.get('/stats', adminController.getDashboardStats);

// 🔐 Apply authentication middleware to all protected admin routes
router.use(authMiddleware);

// Protected admin routes
router.get('/users', adminController.getAllUsers);
router.post('/create-admin', adminController.createAdmin);
router.patch('/users/:userId/status', adminController.updateUserStatus);
router.patch('/users/:userId/role', adminController.updateUserRole);
router.delete('/users/:userId', adminController.deleteUser);

// Admin only middleware
const adminOnly = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Create sample Equbs and Edirs (admin only)
router.post('/create-samples', authMiddleware, adminOnly, async (req, res) => {
  try {
    const adminUser = req.user;
    
    // Create sample Equbs
    const equbs = [
      {
        name: 'Weekly Savings Equb',
        type: 'equb',
        description: 'A weekly savings group for small businesses',
        amount: 1000,
        admin: adminUser._id,
        status: 'active',
        startDate: new Date(),
        totalRounds: 10,
        frequency: 'weekly',
        nextDrawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        currentRound: 1,
        members: [{
          user: adminUser._id,
          joinDate: new Date(),
          status: 'active'
        }],
        rounds: Array.from({ length: 10 }, (_, i) => ({
          roundNumber: i + 1,
          status: i === 0 ? 'active' : 'pending',
          contributingMembers: [{
            user: adminUser._id,
            hasPaid: false
          }]
        }))
      },
      {
        name: 'Monthly Business Equb',
        type: 'equb',
        description: 'Monthly contribution for business owners',
        amount: 5000,
        admin: adminUser._id,
        status: 'active',
        startDate: new Date(),
        totalRounds: 12,
        frequency: 'monthly',
        nextDrawDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
        currentRound: 1,
        members: [{
          user: adminUser._id,
          joinDate: new Date(),
          status: 'active'
        }],
        rounds: Array.from({ length: 12 }, (_, i) => ({
          roundNumber: i + 1,
          status: i === 0 ? 'active' : 'pending',
          contributingMembers: [{
            user: adminUser._id,
            hasPaid: false
          }]
        }))
      }
    ];

    // Create sample Edirs
    const edirs = [
      {
        name: 'Family Support Edir',
        type: 'edir',
        description: 'A monthly support group for family emergencies and celebrations',
        amount: 500,
        admin: adminUser._id,
        status: 'active',
        startDate: new Date(),
        totalRounds: 24,
        frequency: 'monthly',
        members: [{
          user: adminUser._id,
          joinDate: new Date(),
          status: 'active'
        }],
        rules: 'Members must attend monthly meetings. Support is provided for funerals, weddings, and births.',
        benefits: 'Financial support during family events, community support network'
      },
      {
        name: 'Business Network Edir',
        type: 'edir',
        description: 'Monthly contributions for business networking and support',
        amount: 1000,
        admin: adminUser._id,
        status: 'active',
        startDate: new Date(),
        totalRounds: 24,
        frequency: 'monthly',
        members: [{
          user: adminUser._id,
          joinDate: new Date(),
          status: 'active'
        }],
        rules: 'Members must be business owners. Support is provided for business emergencies.',
        benefits: 'Business networking, emergency financial support, mentorship opportunities'
      }
    ];

    // Insert sample data
    await Group.insertMany([...equbs, ...edirs]);
    
    res.status(201).json({ message: 'Sample Equbs and Edirs created successfully' });
  } catch (error) {
    console.error('Error creating samples:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
