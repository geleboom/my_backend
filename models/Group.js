const mongoose = require('mongoose');

// Schema for members with additional details
const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  // For Equb: track if this member has won a round
  hasWon: {
    type: Boolean,
    default: false
  },
  // For Equb: which round they won (if applicable)
  wonInRound: {
    type: Number
  },
  // For Edir: track contributions
  totalContributed: {
    type: Number,
    default: 0
  },
  // For Edir: track benefits received
  benefitsReceived: {
    type: Number,
    default: 0
  }
});

// Schema for rounds (primarily for Equb)
const roundSchema = new mongoose.Schema({
  roundNumber: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  amount: {
    type: Number
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed'],
    default: 'pending'
  },
  contributingMembers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    hasPaid: {
      type: Boolean,
      default: false
    },
    paymentDate: {
      type: Date
    }
  }]
});

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['equb', 'edir'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  amount: {
    type: Number,
    required: true
  },
  members: [memberSchema],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  nextDrawDate: {
    type: Date
  },
  currentRound: {
    type: Number,
    default: 1
  },
  totalRounds: {
    type: Number,
    required: true
  },
  // For Equb: track rounds
  rounds: [roundSchema],
  // For Equb: frequency of draws
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'monthly'],
    default: 'monthly'
  },
  // For Edir: rules and benefits
  rules: {
    type: String
  },
  benefits: {
    type: String
  },
  // For Edir: emergency contact
  emergencyContact: {
    name: String,
    phone: String,
    email: String
  },
  // For Edir: benefit requests
  benefitRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    details: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: Date,
    note: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
groupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Group = mongoose.model('Group', groupSchema);

module.exports = Group;