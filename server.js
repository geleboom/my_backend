const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes');
const groupRoutes = require('./routes/groupRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/user');
const walletRoutes = require('./routes/walletRoutes');




// Load environment variables from .env file
dotenv.config();

// Debug: Print the MongoDB URI (remove sensitive info in production)
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');

// MongoDB connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  maxPoolSize: 10,
  minPoolSize: 5,
  retryWrites: true,
  retryReads: true,
  connectTimeoutMS: 30000,
  heartbeatFrequencyMS: 10000,
  autoIndex: true,
};

// Function to connect to MongoDB with retry logic
const connectWithRetry = async (retryCount = 0) => {
  const maxRetries = 5;
  const baseDelay = 5000; // 5 seconds

  try {
    await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
    console.log('Connected to MongoDB successfully');
    retryCount = 0; // Reset retry count on successful connection
  } catch (err) {
    console.error('MongoDB connection error:', err);
    
    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Attempt ${retryCount + 1}/${maxRetries}: Retrying MongoDB connection in ${delay/1000} seconds...`);
      setTimeout(() => connectWithRetry(retryCount + 1), delay);
    } else {
      console.error('Max retry attempts reached. Please check your MongoDB connection settings.');
      process.exit(1); // Exit if we can't connect after max retries
    }
  }
};

// Initial connection attempt
connectWithRetry();

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  connectWithRetry();
});

const app = express();
app.use(cors());
app.use(express.json()); // To parse JSON request bodies

// Health check routes
app.use('/api', require('./routes/healthRoutes'));

// Middleware for routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start the server on all network interfaces
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server accessible at http://localhost:${PORT}`);
});

