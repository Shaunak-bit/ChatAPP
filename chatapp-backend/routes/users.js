const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Get all users (excluding current user)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.userId } })
      .select('-password')
      .sort({ username: 1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user online status
router.put('/status', authMiddleware, async (req, res) => {
  try {
    const { isOnline } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { 
        isOnline,
        lastSeen: new Date()
      },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
