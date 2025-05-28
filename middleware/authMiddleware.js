// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password'); // remove password

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Optional: check if user is active
    if (user.isActive === false) {
      return res.status(403).json({ message: 'User account is deactivated' });
    }

    // ✅ Pass the user to next route
    req.user = {
      userId: decoded.userId,
      ...user.toObject()
    };
    next();
  } catch (error) {
    console.error('Error in authMiddleware:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
