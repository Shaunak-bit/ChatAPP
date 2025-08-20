const express = require('express');
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

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

// Get messages for a conversation
router.get('/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark messages as read
router.put('/read/:messageId', authMiddleware, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is recipient
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || !conversation.participants.includes(req.userId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();
    
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
