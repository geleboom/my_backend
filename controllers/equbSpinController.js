const EqubSpin = require('../models/EqubSpin');
const Equb = require('../models/Equb');
const User = require('../models/User');

// Get all upcoming spins
exports.getUpcomingSpins = async (req, res) => {
  try {
    const spins = await EqubSpin.find({
      status: 'pending',
      spinTime: { $gte: new Date() }
    })
    .populate('equbId', 'name')
    .sort({ spinTime: 1 });

    res.json(spins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current spin
exports.getCurrentSpin = async (req, res) => {
  try {
    const currentSpin = await EqubSpin.findOne({
      status: { $in: ['pending', 'spinning'] },
      spinTime: { $lte: new Date() }
    })
    .populate('equbId', 'name')
    .populate('winnerId', 'name');

    if (!currentSpin) {
      return res.status(404).json({ message: 'No active spin found' });
    }

    res.json(currentSpin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Start a spin
exports.startSpin = async (req, res) => {
  try {
    const { spinId } = req.params;

    const spin = await EqubSpin.findById(spinId);
    if (!spin) {
      return res.status(404).json({ message: 'Spin not found' });
    }

    if (spin.status !== 'pending') {
      return res.status(400).json({ message: 'Spin is not in pending state' });
    }

    // Update spin status to spinning
    spin.status = 'spinning';
    await spin.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('spinStarted', spin);

    // Simulate spin completion after 3 seconds
    setTimeout(async () => {
      try {
        // Get random winner from participants
        const randomIndex = Math.floor(Math.random() * spin.participants.length);
        const winnerId = spin.participants[randomIndex];
        const winner = await User.findById(winnerId);

        // Update spin with winner
        spin.status = 'completed';
        spin.winnerId = winnerId;
        spin.winnerName = winner.name;
        await spin.save();

        // Emit socket event for winner announcement
        req.app.get('io').emit('spinCompleted', spin);
      } catch (error) {
        console.error('Error completing spin:', error);
      }
    }, 3000);

    res.json(spin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new spin
exports.createSpin = async (req, res) => {
  try {
    const { equbId, spinTime, prizeAmount } = req.body;

    const equb = await Equb.findById(equbId);
    if (!equb) {
      return res.status(404).json({ message: 'Equb not found' });
    }

    const spin = new EqubSpin({
      equbId,
      equbName: equb.name,
      spinTime,
      prizeAmount,
      participants: equb.members,
      status: 'pending'
    });

    await spin.save();
    res.status(201).json(spin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 
const Equb = require('../models/Equb');
const User = require('../models/User');

// Get all upcoming spins
exports.getUpcomingSpins = async (req, res) => {
  try {
    const spins = await EqubSpin.find({
      status: 'pending',
      spinTime: { $gte: new Date() }
    })
    .populate('equbId', 'name')
    .sort({ spinTime: 1 });

    res.json(spins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get current spin
exports.getCurrentSpin = async (req, res) => {
  try {
    const currentSpin = await EqubSpin.findOne({
      status: { $in: ['pending', 'spinning'] },
      spinTime: { $lte: new Date() }
    })
    .populate('equbId', 'name')
    .populate('winnerId', 'name');

    if (!currentSpin) {
      return res.status(404).json({ message: 'No active spin found' });
    }

    res.json(currentSpin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Start a spin
exports.startSpin = async (req, res) => {
  try {
    const { spinId } = req.params;

    const spin = await EqubSpin.findById(spinId);
    if (!spin) {
      return res.status(404).json({ message: 'Spin not found' });
    }

    if (spin.status !== 'pending') {
      return res.status(400).json({ message: 'Spin is not in pending state' });
    }

    // Update spin status to spinning
    spin.status = 'spinning';
    await spin.save();

    // Emit socket event for real-time updates
    req.app.get('io').emit('spinStarted', spin);

    // Simulate spin completion after 3 seconds
    setTimeout(async () => {
      try {
        // Get random winner from participants
        const randomIndex = Math.floor(Math.random() * spin.participants.length);
        const winnerId = spin.participants[randomIndex];
        const winner = await User.findById(winnerId);

        // Update spin with winner
        spin.status = 'completed';
        spin.winnerId = winnerId;
        spin.winnerName = winner.name;
        await spin.save();

        // Emit socket event for winner announcement
        req.app.get('io').emit('spinCompleted', spin);
      } catch (error) {
        console.error('Error completing spin:', error);
      }
    }, 3000);

    res.json(spin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new spin
exports.createSpin = async (req, res) => {
  try {
    const { equbId, spinTime, prizeAmount } = req.body;

    const equb = await Equb.findById(equbId);
    if (!equb) {
      return res.status(404).json({ message: 'Equb not found' });
    }

    const spin = new EqubSpin({
      equbId,
      equbName: equb.name,
      spinTime,
      prizeAmount,
      participants: equb.members,
      status: 'pending'
    });

    await spin.save();
    res.status(201).json(spin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 