const Notification = require('../models/Notification');
const User = require('../models/User');
const admin = require('firebase-admin');

// Get user's notifications
const getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error in markAllAsRead:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a notification
const createNotification = async (userId, title, message, type, relatedTo, relatedId) => {
  try {
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      relatedTo,
      relatedId
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    throw error;
  }
};

// Function to send a push notification via FCM
const sendPushNotification = async (userId, title, body, data) => {
  try {
    // Fetch the user's FCM token from the database
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }

    const fcmToken = user.fcmToken;
    if (!fcmToken) {
      console.log(`No FCM token found for user ${userId}`);
      return;
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data || {}, // Optional data payload
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    
    // Create a notification record in the database
    await createNotification(userId, title, body, data?.type || 'general');
    
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Function to send a group notification
const sendGroupNotification = async (groupId, title, body, data) => {
  try {
    // Fetch all users in the group
    const users = await User.find({ 'groups': groupId });
    if (!users.length) {
      throw new Error(`No users found in group: ${groupId}`);
    }

    const tokens = users.map(user => user.fcmToken).filter(token => token);
    if (!tokens.length) {
      console.log(`No FCM tokens found for users in group ${groupId}`);
      return;
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: data || {},
      tokens: tokens, // Send to multiple tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('Successfully sent group message:', response);

    // Create notification records for each user
    const notificationPromises = users.map(user => 
      createNotification(user._id, title, body, data?.type || 'group', 'group', groupId)
    );
    await Promise.all(notificationPromises);

    return response;
  } catch (error) {
    console.error('Error sending group message:', error);
    throw error;
  }
};

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  sendPushNotification,
  sendGroupNotification
};