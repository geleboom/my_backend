// routes/user.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    // The user is already fetched in the middleware
    // Just return it directly
    const userObj = req.user;
    
    // Remove sensitive fields if they exist
    if (userObj.password) delete userObj.password;
    
    res.status(200).json(userObj);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update FCM token
router.post('/update-fcm-token', authMiddleware, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    
    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    // Update the user's FCM token
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { fcmToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'FCM token updated successfully' });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
