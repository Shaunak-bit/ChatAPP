const express = require('express');
const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
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

// Get all conversations for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.userId })
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get or create conversation between two users
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { participantId } = req.body;

    if (participantId === req.userId) {
      return res.status(400).json({ message: 'Cannot create conversation with yourself' });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, participantId] }
    });

    if (conversation) {
      return res.json(conversation);
    }

    // Create new conversation
    conversation = new Conversation({
      participants: [req.userId, participantId]
    });

    await conversation.save();
    
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username avatar isOnline lastSeen');
    
    res.status(201).json(populatedConversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get conversation by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const conversation = await Conversation.findById(id)
      .populate('participants', 'username avatar isOnline lastSeen');
    
    if (!conversation || !conversation.participants.includes(req.userId)) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
