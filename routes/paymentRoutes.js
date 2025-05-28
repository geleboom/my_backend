const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Create a new branch payment (admin only)
router.post('/branch', paymentController.createBranchPayment);

// Get all pending payments (admin only)
router.get('/pending', paymentController.getPendingPayments);

// Confirm a payment (admin only)
router.patch('/:paymentId/confirm', paymentController.confirmPayment);

// Reject a payment (admin only)
router.patch('/:paymentId/reject', paymentController.rejectPayment);

// Get payment statistics (admin only)
router.get('/stats', paymentController.getPaymentStats);

module.exports = router; 