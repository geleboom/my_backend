const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Equb = require('../models/Equb');
const Request=require('../models/Request');
const jwt = require('jsonwebtoken');

// Get all users
// Get all users (restricted by role)
const getAllUsers = async (req, res) => {
  try {
    const requester = req.user; // comes from auth middleware
    let users;

    if (requester.role === 'superadmin') {
      // Return all users including admins
      users = await User.find({}, '-password');
    } else {
      // Return only users (exclude admins & superadmins)
      users = await User.find({ role: 'user' }, '-password');
    }

    res.status(200).json(users);
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Create admin user
const createAdmin = async (req, res) => {
  const { Firstname, Lastname, email, password, phone, address, occupation, emergencyContact } = req.body;

  if (!Firstname || !Lastname || !email || !password || !phone || !address || !occupation || !emergencyContact) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin user
    const newAdmin = new User({
      Firstname,
      Lastname,
      email,
      password: hashedPassword,
      phone,
      address,
      occupation,
      emergencyContact,
      role: 'admin'
    });

    await newAdmin.save();
    res.status(201).json({ message: 'Admin created successfully' });
  } catch (error) {
    console.error('Error in createAdmin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user status
const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = isActive;
    await user.save();

    res.status(200).json({ message: 'User status updated successfully' });
  } catch (error) {
    console.error('Error in updateUserStatus:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['user', 'admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.status(200).json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeEqub = await mongoose.model('Equb').countDocuments({ status: 'active' });
    const pendingRequests = await mongoose.model('Request').countDocuments({ status: 'pending' });

    res.status(200).json({
      totalUsers,
      activeEqub,
      pendingRequests
    });
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin login
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find admin user by email and role
    const admin = await User.findOne({ 
      email, 
      role: { $in: ['admin', 'superadmin'] } 
    });
    
    if (!admin) {
      return res.status(400).json({ message: 'Invalid credentials or not an admin' });
    }

    // Compare password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const payload = {
      userId: admin._id,
      email: admin.email,
      role: admin.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { password: _, ...safeAdmin } = admin.toObject();

    res.status(200).json({
      message: 'Login successful',
      token,
      user: safeAdmin,
    });

  } catch (error) {
    console.error('Error in loginAdmin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllUsers,
  createAdmin,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getDashboardStats,
  loginAdmin
};
