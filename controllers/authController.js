const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register user
const registerUser = async (req, res) => {
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
    
    // Check if phone number already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      Firstname,
      Lastname,
      email,
      password: hashedPassword,
      phone,
      address,
      occupation,
      emergencyContact
    });

    await newUser.save();
    
    console.log(`User registered successfully: ${email}`);
    res.status(201).json({ message: 'User registered successfully' ,
      user: newUser
    });
    
  } catch (error) {
    console.error('Error in registerUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Compare password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const payload = {
      userId: user._id,
      email: user.email,
    };

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
const { password: _, ...safeUser } = user.toObject();

res.status(200).json({
  message: 'Login successful',
  token,
  user: safeUser,

});

  } catch (error) {
    console.error('Error in loginUser:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerUser, loginUser };
