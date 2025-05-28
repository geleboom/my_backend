const express = require('express');
const router = express.Router();
const equbSpinController = require('../controllers/equbSpinController');
const auth = require('../middleware/auth');

// Get all upcoming spins
router.get('/upcoming', auth, equbSpinController.getUpcomingSpins);

// Get current spin
router.get('/current', auth, equbSpinController.getCurrentSpin);

// Start a spin
router.post('/:spinId/start', auth, equbSpinController.startSpin);

// Create a new spin
router.post('/', auth, equbSpinController.createSpin);

module.exports = router; 
const router = express.Router();
const equbSpinController = require('../controllers/equbSpinController');
const auth = require('../middleware/auth');

// Get all upcoming spins
router.get('/upcoming', auth, equbSpinController.getUpcomingSpins);

// Get current spin
router.get('/current', auth, equbSpinController.getCurrentSpin);

// Start a spin
router.post('/:spinId/start', auth, equbSpinController.startSpin);

// Create a new spin
router.post('/', auth, equbSpinController.createSpin);

module.exports = router; 