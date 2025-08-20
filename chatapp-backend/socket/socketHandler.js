const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

// Store io instance to use in other files
let ioInstance = null;

const socketHandler = (io) => {
  ioInstance = io;
  
  // Export function to get io instance
  module.exports.getIO = () => ioInstance;
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Update user online status
    User.findByIdAndUpdate(socket.userId, { isOnline: true })
      .then(() => {
        // Notify all users that this user is now online
        socket.broadcast.emit('user:online', { userId: socket.userId });
      })
      .catch(console.error);

    // Join user to their own room
    socket.join(socket.userId);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      })
      .then((user) => {
        // Notify all users that this user is now offline
        socket.broadcast.emit('user:offline', {
          userId: socket.userId,
          lastSeen: user.lastSeen
        });
      })
      .catch(console.error);
    });

    // Handle joining conversation room
    socket.on('join-conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.userId} joined conversation ${conversationId}`);
    });

    // Handle leaving conversation room
    socket.on('leave-conversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle sending messages
    socket.on('message:send', async (data) => {
      try {
        const { conversationId, text } = data;

        // Verify user is part of the conversation
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.includes(socket.userId)) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        // Create message
        const message = new Message({
          conversationId,
          sender: socket.userId,
          text
        });

        await message.save();

        // Update conversation last message
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Populate sender info
        await message.populate('sender', 'username avatar');

        // Emit to all users in the conversation
        io.to(conversationId).emit('message:new', message);

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit('typing:start', {
        userId: socket.userId,
        conversationId
      });
    });

    socket.on('typing:stop', (data) => {
      const { conversationId } = data;
      socket.to(conversationId).emit('typing:stop', {
        userId: socket.userId,
        conversationId
      });
    });

    // Handle message read receipts
    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;
        
        const message = await Message.findById(messageId);
        if (!message) return;

        // Verify user is recipient
        const conversation = await Conversation.findById(message.conversationId);
        if (!conversation || !conversation.participants.includes(socket.userId)) return;

        // Update message as read
        message.isRead = true;
        message.readAt = new Date();
        await message.save();

        // Emit read receipt to sender
        io.to(message.sender.toString()).emit('message:read', {
          messageId,
          readAt: message.readAt
        });

      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });
  });
};

module.exports = socketHandler;
