const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  sendPushNotification,
  sendGroupNotification
} = require('../controllers/notificationController');

// Get user's notifications
router.get('/', protect, getUserNotifications);

// Mark notification as read
router.put('/:notificationId/read', protect, markAsRead);

// Mark all notifications as read
router.put('/read-all', protect, markAllAsRead);

// POST /api/notifications/send - Send a push notification
router.post('/send', protect, async (req, res) => {
  const { userId, title, body, type, data } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ 
      message: 'Missing required fields: userId, title, body' 
    });
  }

  try {
    await sendPushNotification(userId, title, body, { type, ...data });
    res.status(200).json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to send notification' 
    });
  }
});

// POST /api/notifications/send-group - Send a group notification
router.post('/send-group', protect, async (req, res) => {
  const { groupId, title, body, type, data } = req.body;

  if (!groupId || !title || !body) {
    return res.status(400).json({ 
      message: 'Missing required fields: groupId, title, body' 
    });
  }

  try {
    await sendGroupNotification(groupId, title, body, { type, ...data });
    res.status(200).json({ message: 'Group notification sent successfully' });
  } catch (error) {
    console.error('Error sending group notification:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to send group notification' 
    });
  }
});

module.exports = router; 