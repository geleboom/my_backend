const express = require('express');
const router = express.Router();
const contributionController = require('../controllers/contributionController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get user's contributions
router.get('/my-contributions', contributionController.getUserContributions);

// Get pending contributions
router.get('/pending', contributionController.getPendingContributions);

// Get group contributions
router.get('/group/:groupId', contributionController.getGroupContributions);

// Create a new contribution
router.post('/', contributionController.createContribution);

// Update contribution status
router.patch('/:contributionId/status', contributionController.updateContributionStatus);

module.exports = router; 