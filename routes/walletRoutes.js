const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// User routes
router.get('/', walletController.getUserWallet);
router.post('/deposit/request', walletController.requestDeposit);
router.post('/withdrawal/request', walletController.requestWithdrawal);
router.post('/transfer', walletController.transferFunds);

// Admin routes
router.get('/admin/all', walletController.getAllWallets);
router.get('/admin/deposit-requests', walletController.getPendingDepositRequests);
router.post('/admin/process-deposit', walletController.processDeposit);
router.post('/admin/add-funds', walletController.addFunds);
router.post('/admin/process-deposit-by-reference', walletController.processDepositByReference);

module.exports = router;

