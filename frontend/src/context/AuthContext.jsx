import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('pw_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(() => {
    // Start as false if we already have a user in localStorage (avoids flash)
    const saved = localStorage.getItem('pw_user');
    const token = localStorage.getItem('pw_access_token');
    return !(saved && token); // Only show loading if no cached session
  });

  // Synchronize auth state on load
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('pw_access_token');
      if (token) {
        try {
          const res = await apiFetch('/auth/me');
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('pw_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.warn('Initial session restore failed:', err.message);
          // If token invalid, clear
          if (err.status === 401) {
            localStorage.removeItem('pw_access_token');
            localStorage.removeItem('pw_refresh_token');
            localStorage.removeItem('pw_user');
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleLogoutEvent = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogoutEvent);
    return () => window.removeEventListener('auth:logout', handleLogoutEvent);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.success && res.data) {
      const { user: loggedInUser, accessToken, refreshToken } = res.data;
      localStorage.setItem('pw_access_token', accessToken);
      localStorage.setItem('pw_refresh_token', refreshToken);
      localStorage.setItem('pw_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      return loggedInUser;
    }
  }, []);

  const register = useCallback(async (name, email, password, role = 'user') => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });

    if (res.success && res.data) {
      const { user: registeredUser, accessToken, refreshToken } = res.data;
      localStorage.setItem('pw_access_token', accessToken);
      localStorage.setItem('pw_refresh_token', refreshToken);
      localStorage.setItem('pw_user', JSON.stringify(registeredUser));
      setUser(registeredUser);
      return registeredUser;
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('pw_refresh_token');
    try {
      if (refreshToken) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('pw_access_token');
      localStorage.removeItem('pw_refresh_token');
      localStorage.removeItem('pw_user');
      setUser(null);
    }
  }, []);

  const value = {
    user,
    role: user?.role || null,
    isAdmin: user?.role === 'admin',
    isReadOnly: user?.role === 'read-only',
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
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
