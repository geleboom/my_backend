const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get all available groups
const getAvailableGroups = async (req, res) => {
  try {
    const groups = await Group.find({ status: 'active' })
      .populate('admin', 'Firstname Lastname email')
      .populate('members', 'Firstname Lastname email')
      .sort({ createdAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.error('Error in getAvailableGroups:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's groups
const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({
      $or: [
        { members: userId },
        { admin: userId }
      ]
    })
      .populate('admin', 'Firstname Lastname email')
      .populate('members', 'Firstname Lastname email')
      .sort({ createdAt: -1 });

    res.status(200).json(groups);
  } catch (error) {
    console.error('Error in getUserGroups:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new group
const createGroup = async (req, res) => {
  try {
    const {
      name,
      type,
      description,
      amount,
      totalRounds,
      startDate,
      nextDrawDate,
      frequency,
      rules,
      benefits,
      emergencyContact
    } = req.body;

    // Validate required fields
    if (!name || !type || !amount || !totalRounds || !startDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create initial member entry for the admin
    const initialMember = {
      user: req.user._id,
      joinDate: new Date(),
      status: 'active'
    };

    // Create initial rounds for Equb
    const rounds = [];
    if (type === 'equb') {
      for (let i = 1; i <= totalRounds; i++) {
        rounds.push({
          roundNumber: i,
          status: i === 1 ? 'active' : 'pending',
          contributingMembers: [{
            user: req.user._id,
            hasPaid: false
          }]
        });
      }
    }

    const newGroup = new Group({
      name,
      type,
      description,
      amount,
      totalRounds,
      startDate,
      nextDrawDate,
      admin: req.user._id,
      members: [initialMember],
      frequency: frequency || 'monthly',
      rounds: rounds,
      rules,
      benefits,
      emergencyContact
    });

    await newGroup.save();

    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error in createGroup:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join a group
const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.status !== 'active') {
      return res.status(400).json({ message: 'Group is not active' });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => member.user.toString() === userId.toString());
    if (isMember) {
      return res.status(400).json({ message: 'Already a member of this group' });
    }

    // Create new member entry
    const newMember = {
      user: userId,
      joinDate: new Date(),
      status: 'active'
    };

    group.members.push(newMember);

    // If this is an Equb, add the user to all active and pending rounds
    if (group.type === 'equb') {
      group.rounds.forEach(round => {
        if (round.status !== 'completed') {
          round.contributingMembers.push({
            user: userId,
            hasPaid: false
          });
        }
      });
    }

    await group.save();

    // Create notification for group admin
    const notification = new Notification({
      user: group.admin,
      title: 'New Member Joined',
      message: `${req.user.Firstname} ${req.user.Lastname} has joined your ${group.type === 'equb' ? 'Equb' : 'Edir'} group "${group.name}".`,
      type: 'info',
      relatedTo: group.type,
      relatedId: group._id
    });

    await notification.save();

    res.status(200).json({ message: 'Successfully joined the group' });
  } catch (error) {
    console.error('Error in joinGroup:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get group details
const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findById(groupId)
      .populate('admin', 'Firstname Lastname email')
      .populate('members', 'Firstname Lastname email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.status(200).json(group);
  } catch (error) {
    console.error('Error in getGroupDetails:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update group status
const updateGroupStatus = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { status } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only admin can update group status
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update group status' });
    }

    group.status = status;
    await group.save();

    res.status(200).json({ message: 'Group status updated successfully' });
  } catch (error) {
    console.error('Error in updateGroupStatus:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Perform Equb draw for a round
const performEqubDraw = async (req, res) => {
  try {
    const { groupId, roundNumber } = req.params;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only admin can perform draw
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to perform draw' });
    }

    if (group.type !== 'equb') {
      return res.status(400).json({ message: 'This operation is only valid for Equb groups' });
    }

    // Find the round
    const roundIndex = group.rounds.findIndex(r => r.roundNumber === parseInt(roundNumber));
    if (roundIndex === -1) {
      return res.status(404).json({ message: 'Round not found' });
    }

    const round = group.rounds[roundIndex];

    if (round.status !== 'active') {
      return res.status(400).json({ message: 'Round is not active' });
    }

    if (round.winner) {
      return res.status(400).json({ message: 'Round already has a winner' });
    }

    // Get eligible members (those who haven't won yet)
    const eligibleMembers = group.members.filter(member =>
      !member.hasWon &&
      member.status === 'active'
    );

    if (eligibleMembers.length === 0) {
      return res.status(400).json({ message: 'No eligible members for draw' });
    }

    // Randomly select a winner
    const winnerIndex = Math.floor(Math.random() * eligibleMembers.length);
    const winner = eligibleMembers[winnerIndex];

    // Update round with winner
    round.winner = winner.user;
    round.status = 'completed';

    // Update member as having won
    const memberIndex = group.members.findIndex(m => m.user.toString() === winner.user.toString());
    if (memberIndex !== -1) {
      group.members[memberIndex].hasWon = true;
      group.members[memberIndex].wonInRound = parseInt(roundNumber);
    }

    // Update current round and next draw date
    group.currentRound += 1;

    // If there are more rounds, set the next one as active
    if (group.currentRound <= group.totalRounds) {
      const nextRoundIndex = group.rounds.findIndex(r => r.roundNumber === group.currentRound);
      if (nextRoundIndex !== -1) {
        group.rounds[nextRoundIndex].status = 'active';

        // Calculate next draw date based on frequency
        const nextDrawDate = new Date();
        if (group.frequency === 'weekly') {
          nextDrawDate.setDate(nextDrawDate.getDate() + 7);
        } else if (group.frequency === 'biweekly') {
          nextDrawDate.setDate(nextDrawDate.getDate() + 14);
        } else {
          // Default to monthly
          nextDrawDate.setMonth(nextDrawDate.getMonth() + 1);
        }

        group.nextDrawDate = nextDrawDate;
      }
    } else {
      // All rounds completed
      group.status = 'completed';
      group.endDate = new Date();
    }

    await group.save();

    // Create notification for winner
    const notification = new Notification({
      user: winner.user,
      title: 'Congratulations! You Won the Equb Draw',
      message: `You have won round ${roundNumber} of the Equb "${group.name}" with an amount of ${group.amount * group.members.length} ETB.`,
      type: 'success',
      relatedTo: 'equb',
      relatedId: group._id
    });

    await notification.save();

    // Create notifications for all other members
    const winnerUser = await User.findById(winner.user);
    for (const member of group.members) {
      if (member.user.toString() !== winner.user.toString()) {
        const memberNotification = new Notification({
          user: member.user,
          title: 'Equb Draw Result',
          message: `${winnerUser.Firstname} ${winnerUser.Lastname} has won round ${roundNumber} of the Equb "${group.name}".`,
          type: 'info',
          relatedTo: 'equb',
          relatedId: group._id
        });

        await memberNotification.save();
      }
    }

    res.status(200).json({
      message: 'Draw performed successfully',
      winner: winnerUser,
      round: round
    });
  } catch (error) {
    console.error('Error in performEqubDraw:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Request Edir benefit
const requestEdirBenefit = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { reason, amount, details } = req.body;

    if (!reason || !amount) {
      return res.status(400).json({ message: 'Reason and amount are required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.type !== 'edir') {
      return res.status(400).json({ message: 'This operation is only valid for Edir groups' });
    }

    // Check if user is a member
    const memberIndex = group.members.findIndex(m => m.user.toString() === req.user._id.toString());
    if (memberIndex === -1) {
      return res.status(403).json({ message: 'You are not a member of this group' });
    }

    // Create a benefit request
    const benefitRequest = {
      user: req.user._id,
      reason,
      amount,
      details,
      status: 'pending',
      requestDate: new Date()
    };

    // Add benefit request to group
    if (!group.benefitRequests) {
      group.benefitRequests = [];
    }

    group.benefitRequests.push(benefitRequest);
    await group.save();

    // Create notification for admin
    const notification = new Notification({
      user: group.admin,
      title: 'New Edir Benefit Request',
      message: `${req.user.Firstname} ${req.user.Lastname} has requested a benefit of ${amount} ETB from the Edir "${group.name}".`,
      type: 'info',
      relatedTo: 'edir',
      relatedId: group._id
    });

    await notification.save();

    res.status(201).json({
      message: 'Benefit request submitted successfully',
      benefitRequest
    });
  } catch (error) {
    console.error('Error in requestEdirBenefit:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Process Edir benefit request (admin only)
const processEdirBenefitRequest = async (req, res) => {
  try {
    const { groupId, requestId } = req.params;
    const { status, note } = req.body;

    if (!status || (status !== 'approved' && status !== 'rejected')) {
      return res.status(400).json({ message: 'Valid status (approved/rejected) is required' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Only admin can process benefit requests
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to process benefit requests' });
    }

    if (group.type !== 'edir') {
      return res.status(400).json({ message: 'This operation is only valid for Edir groups' });
    }

    // Find the benefit request
    if (!group.benefitRequests) {
      return res.status(404).json({ message: 'No benefit requests found' });
    }

    const requestIndex = group.benefitRequests.findIndex(r => r._id.toString() === requestId);
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Benefit request not found' });
    }

    const benefitRequest = group.benefitRequests[requestIndex];

    if (benefitRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Benefit request is not pending' });
    }

    // Update benefit request
    benefitRequest.status = status;
    benefitRequest.processedBy = req.user._id;
    benefitRequest.processedAt = new Date();
    benefitRequest.note = note;

    // If approved, update member's benefits received
    if (status === 'approved') {
      const memberIndex = group.members.findIndex(m => m.user.toString() === benefitRequest.user.toString());
      if (memberIndex !== -1) {
        group.members[memberIndex].benefitsReceived += benefitRequest.amount;
      }
    }

    await group.save();

    // Create notification for requester
    const notification = new Notification({
      user: benefitRequest.user,
      title: `Edir Benefit Request ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: status === 'approved'
        ? `Your benefit request of ${benefitRequest.amount} ETB from the Edir "${group.name}" has been approved.`
        : `Your benefit request of ${benefitRequest.amount} ETB from the Edir "${group.name}" has been rejected. ${note ? `Note: ${note}` : ''}`,
      type: status === 'approved' ? 'success' : 'error',
      relatedTo: 'edir',
      relatedId: group._id
    });

    await notification.save();

    res.status(200).json({
      message: `Benefit request ${status === 'approved' ? 'approved' : 'rejected'} successfully`,
      benefitRequest
    });
  } catch (error) {
    console.error('Error in processEdirBenefitRequest:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get join requests
const getJoinRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get groups where user is admin
    const groups = await Group.find({ admin: userId })
      .populate({
        path: 'joinRequests',
        populate: {
          path: 'user',
          select: 'Firstname Lastname email'
        }
      });

    // Extract and format join requests
    const joinRequests = groups.reduce((acc, group) => {
      const groupRequests = group.joinRequests.map(request => ({
        ...request.toObject(),
        groupName: group.name,
        groupType: group.type
      }));
      return [...acc, ...groupRequests];
    }, []);

    res.status(200).json(joinRequests);
  } catch (error) {
    console.error('Error in getJoinRequests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add sample groups (for development/testing)
const addSampleGroups = async (req, res) => {
  try {
    const adminId = req.user._id;

    // Check if sample groups already exist for this admin
    const existingSamples = await Group.find({
      admin: adminId,
      name: { $in: ['Sample Weekly Equb', 'Sample Monthly Equb'] }
    });

    if (existingSamples.length > 0) {
      return res.status(400).json({ message: 'Sample groups already exist for this user.' });
    }

    const sampleEqubs = [{
      name: 'Sample Weekly Equb',
      type: 'equb',
      description: 'A sample weekly Equb for testing.',
      amount: 500,
      totalRounds: 10,
      startDate: new Date(),
      nextDrawDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      frequency: 'weekly',
      admin: adminId,
      members: [{ user: adminId, joinDate: new Date(), status: 'active' }],
      rounds: Array.from({ length: 10 }, (_, i) => ({
        roundNumber: i + 1,
        status: i === 0 ? 'active' : 'pending',
        contributingMembers: [{ user: adminId, hasPaid: false }]
      }))
    },
    {
      name: 'Sample Monthly Equb',
      type: 'equb',
      description: 'A sample monthly Equb for testing.',
      amount: 2000,
      totalRounds: 5,
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      nextDrawDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
      frequency: 'monthly',
      admin: adminId,
      members: [{ user: adminId, joinDate: new Date(), status: 'active' }],
      rounds: Array.from({ length: 5 }, (_, i) => ({
        roundNumber: i + 1,
        status: i === 0 ? 'active' : 'pending',
        contributingMembers: [{ user: adminId, hasPaid: false }]
      }))
    }];

    await Group.insertMany(sampleEqubs);

    res.status(201).json({ message: 'Sample Equbs added successfully!' });
  } catch (error) {
    console.error('Error in addSampleGroups:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get public groups
const getPublicGroups = async (req, res) => {
  try {
    const groups = await Group.find({ status: 'active', isPublic: true })
      .populate('admin', 'Firstname Lastname email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error in getPublicGroups:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all equbs
const getAllEqubs = async (req, res) => {
  try {
    const equbs = await Group.find({ type: 'equb', status: 'active' })
      .populate('admin', 'Firstname Lastname email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(equbs);
  } catch (error) {
    console.error('Error in getAllEqubs:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all edirs
const getAllEdirs = async (req, res) => {
  try {
    const edirs = await Group.find({ type: 'edir', status: 'active' })
      .populate('admin', 'Firstname Lastname email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(edirs);
  } catch (error) {
    console.error('Error in getAllEdirs:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get equb by ID
const getEqubById = async (req, res) => {
  try {
    const { id } = req.params;
    const equb = await Group.findOne({ _id: id, type: 'equb' })
      .populate('admin', 'Firstname Lastname email')
      .populate('members.user', 'Firstname Lastname email');
    
    if (!equb) {
      return res.status(404).json({ message: 'Equb not found' });
    }
    
    res.status(200).json(equb);
  } catch (error) {
    console.error('Error in getEqubById:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get edir by ID
const getEdirById = async (req, res) => {
  try {
    const { id } = req.params;
    const edir = await Group.findOne({ _id: id, type: 'edir' })
      .populate('admin', 'Firstname Lastname email')
      .populate('members.user', 'Firstname Lastname email');
    
    if (!edir) {
      return res.status(404).json({ message: 'Edir not found' });
    }
    
    res.status(200).json(edir);
  } catch (error) {
    console.error('Error in getEdirById:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update group
const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const updateData = req.body;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Only admin can update group
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update group' });
    }
    
    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'amount', 'frequency', 'rules', 'benefits', 'emergencyContact'];
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        group[key] = updateData[key];
      }
    });
    
    await group.save();
    
    res.status(200).json({ message: 'Group updated successfully', group });
  } catch (error) {
    console.error('Error in updateGroup:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete group
const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    
    // Only admin can delete group
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete group' });
    }
    
    await Group.findByIdAndDelete(groupId);
    
    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error in deleteGroup:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAvailableGroups,
  getUserGroups,
  createGroup,
  joinGroup,
  getGroupDetails,
  updateGroupStatus,
  performEqubDraw,
  requestEdirBenefit,
  processEdirBenefitRequest,
  getJoinRequests,
  addSampleGroups,
  getPublicGroups,
  getAllEqubs,
  getAllEdirs,
  getEqubById,
  getEdirById,
  updateGroup,
  deleteGroup
};
