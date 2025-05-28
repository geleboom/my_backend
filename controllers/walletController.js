const { Wallet, Transaction } = require('../models/Wallet');
const User = require('../models/User');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Get user's wallet
const getUserWallet = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find or create wallet
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: []
      });
      await wallet.save();
    }

    res.status(200).json(wallet);
  } catch (error) {
    console.error('Error in getUserWallet:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Request deposit (branch payment)
const requestDeposit = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, branchName, referenceNumber, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!branchName) {
      return res.status(400).json({ message: 'Branch name is required' });
    }

    if (!referenceNumber) {
      return res.status(400).json({ message: 'Reference number is required' });
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: []
      });
    }

    // Create new transaction
    const transaction = {
      walletId: wallet._id,
      type: 'deposit',
      amount,
      description: `Deposit via branch payment (${branchName})`,
      status: 'pending',
      branchName,
      referenceNumber
    };

    wallet.transactions.push(transaction);
    await wallet.save();

    // Create notification for admin
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    
    for (const admin of admins) {
      const notification = new Notification({
        user: admin._id,
        title: 'New Deposit Request',
        message: `User ${req.user.Firstname} ${req.user.Lastname} has requested a deposit of ${amount} ETB.`,
        type: 'info',
        relatedTo: 'payment',
        relatedId: wallet._id
      });
      
      await notification.save();
    }

    res.status(201).json({ 
      message: 'Deposit request submitted successfully',
      transaction: wallet.transactions[wallet.transactions.length - 1]
    });
  } catch (error) {
    console.error('Error in requestDeposit:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Request withdrawal
const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, bankName, accountNumber } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!bankName) {
      return res.status(400).json({ message: 'Bank name is required' });
    }

    if (!accountNumber) {
      return res.status(400).json({ message: 'Account number is required' });
    }

    // Find wallet
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Check if user has enough balance
    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create new transaction
    const transaction = {
      walletId: wallet._id,
      type: 'withdrawal',
      amount,
      description: `Withdrawal to ${bankName} (${accountNumber})`,
      status: 'pending',
      bankName,
      accountNumber
    };

    wallet.transactions.push(transaction);
    await wallet.save();

    // Create notification for admin
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    
    for (const admin of admins) {
      const notification = new Notification({
        user: admin._id,
        title: 'New Withdrawal Request',
        message: `User ${req.user.Firstname} ${req.user.Lastname} has requested a withdrawal of ${amount} ETB.`,
        type: 'info',
        relatedTo: 'payment',
        relatedId: wallet._id
      });
      
      await notification.save();
    }

    res.status(201).json({ 
      message: 'Withdrawal request submitted successfully',
      transaction: wallet.transactions[wallet.transactions.length - 1]
    });
  } catch (error) {
    console.error('Error in requestWithdrawal:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Transfer funds
const transferFunds = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, recipientEmail, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    if (!recipientEmail) {
      return res.status(400).json({ message: 'Recipient email is required' });
    }

    // Find sender's wallet
    const senderWallet = await Wallet.findOne({ userId });

    if (!senderWallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Check if sender has enough balance
    if (senderWallet.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Find recipient
    const recipient = await User.findOne({ email: recipientEmail });

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    if (recipient._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    // Find or create recipient's wallet
    let recipientWallet = await Wallet.findOne({ userId: recipient._id });

    if (!recipientWallet) {
      recipientWallet = new Wallet({
        userId: recipient._id,
        balance: 0,
        transactions: []
      });
    }

    // Create transaction for sender
    const senderTransaction = {
      walletId: senderWallet._id,
      type: 'transfer',
      amount,
      description: description || `Transfer to ${recipient.Firstname} ${recipient.Lastname}`,
      status: 'completed',
      recipientId: recipient._id
    };

    // Create transaction for recipient
    const recipientTransaction = {
      walletId: recipientWallet._id,
      type: 'deposit',
      amount,
      description: `Transfer from ${req.user.Firstname} ${req.user.Lastname}`,
      status: 'completed'
    };

    // Update balances
    senderWallet.balance -= amount;
    recipientWallet.balance += amount;

    // Add transactions
    senderWallet.transactions.push(senderTransaction);
    recipientWallet.transactions.push(recipientTransaction);

    // Save both wallets
    await senderWallet.save();
    await recipientWallet.save();

    // Create notification for recipient
    const notification = new Notification({
      user: recipient._id,
      title: 'Funds Received',
      message: `You have received ${amount} ETB from ${req.user.Firstname} ${req.user.Lastname}.`,
      type: 'success',
      relatedTo: 'payment',
      relatedId: recipientWallet._id
    });
    
    await notification.save();

    res.status(200).json({ 
      message: 'Transfer completed successfully',
      transaction: senderWallet.transactions[senderWallet.transactions.length - 1]
    });
  } catch (error) {
    console.error('Error in transferFunds:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all wallets
const getAllWallets = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const wallets = await Wallet.find()
      .populate('userId', 'Firstname Lastname email phone');

    res.status(200).json(wallets);
  } catch (error) {
    console.error('Error in getAllWallets:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get pending deposit requests
const getPendingDepositRequests = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const wallets = await Wallet.find({
      'transactions.type': 'deposit',
      'transactions.status': 'pending'
    }).populate('userId', 'Firstname Lastname email phone');

    // Extract pending deposit transactions
    const pendingDeposits = [];
    
    wallets.forEach(wallet => {
      wallet.transactions.forEach(transaction => {
        if (transaction.type === 'deposit' && transaction.status === 'pending') {
          pendingDeposits.push({
            transactionId: transaction._id,
            walletId: wallet._id,
            userId: wallet.userId,
            amount: transaction.amount,
            description: transaction.description,
            branchName: transaction.branchName,
            referenceNumber: transaction.referenceNumber,
            createdAt: transaction.createdAt
          });
        }
      });
    });

    res.status(200).json(pendingDeposits);
  } catch (error) {
    console.error('Error in getPendingDepositRequests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Process deposit
const processDeposit = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { walletId, transactionId, status } = req.body;

    if (!walletId || !transactionId || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (status !== 'completed' && status !== 'failed') {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find wallet
    const wallet = await Wallet.findById(walletId);

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Find transaction
    const transaction = wallet.transactions.id(transactionId);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    if (transaction.type !== 'deposit') {
      return res.status(400).json({ message: 'Transaction is not a deposit' });
    }

    // Update transaction
    transaction.status = status;
    transaction.processedBy = req.user._id;
    transaction.processedAt = Date.now();

    // Update balance if approved
    if (status === 'completed') {
      wallet.balance += transaction.amount;
    }

    await wallet.save();

    // Create notification for user
    const notification = new Notification({
      user: wallet.userId,
      title: status === 'completed' ? 'Deposit Approved' : 'Deposit Rejected',
      message: status === 'completed' 
        ? `Your deposit of ${transaction.amount} ETB has been approved.`
        : `Your deposit of ${transaction.amount} ETB has been rejected.`,
      type: status === 'completed' ? 'success' : 'error',
      relatedTo: 'payment',
      relatedId: wallet._id
    });
    
    await notification.save();

    res.status(200).json({ 
      message: `Deposit ${status === 'completed' ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    console.error('Error in processDeposit:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Add funds directly
const addFunds = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { userId, amount, note } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: []
      });
    }

    // Create transaction
    const transaction = {
      walletId: wallet._id,
      type: 'deposit',
      amount,
      description: note || 'Funds added by admin',
      status: 'completed',
      processedBy: req.user._id,
      processedAt: Date.now()
    };

    // Update balance
    wallet.balance += amount;
    wallet.transactions.push(transaction);
    await wallet.save();

    // Create notification for user
    const notification = new Notification({
      user: userId,
      title: 'Funds Added',
      message: `${amount} ETB has been added to your wallet by admin.`,
      type: 'success',
      relatedTo: 'payment',
      relatedId: wallet._id
    });
    
    await notification.save();

    res.status(200).json({ 
      message: 'Funds added successfully',
      wallet
    });
  } catch (error) {
    console.error('Error in addFunds:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Process deposit by reference number
const processDepositByReference = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { userId, amount, referenceNumber, note } = req.body;

    if (!userId || !amount || amount <= 0 || !referenceNumber) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find or create wallet
    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        transactions: []
      });
    }

    // Create transaction
    const transaction = {
      walletId: wallet._id,
      type: 'deposit',
      amount,
      description: note || `Deposit with reference: ${referenceNumber}`,
      status: 'completed',
      referenceNumber,
      processedBy: req.user._id,
      processedAt: Date.now()
    };

    // Update balance
    wallet.balance += amount;
    wallet.transactions.push(transaction);
    await wallet.save();

    // Create notification for user
    const notification = new Notification({
      user: userId,
      title: 'Deposit Completed',
      message: `${amount} ETB has been deposited to your wallet (Ref: ${referenceNumber}).`,
      type: 'success',
      relatedTo: 'payment',
      relatedId: wallet._id
    });
    
    await notification.save();

    res.status(200).json({ 
      message: 'Deposit processed successfully',
      wallet
    });
  } catch (error) {
    console.error('Error in processDepositByReference:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserWallet,
  requestDeposit,
  requestWithdrawal,
  transferFunds,
  getAllWallets,
  getPendingDepositRequests,
  processDeposit,
  addFunds,
  processDepositByReference,
};

