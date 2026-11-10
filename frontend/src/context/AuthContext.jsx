import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const authCheckStarted = useRef(false);

  const checkAuth = async () => {
    try {
      const data = await api.get('/auth/me');
      setUser(data?.user || null);
    } catch {
      // 401 or network failure on initial load simply means unauthenticated
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const data = await api.post('/auth/register', { name, email, password });
    setUser(data.user);
    return data;
  };

  const verifyEmail = async (token) => {
    const data = await api.post('/auth/verify-email', { token });
    setUser(data.user);
    return data.user;
  };

  const resendVerification = async () => {
    return await api.post('/auth/resend-verification');
  };

  const completeOnboarding = async ({ name, dateOfBirth, phone, country }) => {
    const data = await api.put('/auth/onboarding', {
      name,
      dateOfBirth,
      phone,
      country,
    });
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API error (clearing local session):', err.message);
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    if (authCheckStarted.current) return;
    authCheckStarted.current = true;
    checkAuth();
  }, []);

  const updateUser = (userData) => {
    setUser((prev) => {
      if (!userData) return null;
      return { ...prev, ...userData };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyEmail,
        resendVerification,
        completeOnboarding,
        logout,
        checkAuth,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }

  return context;
}
