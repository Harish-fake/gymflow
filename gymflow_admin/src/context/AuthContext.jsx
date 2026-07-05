import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('gymflow_token');
    const cachedProfile = localStorage.getItem('cached_profile');

    if (cachedProfile && !token) {
      try {
        setUser(JSON.parse(cachedProfile));
      } catch (_) {}
    }

    if (token) {
      if (cachedProfile) {
        try {
          const cached = JSON.parse(cachedProfile);
          setUser(cached);
        } catch (_) {}
      }
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  async function loadUser() {
    try {
      const data = await api.getProfile();
      setUser(data.user);
      localStorage.setItem('cached_profile', JSON.stringify(data.user));
    } catch {
      localStorage.removeItem('gymflow_token');
      localStorage.removeItem('cached_profile');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const data = await api.login(email, password);
    localStorage.setItem('gymflow_token', data.token);
    if (data.refresh_token) {
      localStorage.setItem('gymflow_refresh', data.refresh_token);
    }
    setUser(data.user);
    localStorage.setItem('cached_profile', JSON.stringify(data.user));
    return data;
  }

  function logout() {
    localStorage.removeItem('gymflow_token');
    localStorage.removeItem('gymflow_refresh');
    localStorage.removeItem('cached_profile');
    setUser(null);
    window.location.href = '/login';
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
