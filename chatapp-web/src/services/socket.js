import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket && this.socket.connected) {
      // If already connected with same token, resolve immediately
      if (this.socket.auth.token === token) {
        return Promise.resolve();
      }
      // If connected with different token, disconnect first
      this.disconnect();
    }

    return new Promise((resolve, reject) => {
      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
        console.log('Socket connected');
        this.emit('socket:connected');
        resolve();
      });

      this.socket.on('disconnect', () => {
        console.log('Socket disconnected');
        this.emit('socket:disconnected');
      });

      // Handle incoming messages
      this.socket.on('message:new', (message) => {
        this.emit('message:new', message);
      });

      // Handle typing indicators
      this.socket.on('typing:start', (data) => {
        this.emit('typing:start', data);
      });

      this.socket.on('typing:stop', (data) => {
        this.emit('typing:stop', data);
      });

      // Handle read receipts
      this.socket.on('message:read', (data) => {
        this.emit('message:read', data);
      });

      // Handle errors
      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
        this.emit('socket:error', error);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Message events
  sendMessage(conversationId, text) {
    if (!this.socket) return;
    this.socket.emit('message:send', { conversationId, text });
  }

  // Typing events
  startTyping(conversationId) {
    if (!this.socket) return;
    this.socket.emit('typing:start', { conversationId });
  }

  stopTyping(conversationId) {
    if (!this.socket) return;
    this.socket.emit('typing:stop', { conversationId });
  }

  // Read receipts
  markMessageAsRead(messageId) {
    if (!this.socket) return;
    this.socket.emit('message:read', { messageId });
  }

  // Conversation events
  joinConversation(conversationId) {
    if (!this.socket) return;
    this.socket.emit('join-conversation', conversationId);
  }

  leaveConversation(conversationId) {
    if (!this.socket) return;
    this.socket.emit('leave-conversation', conversationId);
  }

  // Event handling
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

const socketService = new SocketService();
export default socketService;