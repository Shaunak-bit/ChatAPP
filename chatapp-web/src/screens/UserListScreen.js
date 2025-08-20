import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userAPI, conversationAPI } from '../services/api';
import socket from '../services/socket';

const UserListScreen = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const response = await userAPI.getUsers();
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // Refresh users periodically
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for socket events to update user status
  useEffect(() => {
    const handleUserOnline = (data) => {
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u._id === data.userId ? { ...u, isOnline: true } : u
        )
      );
    };

    const handleUserOffline = (data) => {
      setUsers(prevUsers => 
        prevUsers.map(u => 
          u._id === data.userId ? { ...u, isOnline: false, lastSeen: data.lastSeen } : u
        )
      );
    };

    // Add event listeners
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);
    
    // Listen for new user registrations
    const handleUserRegistered = () => {
      // Refresh the user list when a new user registers
      fetchUsers();
    };
    
    socket.on('user:registered', handleUserRegistered);

    // Cleanup event listeners
    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
      socket.off('user:registered', handleUserRegistered);
    };
  }, []);

  const handleUserClick = async (selectedUser) => {
    try {
      const response = await conversationAPI.createConversation(selectedUser._id);
      const conversation = response.data;
      navigate(`/chat/${conversation._id}`, { state: { participant: selectedUser } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create conversation');
    }
  };

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-list-container">
      <div className="user-list-header">
        <h1>Chat App</h1>
        {user && <p>Hello, {user.username}</p>}
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
      
      <div className="user-list-content">
        {error && (
          <div className="error-message" style={{ textAlign: 'center', margin: '20px 0' }}>
            {error}
          </div>
        )}
        
        {users.map((user) => (
          <div 
            key={user._id} 
            className="user-item"
            onClick={() => handleUserClick(user)}
          >
            <div className="user-avatar">
              <span className="avatar-text">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="user-info">
              <h3 className="username">{user.username}</h3>
              <p className="user-email">{user.email}</p>
            </div>
            <div className="status-indicator">
              <div className={`status-dot ${user.isOnline ? 'online' : 'offline'}`}></div>
              <span className="status-text">
                {user.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserListScreen;