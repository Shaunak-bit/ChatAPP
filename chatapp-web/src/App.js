import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import UserListScreen from './screens/UserListScreen';
import ChatScreen from './screens/ChatScreen';
import socket from './services/socket';
import { userAPI } from './services/api';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('token');
      if (token) {
        try {
          const response = await userAPI.getCurrentUser();
          setUser(response.data);
          
          // Connect socket
          await socket.connect(token);
        } catch (error) {
          console.error('Failed to get user data:', error);
          sessionStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = async (userData, token) => {
    setUser(userData);
    sessionStorage.setItem('token', token);
    await socket.connect(token);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('token');
    socket.disconnect();
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to="/users" /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/login" 
            element={user ? <Navigate to="/users" /> : <LoginScreen onLogin={handleLogin} />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/users" /> : <RegisterScreen onLogin={handleLogin} />} 
          />
          <Route 
            path="/users" 
            element={user ? <UserListScreen user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/chat/:conversationId" 
            element={user ? <ChatScreen user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;