const mongoose = require('mongoose');

const equbSpinSchema = new mongoose.Schema({
  equbId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equb',
    required: true
  },
  equbName: {
    type: String,
    required: true
  },
  spinTime: {
    type: Date,
    required: true
  },
  prizeAmount: {
    type: Number,
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  winnerName: String,
  status: {
    type: String,
    enum: ['pending', 'spinning', 'completed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EqubSpin', equbSpinSchema); 

const equbSpinSchema = new mongoose.Schema({
  equbId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Equb',
    required: true
  },
  equbName: {
    type: String,
    required: true
  },
  spinTime: {
    type: Date,
    required: true
  },
  prizeAmount: {
    type: Number,
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  winnerName: String,
  status: {
    type: String,
    enum: ['pending', 'spinning', 'completed'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('EqubSpin', equbSpinSchema); 