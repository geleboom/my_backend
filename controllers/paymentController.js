const Payment = require('../models/Payment');
const User = require('../models/User');
const Group = require('../models/Group');
const Notification = require('../models/Notification');

const paymentController = {
  createBranchPayment: async (req, res) => {
    try {
      const { userId, groupId, amount, paymentType, dueDate } = req.body;

      // Validate required fields
      if (!userId || !groupId || !amount || !paymentType || !dueDate) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      // Create new payment
      const payment = new Payment({
        userId,
        groupId,
        amount,
        paymentType,
        dueDate,
        status: 'Pending'
      });

      await payment.save();

      // Create notification for admin
      const notification = new Notification({
        userId: req.user._id, // Admin ID
        title: 'New Branch Payment',
        message: `New branch payment of ETB ${amount} pending confirmation`,
        type: 'payment',
        relatedId: payment._id
      });

      await notification.save();

      res.status(201).json({
        message: 'Branch payment created successfully',
        payment
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getPendingPayments: async (req, res) => {
    try {
      const payments = await Payment.find({ status: 'Pending' })
        .populate('userId', 'Firstname Lastname email')
        .populate('groupId', 'name')
        .sort({ createdAt: -1 });

      res.status(200).json(payments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  confirmPayment: async (req, res) => {
    try {
      const { paymentId } = req.params;
      const adminId = req.user._id;

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      if (payment.status !== 'Pending') {
        return res.status(400).json({ message: 'Payment is not pending' });
      }

      // Update payment status
      payment.status = 'Confirmed';
      payment.confirmedBy = adminId;
      payment.confirmedAt = new Date();
      await payment.save();

      // Create notification for user
      const notification = new Notification({
        userId: payment.userId,
        title: 'Payment Confirmed',
        message: `Your payment of ETB ${payment.amount} has been confirmed`,
        type: 'payment',
        relatedId: payment._id
      });

      await notification.save();

      res.status(200).json({
        message: 'Payment confirmed successfully',
        payment
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  rejectPayment: async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      const payment = await Payment.findById(paymentId);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      if (payment.status !== 'Pending') {
        return res.status(400).json({ message: 'Payment is not pending' });
      }

      // Update payment status
      payment.status = 'Rejected';
      payment.confirmedBy = req.user._id;
      payment.confirmedAt = new Date();
      await payment.save();

      // Create notification for user
      const notification = new Notification({
        userId: payment.userId,
        title: 'Payment Rejected',
        message: `Your payment of ETB ${payment.amount} has been rejected. Reason: ${reason}`,
        type: 'payment',
        relatedId: payment._id
      });

      await notification.save();

      res.status(200).json({
        message: 'Payment rejected successfully',
        payment
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getPaymentStats: async (req, res) => {
    try {
      const totalPayments = await Payment.countDocuments();
      const pendingPayments = await Payment.countDocuments({ status: 'Pending' });
      const confirmedPayments = await Payment.countDocuments({ status: 'Confirmed' });
      const rejectedPayments = await Payment.countDocuments({ status: 'Rejected' });

      const totalAmount = await Payment.aggregate([
        { $match: { status: 'Confirmed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      res.status(200).json({
        totalPayments,
        pendingPayments,
        confirmedPayments,
        rejectedPayments,
        totalAmount: totalAmount[0]?.total || 0
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

module.exports = paymentController; 