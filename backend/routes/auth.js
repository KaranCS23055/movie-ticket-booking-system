const express = require('express');
const router = express.Router();
const { findUserByEmail } = require('../db');
const { generateToken, authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/login
 * @desc    Authenticate user & return demo session token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const user = await findUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Please verify your email and password.'
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing login.'
    });
  }
});

/**
 * @route   GET /api/me
 * @desc    Get currently logged in user info
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user
  });
});

module.exports = router;
