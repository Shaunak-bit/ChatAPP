import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (username, email, password) => 
    api.post('/auth/register', { username, email, password }),
  
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
};

// User API
export const userAPI = {
  getCurrentUser: () => api.get('/users/me'),
  getUsers: () => api.get('/users'),
  updateUserStatus: (isOnline) => api.put('/users/status', { isOnline }),
};

// Conversation API
export const conversationAPI = {
  getConversations: () => api.get('/conversations'),
  createConversation: (participantId) => api.post('/conversations', { participantId }),
  getConversationById: (id) => api.get(`/conversations/${id}`),
};

// Message API
export const messageAPI = {
  getMessages: (conversationId) => api.get(`/messages/conversation/${conversationId}`),
  markMessageAsRead: (messageId) => api.put(`/messages/read/${messageId}`),
};

export default api;