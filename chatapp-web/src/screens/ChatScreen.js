import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import socket from '../services/socket';
import { messageAPI } from '../services/api';

const ChatScreen = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { conversationId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  const participant = state?.participant;

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await messageAPI.getMessages(conversationId);
      // Ensure all messages have required properties
      const messagesWithDefaults = response.data.map(message => ({
        ...message,
        isRead: message.isRead || false
      }));
      setMessages(messagesWithDefaults);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    socket.sendMessage(conversationId, newMessage.trim());
    setNewMessage('');
    socket.stopTyping(conversationId);
  };

  // Handle typing
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (e.target.value) {
      socket.startTyping(conversationId);
    } else {
      socket.stopTyping(conversationId);
    }
  };

  // Mark message as read
  const markAsRead = (messageId) => {
    socket.markMessageAsRead(messageId);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
  };

  useEffect(() => {
    if (!participant) {
      navigate('/users');
      return;
    }

    // Join conversation room
    socket.joinConversation(conversationId);
    
    // Fetch initial messages
    fetchMessages();
    
    // Listen for new messages
    const handleMessageNew = (message) => {
      // Ensure new message has required properties
      const messageWithDefaults = {
        ...message,
        isRead: message.isRead || false
      };
      setMessages(prevMessages => [...prevMessages, messageWithDefaults]);
      
      // Mark message as read if it's not from current user
      if (messageWithDefaults.sender._id !== user._id) {
        markAsRead(messageWithDefaults._id);
      }
    };
    
    // Listen for typing events
    const handleTypingStart = (data) => {
      if (data.userId !== user._id && data.conversationId === conversationId) {
        setTypingUsers(prev => [...prev, data.userId]);
      }
    };
    
    const handleTypingStop = (data) => {
      if (data.userId !== user._id && data.conversationId === conversationId) {
        setTypingUsers(prev => prev.filter(id => id !== data.userId));
      }
    };
    
    // Listen for read receipts
    const handleMessageRead = (data) => {
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg._id === data.messageId ? { ...msg, isRead: true, readAt: data.readAt } : msg
        )
      );
    };
    
    socket.on('message:new', handleMessageNew);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('message:read', handleMessageRead);
    
    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('message:read', handleMessageRead);
      
      // Leave conversation room
      socket.leaveConversation(conversationId);
    };
  }, [conversationId, participant, user._id, fetchMessages, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  if (!participant) {
    return <div className="loading">Loading chat...</div>;
  }

  if (loading) {
    return <div className="loading">Loading messages...</div>;
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="participant-info">
          <div className="participant-avatar">
            <span className="participant-avatar-text">
              {participant.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="participant-name">{participant.username}</h3>
            <p className="participant-status">
              {participant.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
      
      <div className="messages-container">
        {error && (
          <div className="error-message" style={{ textAlign: 'center', margin: '20px 0' }}>
            {error}
          </div>
        )}
        
        {messages.map((message) => {
          const isOwnMessage = message.sender._id === user._id;
          const timestamp = new Date(message.createdAt).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          
          return (
            <div 
              key={message._id} 
              className={`message-container ${isOwnMessage ? 'own' : 'other'}`}
            >
              <div className={`message-bubble ${isOwnMessage ? 'own' : 'other'}`}>
                <p className={`message-text ${isOwnMessage ? 'own' : 'other'}`}>
                  {message.text}
                </p>
                <div className={`message-info ${isOwnMessage ? 'own' : 'other'}`}>
                  <span className={`message-time ${isOwnMessage ? 'own' : 'other'}`}>
                    {timestamp}
                  </span>
                  {isOwnMessage ? (
                    <span className={`read-receipt ${message.isRead ? 'read' : 'sent'}`}>
                      {(message.isRead !== undefined ? message.isRead : false) ? '✓✓' : '✓'}
                    </span>
                  ) : (
                    <span className="read-receipt received">✓</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {typingUsers.length > 0 && (
          <div className="typing-container">
            <div className="typing-bubble">
              <p className="typing-text">
                {participant.username} is typing...
              </p>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <form onSubmit={handleSubmit} style={{ display: 'flex', width: '100%' }}>
          <textarea
            className="text-input"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            rows="1"
          />
          <button
            type="submit"
            className="send-button"
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatScreen;