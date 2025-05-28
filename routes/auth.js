// routes/auth.js
const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');

// Register route
router.post('/register', registerUser);

// Login route
router.post('/login', loginUser);

// Forgot password route
router.post('/forgot-password', (req, res) => {
  // Implement forgot password logic
  res.status(200).json({ message: 'Forgot password route' });
});

module.exports = router;
