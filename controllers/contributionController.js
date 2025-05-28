const Contribution = require('../models/Contribution');
const Group = require('../models/Group');

// Get user's contributions
const getUserContributions = async (req, res) => {
  try {
    const userId = req.user._id;
    const contributions = await Contribution.find({ user: userId })
      .populate('group', 'name type amount')
      .sort({ createdAt: -1 });

    res.status(200).json(contributions);
  } catch (error) {
    console.error('Error in getUserContributions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get group contributions
const getGroupContributions = async (req, res) => {
  try {
    const { groupId } = req.params;
    const contributions = await Contribution.find({ group: groupId })
      .populate('user', 'Firstname Lastname email')
      .sort({ createdAt: -1 });

    res.status(200).json(contributions);
  } catch (error) {
    console.error('Error in getGroupContributions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new contribution
const createContribution = async (req, res) => {
  try {
    const {
      groupId,
      amount,
      round,
      paymentMethod,
      transactionId,
      notes
    } = req.body;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.includes(req.user._id)) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    // Create new contribution
    const newContribution = new Contribution({
      group: groupId,
      user: req.user._id,
      amount,
      round,
      paymentMethod,
      transactionId,
      notes,
      paymentDate: new Date()
    });

    await newContribution.save();

    res.status(201).json(newContribution);
  } catch (error) {
    console.error('Error in createContribution:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update contribution status
const updateContributionStatus = async (req, res) => {
  try {
    const { contributionId } = req.params;
    const { status } = req.body;

    const contribution = await Contribution.findById(contributionId);
    if (!contribution) {
      return res.status(404).json({ message: 'Contribution not found' });
    }

    // Only group admin can update contribution status
    const group = await Group.findById(contribution.group);
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update contribution status' });
    }

    contribution.status = status;
    await contribution.save();

    res.status(200).json({ message: 'Contribution status updated successfully' });
  } catch (error) {
    console.error('Error in updateContributionStatus:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending contributions
const getPendingContributions = async (req, res) => {
  try {
    const userId = req.user._id;
    const contributions = await Contribution.find({
      user: userId,
      status: 'pending'
    })
      .populate('group', 'name type amount')
      .sort({ createdAt: -1 });

    res.status(200).json(contributions);
  } catch (error) {
    console.error('Error in getPendingContributions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUserContributions,
  getGroupContributions,
  createContribution,
  updateContributionStatus,
  getPendingContributions
};
