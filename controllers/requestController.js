const Request = require('../models/Request');
const Group = require('../models/Group');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create a join request
exports.createJoinRequest = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is already a member
    const isMember = group.members.some(member => 
      member.user.toString() === userId.toString() && member.status === 'active'
    );
    
    if (isMember) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    // Check if there's already a pending request
    const existingRequest = await Request.findOne({
      user: userId,
      group: groupId,
      status: 'pending',
      type: 'join'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request to join this group' });
    }

    // Create new request
    const newRequest = new Request({
      user: userId,
      group: groupId,
      type: 'join',
      status: 'pending'
    });

    await newRequest.save();

    res.status(201).json({ 
      message: 'Join request created successfully',
      request: newRequest
    });
  } catch (error) {
    console.error('Error creating join request:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all requests (admin only)
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('user', 'Firstname Lastname email phone')
      .populate('group', 'name type amount frequency');
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error getting requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get pending requests (admin only)
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await Request.find({ status: 'pending' })
      .populate('user', 'Firstname Lastname email phone')
      .populate('group', 'name type amount frequency');
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's requests
exports.getUserRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const requests = await Request.find({ user: userId })
      .populate('group')
      .sort({ createdAt: -1 });
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error getting user requests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Process a request (admin only)
exports.processRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, note, paymentInstructions } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request has already been processed' });
    }
    
    // Update request
    request.status = status;
    request.processedBy = req.user._id;
    request.processedAt = new Date();
    
    if (note) {
      request.note = note;
    }
    
    if (status === 'approved' && paymentInstructions) {
      request.paymentInstructions = paymentInstructions;
    }
    
    await request.save();
    
    // If approved, add user to group members
    if (status === 'approved') {
      const group = await Group.findById(request.group);
      
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is already a member
      const existingMemberIndex = group.members.findIndex(
        member => member.user.toString() === request.user.toString()
      );
      
      if (existingMemberIndex >= 0) {
        // Update existing member status
        group.members[existingMemberIndex].status = 'active';
      } else {
        // Add new member
        group.members.push({
          user: request.user,
          joinDate: new Date(),
          status: 'active'
        });
      }
      
      await group.save();
    }
    
    res.status(200).json({ 
      message: `Request ${status}`,
      request
    });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 
