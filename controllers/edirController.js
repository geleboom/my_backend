const Group = require('../models/Group');
const Request = require('../models/Request');

// Get all available edirs
exports.getAvailableEdirs = async (req, res) => {
  try {
    const edirs = await Group.find({
      type: 'edir',
      status: 'active',
      'members.user': { $ne: req.user._id } // Exclude edirs where user is already a member
    }).populate('admin', 'fullName email');

    res.json(edirs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching available edirs', error: error.message });
  }
};

// Get edir by ID
exports.getEdirById = async (req, res) => {
  try {
    const edir = await Group.findOne({
      _id: req.params.id,
      type: 'edir'
    }).populate('admin', 'fullName email')
      .populate('members.user', 'fullName email');

    if (!edir) {
      return res.status(404).json({ message: 'Edir not found' });
    }

    res.json(edir);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching edir details', error: error.message });
  }
};

// Create join request for edir
exports.createJoinRequest = async (req, res) => {
  try {
    const edir = await Group.findOne({
      _id: req.params.groupId,
      type: 'edir',
      status: 'active'
    });

    if (!edir) {
      return res.status(404).json({ message: 'Edir not found or not active' });
    }

    // Check if user is already a member
    const isMember = edir.members.some(member => member.user.toString() === req.user._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this edir' });
    }

    // Check if there's already a pending request
    const existingRequest = await Request.findOne({
      user: req.user._id,
      group: edir._id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request for this edir' });
    }

    // Create new join request
    const request = new Request({
      user: req.user._id,
      group: edir._id,
      type: 'join',
      status: 'pending'
    });

    await request.save();

    res.status(201).json({ message: 'Join request sent successfully', request });
  } catch (error) {
    res.status(500).json({ message: 'Error creating join request', error: error.message });
  }
};

// Join edir by code
exports.joinByCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Edir code is required' });
    }

    const edir = await Group.findOne({
      type: 'edir',
      status: 'active',
      'inviteCode': code
    });

    if (!edir) {
      return res.status(404).json({ message: 'Invalid edir code' });
    }

    // Check if user is already a member
    const isMember = edir.members.some(member => member.user.toString() === req.user._id.toString());
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this edir' });
    }

    // Add user as member
    edir.members.push({
      user: req.user._id,
      joinDate: new Date(),
      status: 'active'
    });

    await edir.save();

    res.json({ message: 'Successfully joined the edir', edir });
  } catch (error) {
    res.status(500).json({ message: 'Error joining edir', error: error.message });
  }
}; 